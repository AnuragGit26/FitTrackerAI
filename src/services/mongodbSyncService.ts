import { getSupabaseClientWithAuth } from './supabaseClient';
import { userScopedQuery } from './supabaseQueryBuilder';
import { requireUserId } from '@/utils/userIdValidation';
import { syncMetadataService } from './syncMetadataService';
import { dbHelpers } from './database';
import { dataService } from './dataService';
import {
    SyncOptions,
    SyncResult,
    SyncableTable,
    SyncDirection,
    SyncError,
    SyncProgress,
    SyncStatus,
} from '@/types/sync';
import { Workout } from '@/types/workout';
import { Exercise } from '@/types/exercise';
import { WorkoutTemplate, PlannedWorkout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import type { Notification } from '@/types/notification';
import type { SleepLog, RecoveryLog } from '@/types/sleep';
import type { ErrorLog } from '@/types/error';
import { versionManager } from './versionManager';
import { errorRecovery } from './errorRecovery';
import { userContextManager } from './userContextManager';
import { db } from './database';
import { sleepRecoveryService } from './sleepRecoveryService';
import { errorLogService } from './errorLogService';
import { logger } from '@/utils/logger';

/**
 * Convert a timestamp (number) to a local Date object
 * Preserves the local time representation
 * FIX: Validate timestamp range to detect seconds vs milliseconds
 */
function timestampToLocalDate(timestamp: number | Date | string | null | undefined): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        // Validate the date is valid
        if (isNaN(date.getTime())) {
            logger.warn(`[timestampToLocalDate] Invalid date string: ${timestamp}`);
            return null;
        }
        return date;
    }

    // FIX: For numeric timestamps, detect if it's in seconds or milliseconds
    // Timestamps before year 2000 in milliseconds: < 946684800000
    // If timestamp is too small, it's likely in seconds (unix timestamp)
    if (typeof timestamp === 'number') {
        // If timestamp is less than year 2001 in milliseconds, assume it's in seconds
        const MIN_TIMESTAMP_MS = 946684800000; // Jan 1, 2000 in milliseconds

        if (timestamp < MIN_TIMESTAMP_MS && timestamp > 0) {
            // Likely in seconds, convert to milliseconds
            timestamp = timestamp * 1000;
        }

        const date = new Date(timestamp);
        // Validate the date is reasonable (between 2000 and 2100)
        const year = date.getFullYear();
        if (year < 2000 || year > 2100) {
            logger.warn(`[timestampToLocalDate] Date out of reasonable range (${year}): ${timestamp}`);
            return null;
        }

        return date;
    }

    return null;
}

type UserProfile = {
    id: string;
    name: string;
    [key: string]: unknown;
};

const BATCH_SIZE = 100;

type ProgressCallback = (progress: SyncProgress) => void;

class MongoDBSyncService {
    private isSyncing = false;
    private isConfigInvalid = false;
    private syncQueue: Promise<SyncResult[]> = Promise.resolve([]);
    private currentProgress: SyncProgress | null = null;
    private progressCallback: ProgressCallback | null = null;
    // Track records that need to be pushed after pull conflicts (local-first strategy)
    private recordsToPushAfterConflict: Map<string, Set<string | number>> = new Map();

    getIsSyncing(): boolean {
        return this.isSyncing;
    }

    getIsConfigInvalid(): boolean {
        return this.isConfigInvalid;
    }

    getCurrentProgress(): SyncProgress | null {
        return this.currentProgress;
    }

    setProgressCallback(callback: ProgressCallback | null): void {
        this.progressCallback = callback;
    }

    private updateProgress(progress: Partial<SyncProgress>): void {
        if (this.currentProgress) {
            this.currentProgress = { ...this.currentProgress, ...progress };
            if (this.progressCallback) {
                this.progressCallback(this.currentProgress);
            }
        }
    }

    async sync(
        userId: string,
        options: SyncOptions = {}
    ): Promise<SyncResult[]> {
        logger.log('[MongoDBSyncService.sync] Starting sync for userId:', userId, 'options:', options);
        this.syncQueue = this.syncQueue
            .then(async () => {
                logger.log('[MongoDBSyncService.sync] Executing performSync...');
                const results = await this.performSync(userId, options);
                
                // Trigger webhook AFTER sync completes to ensure data is in Supabase
                // Only trigger if direction includes push (data was written to Supabase)
                const direction = options.direction || 'bidirectional';
                if (direction === 'push' || direction === 'bidirectional') {
                    try {
                        const { triggerSyncWebhook } = await import('./supabaseSyncWebhook');
                        triggerSyncWebhook(userId, {
                            tables: options.tables,
                            direction: options.direction,
                        });
                        logger.log('[MongoDBSyncService.sync] Webhook triggered after successful sync');
                    } catch (error) {
                        // Log but don't block - webhook failure doesn't affect sync success
                        logger.warn('[MongoDBSyncService.sync] Failed to trigger webhook after sync:', error);
                    }
                }
                
                return results;
            })
            .catch((error) => {
                logger.error('[MongoDBSyncService.sync] Sync failed:', error);
                this.isSyncing = false;
                this.currentProgress = null;
                
                throw error;
            });
        return this.syncQueue;
    }

    private async performSync(
        userId: string,
        options: SyncOptions = {}
    ): Promise<SyncResult[]> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'performSync',
            additionalInfo: { direction: options.direction || 'bidirectional' },
        });
        if (this.isSyncing) {
            throw new Error('Sync is already in progress');
        }

        this.isSyncing = true;
        const results: SyncResult[] = [];
        const direction = options.direction || 'bidirectional';
        const tables = options.tables || [
            'workouts',
            'exercises',
            'workout_templates',
            'planned_workouts',
            'muscle_statuses',
            'user_profiles',
            'settings',
            'notifications',
            'sleep_logs',
            'recovery_logs',
            'error_logs',
        ];

        this.currentProgress = {
            currentTable: null,
            totalTables: tables.length,
            completedTables: 0,
            currentOperation: 'Initializing sync...',
            recordsProcessed: 0,
            totalRecords: 0,
            percentage: 0,
        };

        try {
            logger.log('[MongoDBSyncService.performSync] Using Prisma Client, setting userId...');
            userContextManager.setUserId(validatedUserId);

            // Filter independent tables (exclude user_profiles, settings, notifications, and error_logs)
            // error_logs are synced separately at the end
            const independentTables = tables.filter(t => 
                !['user_profiles', 'settings', 'notifications', 'error_logs'].includes(t)
            );
            const dependentTables = tables.filter(t => 
                ['user_profiles', 'settings'].includes(t)
            );
            const pullOnlyTables = tables.filter(t => 
                t === 'notifications'
            );

            logger.log('[MongoDBSyncService.performSync] Syncing independent tables:', independentTables);
            // Use Promise.allSettled instead of Promise.all to prevent one failure from stopping others
            const independentPromises = independentTables.map(async (table) => {
                logger.log(`[MongoDBSyncService.performSync] Syncing table: ${table}`);
                try {
                    const result = await this.syncTable(validatedUserId, table, direction, options);
                    this.updateProgress({
                        completedTables: results.length + 1,
                        percentage: Math.round(((results.length + 1) / tables.length) * 100),
                    });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    logger.error(`[MongoDBSyncService.performSync] Error syncing table ${table}:`, errorMessage);
                    const errorResult: SyncResult = {
                        tableName: table,
                        direction,
                        status: 'error',
                        recordsProcessed: 0,
                        recordsCreated: 0,
                        recordsUpdated: 0,
                        recordsDeleted: 0,
                        conflicts: 0,
                        errors: [{
                            tableName: table,
                            recordId: 'all',
                            error: errorMessage,
                            timestamp: new Date(),
                            operation: 'read',
                        }],
                        duration: 0,
                    };
                    errorLogService.logSyncError(
                        validatedUserId,
                        table,
                        'all',
                        error instanceof Error ? error : new Error(errorMessage),
                        'read',
                        { direction }
                    ).catch((logError) => {
                        logger.error('Failed to log sync error:', logError);
                    });
                    return errorResult;
                }
            });
            const independentResults = await Promise.all(independentPromises);
            results.push(...independentResults);
            logger.log('[MongoDBSyncService.performSync] Independent tables synced, results:', independentResults);

            for (const table of dependentTables) {
                this.updateProgress({
                    currentTable: table,
                    currentOperation: `Syncing ${table}...`,
                });

                try {
                    const result = await this.syncTable(validatedUserId, table, direction, options);
                    results.push(result);
                    this.updateProgress({
                        completedTables: results.length,
                        percentage: Math.round((results.length / tables.length) * 100),
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const errorResult: SyncResult = {
                        tableName: table,
                        direction,
                        status: 'error',
                        recordsProcessed: 0,
                        recordsCreated: 0,
                        recordsUpdated: 0,
                        recordsDeleted: 0,
                        conflicts: 0,
                        errors: [
                            {
                                tableName: table,
                                recordId: 'all',
                                error: errorMessage,
                                timestamp: new Date(),
                                operation: 'read',
                            },
                        ],
                        duration: 0,
                    };
                    results.push(errorResult);
                    
                    errorLogService.logSyncError(
                        validatedUserId,
                        table,
                        'all',
                        error instanceof Error ? error : new Error(errorMessage),
                        'read',
                        { direction }
                    ).catch((logError) => {
                        logger.error('Failed to log sync error:', logError);
                    });
                }
            }

            for (const table of pullOnlyTables) {
                this.updateProgress({
                    currentTable: table,
                    currentOperation: `Pulling ${table}...`,
                });

                try {
                    const result = await this.syncTable(validatedUserId, table, 'pull', options);
                    results.push(result);
                    this.updateProgress({
                        completedTables: results.length,
                        percentage: Math.round((results.length / tables.length) * 100),
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const errorResult: SyncResult = {
                        tableName: table,
                        direction: 'pull',
                        status: 'error',
                        recordsProcessed: 0,
                        recordsCreated: 0,
                        recordsUpdated: 0,
                        recordsDeleted: 0,
                        conflicts: 0,
                        errors: [
                            {
                                tableName: table,
                                recordId: 'all',
                                error: errorMessage,
                                timestamp: new Date(),
                                operation: 'read',
                            },
                        ],
                        duration: 0,
                    };
                    results.push(errorResult);
                    
                    errorLogService.logSyncError(
                        validatedUserId,
                        table,
                        'all',
                        error instanceof Error ? error : new Error(errorMessage),
                        'read',
                        { direction: 'pull' }
                    ).catch((logError) => {
                        logger.error('Failed to log sync error:', logError);
                    });
                }
            }

            const hasErrors = results.some(result => result.errors && result.errors.length > 0);
            if (hasErrors) {
                try {
                    await errorLogService.logError({
                        userId: validatedUserId,
                        errorType: 'sync_error',
                        errorMessage: 'Some sync errors occurred',
                        operation: 'sync',
                        severity: 'error',
                        context: {
                            totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
                            tablesWithErrors: results
                                .filter(r => r.errors && r.errors.length > 0)
                                .map(r => ({
                                    table: r.tableName,
                                    errorCount: r.errors.length,
                                    direction: r.direction,
                                })),
                        },
                    });
                } catch (logError) {
                    logger.error('Failed to log sync summary error:', logError);
                }

                errorLogService.syncToMongoDB(validatedUserId).catch((syncError) => {
                    logger.error('Failed to sync error logs to MongoDB:', syncError);
                });
            }
        } catch (error) {
            logger.error('[MongoDBSyncService.performSync] Sync error:', error);
            this.isSyncing = false;
            this.currentProgress = null;
            throw error;
        } finally {
            this.isSyncing = false;
            this.currentProgress = null;
            logger.log('[MongoDBSyncService.performSync] Sync completed, results count:', results.length);
        }

        return results;
    }

    private async syncBidirectional(
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncBidirectional',
            additionalInfo: { tableName },
        });

        const startTime = Date.now();
        await syncMetadataService.updateSyncStatus(tableName, validatedUserId, 'syncing');

        try {
            const pullResult = await this.syncPull(validatedUserId, tableName, options);
            const pushResult = await this.syncPush(validatedUserId, tableName, options);

            const result: SyncResult = {
                tableName,
                direction: 'bidirectional',
                status: pullResult.status === 'error' || pushResult.status === 'error' ? 'error' : 'success',
                recordsProcessed: pullResult.recordsProcessed + pushResult.recordsProcessed,
                recordsCreated: pullResult.recordsCreated + pushResult.recordsCreated,
                recordsUpdated: pullResult.recordsUpdated + pushResult.recordsUpdated,
                recordsDeleted: pullResult.recordsDeleted + pushResult.recordsDeleted,
                conflicts: pullResult.conflicts + pushResult.conflicts,
                errors: [...pullResult.errors, ...pushResult.errors],
                duration: Date.now() - startTime,
            };

            await syncMetadataService.updateSyncStatus(
                tableName,
                validatedUserId,
                result.status === 'error' ? 'error' : 'success'
            );
            
            if (result.status === 'success') {
                await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'both');
            }

            return result;
        } catch (error) {
            await syncMetadataService.updateSyncStatus(
                tableName,
                userId,
                'error',
                error instanceof Error ? error.message : 'Unknown error'
            );
            throw error;
        }
    }

    private async syncPull(
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncPull',
            additionalInfo: { tableName },
        });

        const startTime = Date.now();
        const result: SyncResult = {
            tableName,
            direction: 'pull',
            status: 'success',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [],
            duration: 0,
        };

        try {
            const metadata = await syncMetadataService.getLocalMetadata(tableName, validatedUserId);
            const lastPullAt = metadata?.lastPullAt || (options.forceFullSync ? null : undefined);

            const remoteRecords = await this.fetchRemoteRecords(
                validatedUserId,
                tableName,
                lastPullAt ? new Date(lastPullAt) : undefined
            );

            this.updateProgress({
                currentOperation: `Pulling ${remoteRecords.length} records from ${tableName}...`,
                totalRecords: remoteRecords.length,
            });

            for (const remoteRecord of remoteRecords) {
                try {
                    const conflict = await this.resolveConflict(
                        validatedUserId,
                        tableName,
                        remoteRecord,
                        'pull'
                    );

                    if (conflict) {
                        result.conflicts++;
                        await syncMetadataService.incrementConflictCount(tableName, validatedUserId);
                    }

                    // FIX: Capture conflict status from applyRemoteRecord to track conflicts not caught by preliminary check
                    const applyResult = await this.applyRemoteRecord(validatedUserId, tableName, remoteRecord);

                    // If applyRemoteRecord handled a conflict that wasn't detected in preliminary check, increment counter
                    if (applyResult.conflictHandled && !conflict) {
                        result.conflicts++;
                        await syncMetadataService.incrementConflictCount(tableName, validatedUserId);
                    }

                    result.recordsProcessed++;
                    result.recordsCreated++;
                    this.updateProgress({
                        recordsProcessed: result.recordsProcessed,
                    });
                } catch (error) {
                    // Convert from Supabase format for getRecordId (for error logging)
                    const convertedRecord = this.convertFromSupabaseFormat(tableName, remoteRecord);
                    const recordId = this.getRecordId(convertedRecord, tableName);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push({
                        tableName,
                        recordId,
                        error: errorMessage,
                        timestamp: new Date(),
                        operation: 'read',
                    });
                    
                errorLogService.logSyncError(
                    validatedUserId,
                    tableName,
                    recordId,
                    error instanceof Error ? error : new Error(errorMessage),
                    'read'
                ).catch((logError) => {
                    logger.error('Failed to log sync error:', logError);
                });
                }
            }

            result.duration = Date.now() - startTime;
            
            if (result.status === 'success') {
                await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'pull');
            }
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.status = 'error';
            result.errors.push({
                tableName,
                recordId: 'all',
                error: errorMessage,
                timestamp: new Date(),
                operation: 'read',
            });
            result.duration = Date.now() - startTime;
            
            errorLogService.logSyncError(
                validatedUserId,
                tableName,
                'all',
                error instanceof Error ? error : new Error(errorMessage),
                'read'
            ).catch((logError) => {
                logger.error('Failed to log sync error:', logError);
            });
            
            return result;
        }
    }

    private async syncPush(
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncPush',
            additionalInfo: { tableName },
        });

        logger.log(`[MongoDBSyncService.syncPush] Starting push sync for table: ${tableName}, userId: ${validatedUserId}`);

        const startTime = Date.now();
        const result: SyncResult = {
            tableName,
            direction: 'push',
            status: 'success',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [],
            duration: 0,
        };

        try {
            logger.log(`[MongoDBSyncService.syncPush] Fetching local records for ${tableName}...`);
            const allLocalRecords = await this.fetchLocalRecords(userId, tableName);
            logger.log(`[MongoDBSyncService.syncPush] Fetched ${allLocalRecords.length} local records`);
            
            logger.log(`[MongoDBSyncService.syncPush] Fetching remote records for ${tableName}...`);
            const allRemoteRecords = await this.fetchRemoteRecords(validatedUserId, tableName);
            logger.log(`[MongoDBSyncService.syncPush] Fetched ${allRemoteRecords.length} remote records`);
            
            const remoteMap = new Map<string | number, Record<string, unknown>>();
            for (const remoteRecord of allRemoteRecords) {
                // Convert from Supabase format (snake_case) to camelCase
                const convertedRecord = this.convertFromSupabaseFormat(tableName, remoteRecord);
                const recordId = this.getRecordId(convertedRecord, tableName);
                // Store converted record (camelCase) so getUpdatedAt works correctly
                remoteMap.set(recordId, convertedRecord as Record<string, unknown>);
            }
            
            const recordsToPush: unknown[] = [];
            
            for (const localRecord of allLocalRecords) {
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);
                const remoteRecord = remoteMap.get(recordId);
                
                if (!remoteRecord) {
                    // Local doesn't exist remotely, always push
                    recordsToPush.push(localRecord);
                    logger.log(`[MongoDBSyncService.syncPush] Including ${tableName} ${recordId} in push (new record)`);
                } else {
                    const localUpdatedAt = this.getUpdatedAt(localRecord as Record<string, unknown>);
                    const remoteUpdatedAt = this.getUpdatedAt(remoteRecord);
                    
                    const localVersion = (localRecord as Record<string, unknown>).version as number | undefined;
                    const remoteVersion = remoteRecord.version as number | undefined;
                    
                    // Check if this record was queued for push after a conflict
                    const key = `${validatedUserId}:${tableName}`;
                    const wasQueuedForPush = this.recordsToPushAfterConflict.get(key)?.has(recordId);
                    
                    // Check if local was modified offline (async call)
                    const wasModifiedOffline = await this.isLocalModifiedOffline(validatedUserId, tableName, localRecord as Record<string, unknown>);
                    
                    // Enhanced logic: include all local changes (>= instead of >)
                    // Also include records modified offline or queued after conflicts
                    const needsUpdate = 
                        // Local has higher or equal version (local-first: push if >=)
                        (localVersion && remoteVersion && localVersion >= remoteVersion) ||
                        // No versions, compare timestamps (local newer or equal)
                        (!localVersion && !remoteVersion && localUpdatedAt >= remoteUpdatedAt) ||
                        // Local has version but remote doesn't
                        (localVersion && !remoteVersion) ||
                        // Record was queued for push after conflict
                        wasQueuedForPush ||
                        // Local was modified offline (check sync metadata)
                        wasModifiedOffline;
                    
                    if (needsUpdate) {
                        recordsToPush.push(localRecord);
                        logger.log(`[MongoDBSyncService.syncPush] Including ${tableName} ${recordId} in push. Local version: ${localVersion ?? 'N/A'}, remote version: ${remoteVersion ?? 'N/A'}, queued: ${wasQueuedForPush ?? false}, offline: ${wasModifiedOffline}`);
                    }
                }
            }
            
            // Clear the queue after processing
            const key = `${validatedUserId}:${tableName}`;
            this.recordsToPushAfterConflict.delete(key);

            logger.log(`[MongoDBSyncService.syncPush] Found ${recordsToPush.length} records to push to ${tableName}`);

            this.updateProgress({
                currentOperation: `Pushing ${recordsToPush.length} records to ${tableName}...`,
                totalRecords: recordsToPush.length,
            });

            const batches = this.chunkArray(recordsToPush, options.batchSize || BATCH_SIZE);
            logger.log(`[MongoDBSyncService.syncPush] Split into ${batches.length} batches`);

            for (const batch of batches) {
                try {
                    logger.log(`[MongoDBSyncService.syncPush] Pushing batch of ${batch.length} records to ${tableName}...`);
                    const batchResult = await this.pushBatch(validatedUserId, tableName, batch);
                    logger.log(`[MongoDBSyncService.syncPush] Batch result:`, batchResult);
                    result.recordsProcessed += batchResult.recordsProcessed;
                    result.recordsCreated += batchResult.recordsCreated;
                    result.recordsUpdated += batchResult.recordsUpdated;
                    result.conflicts += batchResult.conflicts;
                    result.errors.push(...batchResult.errors);

                    this.updateProgress({
                        recordsProcessed: result.recordsProcessed,
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    result.errors.push({
                        tableName,
                        recordId: 'batch',
                        error: errorMessage,
                        timestamp: new Date(),
                        operation: 'create',
                    });
                    
                    errorLogService.logSyncError(
                        validatedUserId,
                        tableName,
                        'batch',
                        error instanceof Error ? error : new Error(errorMessage),
                        'create',
                        { batchSize: batch.length }
                    ).catch((logError) => {
                        logger.error('Failed to log sync error:', logError);
                    });
                }
            }

            result.duration = Date.now() - startTime;
            
            if (result.status === 'success') {
                await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'push');
            }
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.status = 'error';
            result.errors.push({
                tableName,
                recordId: 'all',
                error: errorMessage,
                timestamp: new Date(),
                operation: 'create',
            });
            result.duration = Date.now() - startTime;
            
            errorLogService.logSyncError(
                validatedUserId,
                tableName,
                'all',
                error instanceof Error ? error : new Error(errorMessage),
                'create'
            ).catch((logError) => {
                logger.error('Failed to log sync error:', logError);
            });
            
            return result;
        }
    }

    private async fetchRemoteRecords(
        userId: string,
        tableName: SyncableTable,
        since?: Date
    ): Promise<unknown[]> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'fetchRemoteRecords',
            additionalInfo: { tableName },
        });

        logger.debug(`[MongoDBSyncService.fetchRemoteRecords] Fetching ${tableName} from Supabase for userId: ${validatedUserId}`, since ? `since ${since.toISOString()}` : '');
        
        let records: unknown[] = [];

        try {
            const supabase = await getSupabaseClientWithAuth(validatedUserId);
            const query = userScopedQuery(supabase, tableName, validatedUserId);
            
            let selectQuery = query.select('*');
            
            // Add updatedAt filter if since is provided
            if (since) {
                selectQuery = selectQuery.gte('updated_at', since.toISOString());
            }
            
            // Add ordering
            selectQuery = selectQuery.order('updated_at', { ascending: true });
            
            const { data, error } = await selectQuery;
            
            if (error) {
                throw new Error(`Supabase query error: ${error.message}`);
            }
            
            records = data || [];
        } catch (error) {
            logger.error(`[MongoDBSyncService.fetchRemoteRecords] Error fetching ${tableName} from Supabase:`, error);
            records = [];
        }

        logger.debug(`[MongoDBSyncService.fetchRemoteRecords] Fetched ${records.length} records for ${tableName} (userId: ${validatedUserId})`);

        return records;
    }

    private async fetchLocalRecords(
        userId: string,
        tableName: SyncableTable,
        since?: Date
    ): Promise<unknown[]> {
        switch (tableName) {
            case 'workouts': {
                const workouts = await dbHelpers.getAllWorkouts(userId);
                return since
                    ? workouts.filter(w => new Date(w.date) >= since)
                    : workouts;
            }

            case 'exercises':
                return await dbHelpers.getAllExercises();

            case 'workout_templates': {
                const templates = await dbHelpers.getAllTemplates(userId);
                return since
                    ? templates.filter(t => (t.updatedAt || t.createdAt) >= since)
                    : templates;
            }

            case 'planned_workouts': {
                const planned = await dbHelpers.getAllPlannedWorkouts(userId);
                return since
                    ? planned.filter(p => p.updatedAt >= since)
                    : planned;
            }

            case 'muscle_statuses': {
                const allStatuses = await dbHelpers.getAllMuscleStatuses();
                return userId 
                    ? allStatuses.filter((s: { userId?: string }) => s.userId === userId)
                    : allStatuses;
            }

            case 'user_profiles': {
                const profile = await dataService.getUserProfile(userId);
                return profile ? [profile] : [];
            }

            case 'settings': {
                const allSettings = await db.settings.toArray();
                return allSettings.map(s => ({
                    key: s.key,
                    value: s.value,
                    userId: userId,
                }));
            }

            case 'notifications': {
                const notifications = await dbHelpers.getAllNotifications(userId);
                return since
                    ? notifications.filter(n => n.createdAt >= since.getTime())
                    : notifications;
            }

            case 'sleep_logs': {
                const logs = await dbHelpers.getAllSleepLogs(userId);
                return since
                    ? logs.filter(l => {
                        const updatedAt = l.updatedAt || l.createdAt;
                        return updatedAt && updatedAt >= since;
                    })
                    : logs;
            }

            case 'recovery_logs': {
                const logs = await dbHelpers.getAllRecoveryLogs(userId);
                return since
                    ? logs.filter(l => {
                        const updatedAt = l.updatedAt || l.createdAt;
                        return updatedAt && updatedAt >= since;
                    })
                    : logs;
            }

            case 'error_logs': {
                const logs = await errorLogService.getErrorLogs(userId);
                return since
                    ? logs.filter(l => l.createdAt >= since)
                    : logs;
            }

            default:
                return [];
        }
    }

    private async resolveConflict(
        userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown,
        _direction: 'pull' | 'push'
    ): Promise<boolean> {
        // Convert from Supabase format (snake_case) to camelCase for getRecordId
        const convertedRecord = this.convertFromSupabaseFormat(tableName, remoteRecord);
        const recordId = this.getRecordId(convertedRecord, tableName);
        const localRecord = await this.getLocalRecord(userId, tableName, recordId);

        if (!localRecord) return false;

        const conflictInfo = versionManager.detectConflict(
            tableName,
            recordId,
            localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
            convertedRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
        );

        return conflictInfo.hasConflict;
    }

    private async getLocalRecord(
        userId: string,
        tableName: SyncableTable,
        recordId: string | number
    ): Promise<unknown | null> {
        switch (tableName) {
            case 'workouts':
                return (await dbHelpers.getWorkout(String(recordId))) ?? null;
            case 'exercises':
                return (await dbHelpers.getExercise(String(recordId))) ?? null;
            case 'workout_templates':
                return (await dbHelpers.getTemplate(String(recordId))) ?? null;
            case 'planned_workouts':
                return (await dbHelpers.getPlannedWorkout(String(recordId))) ?? null;
            case 'muscle_statuses': {
                const muscle = typeof recordId === 'string' && recordId.includes(':') 
                    ? recordId.split(':')[1] 
                    : String(recordId);
                return (await dbHelpers.getMuscleStatus(muscle)) ?? null;
            }
            case 'user_profiles': {
                const profile = await dataService.getUserProfile(userId);
                return profile;
            }
            case 'settings': {
                const key = typeof recordId === 'string' && recordId.includes(':') 
                    ? recordId.split(':')[1] 
                    : String(recordId);
                const setting = await dbHelpers.getSetting(key);
                return setting ? { key, value: setting } : null;
            }
            case 'notifications':
                return (await dbHelpers.getNotification(String(recordId))) ?? null;
            case 'sleep_logs': {
                if (typeof recordId === 'string' && recordId.includes(':')) {
                    const [recordUserId, dateStr] = recordId.split(':');
                    const date = new Date(dateStr);
                    return (await sleepRecoveryService.getSleepLog(recordUserId, date)) ?? null;
                }
                return (await dbHelpers.getSleepLog(Number(recordId))) ?? null;
            }
            case 'recovery_logs': {
                if (typeof recordId === 'string' && recordId.includes(':')) {
                    const [recordUserId, dateStr] = recordId.split(':');
                    const date = new Date(dateStr);
                    return (await dbHelpers.getRecoveryLogByDate(recordUserId, date)) ?? null;
                }
                return (await dbHelpers.getRecoveryLog(Number(recordId))) ?? null;
            }
            case 'error_logs': {
                const logs = await errorLogService.getErrorLogs(userId);
                return logs.find(l => l.id === Number(recordId)) ?? null;
            }
            default:
                return null;
        }
    }

    private async applyRemoteRecord(
        userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Promise<{ conflictHandled: boolean }> {
        // Convert from Supabase format (snake_case) to camelCase first
        // This is needed for getRecordId which expects camelCase fields
        const convertedRecord = this.convertFromSupabaseFormat(tableName, remoteRecord);
        const recordId = this.getRecordId(convertedRecord, tableName);
        const localRecord = await this.getLocalRecord(userId, tableName, recordId);

        if (localRecord) {
            const localVersioned = localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null };
            const remoteVersioned = convertedRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null };
            
            const conflictInfo = versionManager.detectConflict(
                tableName,
                recordId,
                localVersioned,
                remoteVersioned
            );

            const localVersion = localVersioned.version ?? 1;
            const remoteVersion = remoteVersioned.version ?? 1;
            // Handle missing timestamps - use current time if missing
            const localUpdatedAt = localVersioned.updatedAt ? new Date(localVersioned.updatedAt) : new Date();
            const remoteUpdatedAt = remoteVersioned.updatedAt ? new Date(remoteVersioned.updatedAt) : new Date();
            const localDeletedAt = localVersioned.deletedAt;
            const remoteDeletedAt = remoteVersioned.deletedAt;

            // Edge case: Handle deleted records
            if (localDeletedAt && !remoteDeletedAt) {
                // Local is deleted, remote is not - keep local deletion, queue for push
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Local record ${recordId} is deleted, keeping deletion (local-first) and queuing for push`);
                this.queueLocalForPush(userId, tableName, recordId);
                return { conflictHandled: false };
            } else if (!localDeletedAt && remoteDeletedAt) {
                // Remote is deleted but local exists - keep local (user may have restored)
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Remote record ${recordId} is deleted but local exists, keeping local (restored) and queuing for push`);
                this.queueLocalForPush(userId, tableName, recordId);
                return { conflictHandled: false };
            }

            if (conflictInfo.hasConflict) {
                // Local-first strategy: keep local data, queue it for push
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Conflict detected for ${tableName} ${recordId}, keeping local data (local-first strategy)`);
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Local version: ${localVersion}, remote version: ${remoteVersion}`);
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Local updatedAt: ${localUpdatedAt.toISOString()}, remote updatedAt: ${remoteUpdatedAt.toISOString()}`);

                // FIX: Log conflict to database for audit trail
                try {
                    const { dbHelpers } = await import('./database');
                    await dbHelpers.saveErrorLog({
                        userId,
                        errorType: 'sync_error',
                        errorMessage: `Sync conflict detected for ${tableName} record ${recordId}. Local changes preserved.`,
                        context: {
                            tableName,
                            recordId,
                            localVersion,
                            remoteVersion,
                            localUpdatedAt: localUpdatedAt.toISOString(),
                            remoteUpdatedAt: remoteUpdatedAt.toISOString(),
                            conflictResolution: 'local-first',
                        },
                        tableName,
                        recordId: String(recordId),
                        operation: 'sync',
                        severity: 'warning',
                    });

                    // FIX: Create user notification for conflict
                    const notificationId = `conflict-${tableName}-${recordId}-${Date.now()}`;
                    await dbHelpers.saveNotification({
                        id: notificationId,
                        userId,
                        type: 'system',
                        title: 'Sync Conflict Resolved',
                        message: `A sync conflict was detected for your ${tableName.replace('_', ' ')} data. Your local changes have been preserved and will sync to the server.`,
                        data: {
                            tableName,
                            recordId: String(recordId),
                            conflictResolution: 'local-first',
                            actionUrl: '/settings/sync',
                            actionLabel: 'View Sync Status',
                        },
                        isRead: false,
                        createdAt: Date.now(),
                        version: 1,
                    });
                } catch (error) {
                    logger.error('[MongoDBSyncService.applyRemoteRecord] Failed to log conflict:', error);
                    // Non-blocking - continue with conflict resolution
                }

                // Resolve conflict using local-first strategy (always keeps local)
                versionManager.resolveConflictLocalFirst(
                    localVersioned,
                    remoteVersioned
                );

                // Keep local data (don't overwrite)
                // Queue local data for push to ensure it's synced to remote
                this.queueLocalForPush(userId, tableName, recordId);

                // Log conflict for user awareness
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Local data preserved for ${tableName} ${recordId}, queued for push to remote`);
                // FIX: Return conflict handled status for proper tracking
                return { conflictHandled: true };
            } else if (remoteVersion > localVersion) {
                // Remote is definitively newer (higher version), update local
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Remote is newer for ${tableName} ${recordId} (remote version: ${remoteVersion} > local version: ${localVersion}), updating local`);
                await this.updateLocalRecord(userId, tableName, remoteRecord);
            } else if (remoteVersion === localVersion && remoteUpdatedAt > localUpdatedAt) {
                // Same version but remote has newer timestamp - this is edge case
                // For local-first, we still keep local but queue for push
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Same version but remote newer timestamp for ${tableName} ${recordId}, keeping local (local-first) and queuing for push`);
                this.queueLocalForPush(userId, tableName, recordId);
            } else {
                // Local is newer or equal, keep local and queue for push
                logger.log(`[MongoDBSyncService.applyRemoteRecord] Local is newer or equal for ${tableName} ${recordId} (local version: ${localVersion} >= remote version: ${remoteVersion}), keeping local and queuing for push`);
                this.queueLocalForPush(userId, tableName, recordId);
            }
        } else {
            // Local doesn't exist, create from remote
            logger.log(`[MongoDBSyncService.applyRemoteRecord] Creating new local record for ${tableName} ${recordId} from remote`);
            await this.createLocalRecord(userId, tableName, remoteRecord);
        }

        return { conflictHandled: false };
    }

    private async createLocalRecord(
        _userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Promise<void> {
        const converted = this.convertFromSupabaseFormat(tableName, remoteRecord);

        switch (tableName) {
            case 'workouts':
                await dbHelpers.saveWorkout(converted as Omit<Workout, 'id'>);
                break;
            case 'exercises': {
                const exercise = converted as unknown as Exercise;
                // Check for existing exercise by normalized name before saving
                const normalizedName = exercise.name.toLowerCase().trim();
                const existingExercise = await dbHelpers.findExerciseByName(normalizedName);
                
                if (existingExercise) {
                    // Use existing ID to prevent duplicate
                    const exerciseWithExistingId: Exercise = {
                        ...exercise,
                        id: existingExercise.id,
                    };
                    await dbHelpers.saveExercise(exerciseWithExistingId);
                } else {
                    await dbHelpers.saveExercise(exercise);
                }
                break;
            }
            case 'workout_templates':
                await dbHelpers.saveTemplate(converted as unknown as WorkoutTemplate);
                break;
            case 'planned_workouts':
                await dbHelpers.savePlannedWorkout(converted as unknown as PlannedWorkout);
                break;
            case 'muscle_statuses':
                await dbHelpers.saveMuscleStatus(converted as Omit<MuscleStatus, 'id'>);
                break;
            case 'user_profiles':
                await dataService.updateUserProfile(converted as UserProfile);
                break;
            case 'settings': {
                const settingsRecord = converted as { key: string; value: unknown };
                await dbHelpers.setSetting(settingsRecord.key, settingsRecord.value);
                break;
            }
            case 'notifications':
                await dbHelpers.saveNotification(converted as unknown as Notification);
                break;
            case 'sleep_logs': {
                await sleepRecoveryService.saveSleepLog(converted as unknown as SleepLog);
                break;
            }
            case 'recovery_logs': {
                await sleepRecoveryService.saveRecoveryLog(converted as unknown as RecoveryLog);
                break;
            }
            case 'error_logs': {
                const errorLog = converted as unknown as ErrorLog;
                await errorLogService.logError({
                    userId: errorLog.userId,
                    errorType: errorLog.errorType,
                    errorMessage: errorLog.errorMessage,
                    errorStack: errorLog.errorStack,
                    context: errorLog.context,
                    tableName: errorLog.tableName,
                    recordId: errorLog.recordId,
                    operation: errorLog.operation,
                    severity: errorLog.severity,
                });
                break;
            }
        }
    }

    private async updateLocalRecord(
        _userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown,
        isLocalFormat: boolean = false
    ): Promise<void> {
        const converted = isLocalFormat 
            ? remoteRecord as Record<string, unknown> 
            : this.convertFromSupabaseFormat(tableName, remoteRecord);
        // getRecordId expects camelCase, which converted already is
        const recordId = this.getRecordId(converted, tableName);

        switch (tableName) {
            case 'workouts':
                await dbHelpers.updateWorkout(String(recordId), converted as Partial<Workout>);
                break;
            case 'exercises': {
                const exercise = converted as unknown as Exercise;
                // Check for existing exercise by normalized name before saving
                const normalizedName = exercise.name.toLowerCase().trim();
                const existingExercise = await dbHelpers.findExerciseByName(normalizedName);
                
                if (existingExercise && existingExercise.id !== exercise.id) {
                    // Use existing ID to prevent duplicate
                    const exerciseWithExistingId: Exercise = {
                        ...exercise,
                        id: existingExercise.id,
                    };
                    await dbHelpers.saveExercise(exerciseWithExistingId);
                } else {
                    await dbHelpers.saveExercise(exercise);
                }
                break;
            }
            case 'workout_templates':
                await dbHelpers.updateTemplate(String(recordId), converted as Partial<WorkoutTemplate>);
                break;
            case 'planned_workouts':
                await dbHelpers.updatePlannedWorkout(String(recordId), converted as Partial<PlannedWorkout>);
                break;
            case 'muscle_statuses': {
                const record = remoteRecord as Record<string, unknown>;
                const muscle = record.muscle as string;
                const existing = await dbHelpers.getMuscleStatus(muscle);
                if (existing?.id) {
                    await dbHelpers.updateMuscleStatus(existing.id, converted as Partial<MuscleStatus>);
                } else {
                    await dbHelpers.saveMuscleStatus(converted as Omit<MuscleStatus, 'id'>);
                }
                break;
            }
            case 'user_profiles':
                await dataService.updateUserProfile(converted as Partial<UserProfile>);
                break;
            case 'settings': {
                const settingsRecord = converted as { key: string; value: unknown };
                await dbHelpers.setSetting(settingsRecord.key, settingsRecord.value);
                break;
            }
            case 'notifications':
                await dbHelpers.saveNotification(converted as unknown as Notification);
                break;
            case 'sleep_logs': {
                const sleepLog = converted as unknown as SleepLog;
                const existing = await sleepRecoveryService.getSleepLog(sleepLog.userId, sleepLog.date);
                if (existing?.id) {
                    await dbHelpers.updateSleepLog(existing.id, sleepLog);
                } else {
                    await sleepRecoveryService.saveSleepLog(sleepLog);
                }
                break;
            }
            case 'recovery_logs': {
                const recoveryLog = converted as unknown as RecoveryLog;
                const existing = await sleepRecoveryService.getRecoveryLog(recoveryLog.userId, recoveryLog.date);
                if (existing?.id) {
                    await dbHelpers.updateRecoveryLog(existing.id, recoveryLog);
                } else {
                    await sleepRecoveryService.saveRecoveryLog(recoveryLog);
                }
                break;
            }
            case 'error_logs': {
                const errorLog = converted as unknown as ErrorLog;
                if (errorLog.id && errorLog.resolved) {
                    await errorLogService.markResolved(errorLog.id, errorLog.userId, errorLog.resolvedBy);
                }
                break;
            }
        }
    }

    private async pushBatch(
        userId: string,
        tableName: SyncableTable,
        batch: unknown[]
    ): Promise<{
        recordsProcessed: number;
        recordsCreated: number;
        recordsUpdated: number;
        conflicts: number;
        errors: SyncError[];
    }> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'pushBatch',
            additionalInfo: { tableName, batchSize: batch.length },
        });

        logger.log(`[MongoDBSyncService.pushBatch] Processing batch of ${batch.length} records for ${tableName}`);

        const result = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            conflicts: 0,
            errors: [] as SyncError[],
        };

        logger.log(`[MongoDBSyncService.pushBatch] Processing ${tableName} with Supabase`);
        
        const supabase = await getSupabaseClientWithAuth(validatedUserId);

        for (const localRecord of batch) {
            try {
                const supabaseRecord = this.convertToSupabaseFormat(tableName, localRecord, validatedUserId);
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);

                // Build Supabase query to find existing record
                const query = userScopedQuery(supabase, tableName, validatedUserId);
                let selectQuery = query.select('*');
                
                // Add filters based on table structure
                if (tableName === 'workouts') {
                    // For workouts, search by id or date
                    if (supabaseRecord.id && typeof supabaseRecord.id === 'number') {
                        selectQuery = selectQuery.eq('id', supabaseRecord.id);
                    } else if (supabaseRecord.date) {
                        const dateStr = supabaseRecord.date instanceof Date 
                            ? supabaseRecord.date.toISOString().split('T')[0]
                            : String(supabaseRecord.date).split('T')[0];
                        selectQuery = selectQuery.eq('date', dateStr);
                    }
                } else if (tableName === 'exercises') {
                    if (supabaseRecord.id) {
                        selectQuery = selectQuery.eq('id', String(supabaseRecord.id));
                    }
                } else if (tableName === 'workout_templates') {
                    if (supabaseRecord.id) {
                        selectQuery = selectQuery.eq('id', String(supabaseRecord.id));
                    }
                } else if (tableName === 'planned_workouts') {
                    if (supabaseRecord.id) {
                        selectQuery = selectQuery.eq('id', String(supabaseRecord.id));
                    }
                } else if (tableName === 'notifications') {
                    if (supabaseRecord.id) {
                        selectQuery = selectQuery.eq('id', String(supabaseRecord.id));
                    }
                } else if (tableName === 'user_profiles') {
                    // Uses user_id as primary key, already filtered by userScopedQuery
                } else if (tableName === 'muscle_statuses') {
                    if (supabaseRecord.muscle) {
                        selectQuery = selectQuery.eq('muscle', String(supabaseRecord.muscle));
                    }
                } else if (tableName === 'settings') {
                    if (supabaseRecord.key) {
                        selectQuery = selectQuery.eq('key', String(supabaseRecord.key));
                    }
                } else if (tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                    if (supabaseRecord.date) {
                        const dateStr = supabaseRecord.date instanceof Date 
                            ? supabaseRecord.date.toISOString().split('T')[0]
                            : String(supabaseRecord.date).split('T')[0];
                        selectQuery = selectQuery.eq('date', dateStr);
                    }
                } else if (tableName === 'error_logs') {
                    if (supabaseRecord.id && typeof supabaseRecord.id === 'number') {
                        selectQuery = selectQuery.eq('id', supabaseRecord.id);
                    }
                }
                
                // Fetch existing record using Supabase
                logger.log(`[MongoDBSyncService.pushBatch] Looking for existing ${tableName} record`);
                let existing: unknown = null;
                try {
                    const { data, error } = await selectQuery.limit(1).single();
                    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                        throw error;
                    }
                    existing = data || null;
                    logger.log(`[MongoDBSyncService.pushBatch] findFirst result for ${tableName} ${recordId}:`, existing ? 'FOUND' : 'NOT FOUND');
                } catch (findError) {
                    const errorMessage = findError instanceof Error ? findError.message : 'Unknown error';
                    logger.error(`[MongoDBSyncService.pushBatch] Error finding existing record for ${tableName} ${recordId}:`, errorMessage);
                    result.errors.push({
                        tableName,
                        recordId,
                        error: errorMessage,
                        timestamp: new Date(),
                        operation: 'read',
                    });
                    errorLogService.logSyncError(
                        validatedUserId,
                        tableName,
                        recordId,
                        findError instanceof Error ? findError : new Error(errorMessage),
                        'read'
                    ).catch((logError) => {
                        logger.error('Failed to log sync error:', logError);
                    });
                    continue; // Skip to next record if we can't find existing
                }

                if (existing) {
                    // Validate that existing is a proper record object, not a response wrapper
                    // Check if it looks like a response wrapper (e.g., { success: true })
                    const existingObj = existing as Record<string, unknown>;
                    if (Object.keys(existingObj).length === 1 && 'success' in existingObj) {
                        // This is likely a response wrapper, not an actual record
                        logger.warn(`[MongoDBSyncService.pushBatch] Received response wrapper instead of record for ${tableName} ${recordId}, treating as not found`);
                        existing = null;
                    }
                }

                if (existing) {
                    // Extract existingId early so it's available in all code paths
                    const existingId = (existing as Record<string, unknown>).id;
                    
                    logger.log(`[MongoDBSyncService.pushBatch] Found existing record for ${tableName} ${recordId}, existing version: ${(existing as { version?: number }).version || 1}, local version: ${(localRecord as { version?: number }).version || 1}`);
                    
                    if (tableName === 'workouts') {
                        logger.log(`[MongoDBSyncService.pushBatch] Workout existing record keys:`, Object.keys(existing as Record<string, unknown>));
                        logger.log(`[MongoDBSyncService.pushBatch] Workout existingId extracted:`, existingId, `type:`, typeof existingId);
                        if (!existingId) {
                            logger.error(`[MongoDBSyncService.pushBatch] Workout existing record (no id):`, JSON.stringify(existing, null, 2));
                        }
                    }
                    
                    const conflictInfo = versionManager.detectConflict(
                        tableName,
                        recordId,
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    );

                    if (conflictInfo.hasConflict) {
                        logger.log(`[MongoDBSyncService.pushBatch] Conflict detected for ${tableName} record ${recordId} (local-first strategy), pushing local data to Supabase`);
                        logger.log(`[MongoDBSyncService.pushBatch] Local version: ${(localRecord as { version?: number }).version ?? 1}, remote version: ${(existing as { version?: number }).version ?? 1}`);
                        
                        // Local-first strategy: always push local data to remote
                        // This ensures user's local changes are preserved and synced
                        const resolvedRecord = this.convertToSupabaseFormat(tableName, localRecord, validatedUserId);
                        
                        // Preserve id if it exists (for workouts/error_logs that use SERIAL)
                        const existingId = (existing as Record<string, unknown>)?.id;
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            resolvedRecord.id = existingId;
                        }
                        
                        // Update with version increment (use max of local and remote + 1)
                        const localVersion = ((localRecord as Record<string, unknown>)?.version as number) || 1;
                        const existingVersion = ((existing as Record<string, unknown>)?.version as number) || 1;
                        const newVersion = Math.max(localVersion, existingVersion) + 1;
                        resolvedRecord.version = newVersion;
                        resolvedRecord.updated_at = new Date().toISOString();
                        
                        try {
                            logger.log(`[MongoDBSyncService.pushBatch] Attempting to upsert conflict-resolved ${tableName} record ${recordId} to Supabase`);
                            await this.upsertToSupabase(supabase, tableName, resolvedRecord, validatedUserId);
                            logger.log(`[MongoDBSyncService.pushBatch] Successfully upserted conflict-resolved record for ${tableName} record ${recordId}`);
                            result.recordsUpdated++;
                            result.conflicts++;
                        } catch (upsertError) {
                            const errorMessage = upsertError instanceof Error ? upsertError.message : 'Unknown error';
                            logger.error(`[MongoDBSyncService.pushBatch] Error upserting conflict-resolved record for ${tableName} ${recordId}:`, errorMessage);
                            result.errors.push({
                                tableName,
                                recordId,
                                error: errorMessage,
                                timestamp: new Date(),
                                operation: 'update',
                            });
                            result.conflicts++;
                            errorLogService.logSyncError(
                                validatedUserId,
                                tableName,
                                recordId,
                                upsertError instanceof Error ? upsertError : new Error(errorMessage),
                                'update'
                            ).catch((logError) => {
                                logger.error('Failed to log sync error:', logError);
                            });
                        }
                    } else if (versionManager.compareVersions(
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    ) > 0) {
                        // Local record is newer, update remote
                        logger.log(`[MongoDBSyncService.pushBatch] Local record is newer for ${tableName} ${recordId}, updating Supabase`);
                        
                        const updateRecord = this.convertToSupabaseFormat(tableName, localRecord, validatedUserId);
                        
                        // Preserve id if it exists
                        const existingId = (existing as Record<string, unknown>)?.id;
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            updateRecord.id = existingId;
                        }
                        
                        // Update with version increment
                        const existingVersion = ((existing as Record<string, unknown>)?.version as number) || 1;
                        const newVersion = existingVersion + 1;
                        updateRecord.version = newVersion;
                        updateRecord.updated_at = new Date().toISOString();
                        delete updateRecord.created_at; // Don't update created_at
                        
                        await this.upsertToSupabase(supabase, tableName, updateRecord, validatedUserId);
                        result.recordsUpdated++;
                    } else {
                        // Local-first strategy: even if remote is newer, push local data
                        // This ensures user's local changes are never lost
                        const localVersion = ((localRecord as Record<string, unknown>)?.version as number) || 1;
                        const existingVersion = ((existing as Record<string, unknown>)?.version as number) || 1;
                        const localDeletedAt = (localRecord as Record<string, unknown>)?.deletedAt;
                        const existingDeletedAt = (existing as Record<string, unknown>)?.deletedAt;
                        
                        logger.log(`[MongoDBSyncService.pushBatch] Remote record is newer or same for ${tableName} ${recordId}, but pushing local data anyway (local-first strategy)`);
                        logger.log(`[MongoDBSyncService.pushBatch] Local version: ${localVersion}, remote version: ${existingVersion}`);
                        
                        // Handle deleted records edge case
                        if (localDeletedAt && !existingDeletedAt) {
                            // Local is deleted, push deletion to remote
                            logger.log(`[MongoDBSyncService.pushBatch] Local record ${recordId} is deleted, pushing deletion to remote`);
                        } else if (!localDeletedAt && existingDeletedAt) {
                            // Remote is deleted but local exists, keep local (user may have restored)
                            logger.log(`[MongoDBSyncService.pushBatch] Remote record ${recordId} is deleted but local exists, keeping local (restored)`);
                        }
                        
                        const pushRecord = this.convertToSupabaseFormat(tableName, localRecord, validatedUserId);
                        
                        // Preserve id if it exists
                        const existingId = (existing as Record<string, unknown>)?.id;
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            pushRecord.id = existingId;
                        }
                        // Update with version increment (use max to ensure version is always incremented)
                        const newVersion = Math.max(localVersion, existingVersion) + 1;
                        pushRecord.version = newVersion;
                        pushRecord.updated_at = new Date().toISOString();
                        
                        try {
                            logger.log(`[MongoDBSyncService.pushBatch] Attempting to upsert ${tableName} record ${recordId} to Supabase (remote newer but pushing local)`);
                            await this.upsertToSupabase(supabase, tableName, pushRecord, validatedUserId);
                            logger.log(`[MongoDBSyncService.pushBatch] Successfully pushed local data for ${tableName} record ${recordId} (remote was newer)`);
                            result.recordsUpdated++;
                            result.conflicts++;
                        } catch (upsertError) {
                            const errorMessage = upsertError instanceof Error ? upsertError.message : 'Unknown error';
                            logger.error(`[MongoDBSyncService.pushBatch] Error upserting record for ${tableName} ${recordId} (remote newer case):`, errorMessage);
                            result.errors.push({
                                tableName,
                                recordId,
                                error: errorMessage,
                                timestamp: new Date(),
                                operation: 'update',
                            });
                            result.conflicts++;
                            errorLogService.logSyncError(
                                validatedUserId,
                                tableName,
                                recordId,
                                upsertError instanceof Error ? upsertError : new Error(errorMessage),
                                'update'
                            ).catch((logError) => {
                                logger.error('Failed to log sync error:', logError);
                            });
                        }
                    }
                } else {
                    // No existing record - create new record
                    logger.log(`[MongoDBSyncService.pushBatch] Creating new record in ${tableName}`);
                    
                    try {
                        // Remove id for tables that auto-generate it
                        const createRecord = { ...supabaseRecord };
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete createRecord.id;
                        }
                        // Remove id for composite key tables
                        if (tableName === 'muscle_statuses' || tableName === 'settings' || 
                            tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                            delete createRecord.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete createRecord.id;
                        }
                        
                        await this.upsertToSupabase(supabase, tableName, createRecord, validatedUserId);
                        logger.log(`[MongoDBSyncService.pushBatch] Successfully created record in ${tableName}`);
                        result.recordsCreated++;
                    } catch (createError) {
                        const errorMessage = createError instanceof Error ? createError.message : 'Unknown error';
                        logger.error(`[MongoDBSyncService.pushBatch] Error creating new record for ${tableName} ${recordId}:`, errorMessage);
                        result.errors.push({
                            tableName,
                            recordId,
                            error: errorMessage,
                            timestamp: new Date(),
                            operation: 'create',
                        });
                        errorLogService.logSyncError(
                            validatedUserId,
                            tableName,
                            recordId,
                            createError instanceof Error ? createError : new Error(errorMessage),
                            'create'
                        ).catch((logError) => {
                            logger.error('Failed to log sync error:', logError);
                        });
                    }
                }

                result.recordsProcessed++;
            } catch (error) {
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push({
                    tableName,
                    recordId,
                    error: errorMessage,
                    timestamp: new Date(),
                    operation: 'create',
                });
                
                errorLogService.logSyncError(
                    validatedUserId,
                    tableName,
                    recordId,
                    error instanceof Error ? error : new Error(errorMessage),
                    'create'
                ).catch((logError) => {
                    logger.error('Failed to log sync error:', logError);
                });
            }
        }

        return result;
    }

    /**
     * Convert record from IndexedDB format to Supabase format (snake_case)
     */
    private convertToSupabaseFormat(
        tableName: SyncableTable,
        localRecord: unknown,
        userId: string
    ): Record<string, unknown> {
        const record = localRecord as Record<string, unknown>;
        
        // Convert camelCase to snake_case and prepare for Supabase
        const convertKey = (key: string): string => {
            return key.replace(/([A-Z])/g, '_$1').toLowerCase();
        };
        
        const convertValue = (value: unknown): unknown => {
            if (value instanceof Date) {
                return value.toISOString();
            }
            if (Array.isArray(value)) {
                // Recursively convert array elements
                return value.map(item => convertValue(item));
            }
            if (value && typeof value === 'object') {
                const obj: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(value)) {
                    obj[convertKey(k)] = convertValue(v);
                }
                return obj;
            }
            return value;
        };
        
        const base: Record<string, unknown> = {
            user_id: userId,
            version: record.version ?? 1,
        };
        
        // Convert all fields to snake_case
        for (const [key, value] of Object.entries(record)) {
            if (key === 'id' || key === 'userId') continue; // Handle separately
            const snakeKey = convertKey(key);
            base[snakeKey] = convertValue(value);
        }
        
        // Handle deleted_at
        if (record.deletedAt) {
            const deletedAt = timestampToLocalDate(record.deletedAt as number | Date | string);
            base.deleted_at = deletedAt ? deletedAt.toISOString() : null;
        } else {
            base.deleted_at = null;
        }
        
        // Handle created_at and updated_at
        if (record.createdAt) {
            const createdAt = timestampToLocalDate(record.createdAt as number | Date | string);
            base.created_at = createdAt ? createdAt.toISOString() : new Date().toISOString();
        }
        if (record.updatedAt) {
            const updatedAt = timestampToLocalDate(record.updatedAt as number | Date | string);
            base.updated_at = updatedAt ? updatedAt.toISOString() : new Date().toISOString();
        }
        
        // Table-specific handling
        switch (tableName) {
            case 'workouts':
                // FIX: Workouts now use string IDs (migrated in DB v13)
                // Support both string and legacy number IDs for backward compatibility
                if (record.id) {
                    base.id = String(record.id);
                }
                break;
            case 'exercises':
                // Exercises use id as TEXT primary key
                if (record.id) {
                    base.id = String(record.id);
                }
                if (record.exerciseId) {
                    base.id = String(record.exerciseId);
                }
                break;
            case 'workout_templates':
            case 'planned_workouts':
                // These use TEXT id
                if (record.id) {
                    base.id = String(record.id);
                }
                break;
            case 'user_profiles':
                // Uses user_id as primary key
                base.user_id = record.id || userId;
                break;
            case 'notifications':
                // These use TEXT id
                if (record.id) {
                    base.id = String(record.id);
                }
                // Handle read_at
                if (record.readAt) {
                    const readAt = timestampToLocalDate(record.readAt as number | Date | string);
                    base.read_at = readAt ? readAt.toISOString() : null;
                }
                break;
            case 'sleep_logs':
                // These use SERIAL id
                if (record.id && typeof record.id === 'number') {
                    base.id = record.id;
                }
                // Handle bedtime and wake_time
                if (record.bedtime) {
                    const bedtime = timestampToLocalDate(record.bedtime as number | Date | string);
                    base.bedtime = bedtime ? bedtime.toISOString() : null;
                }
                if (record.wakeTime) {
                    const wakeTime = timestampToLocalDate(record.wakeTime as number | Date | string);
                    base.wake_time = wakeTime ? wakeTime.toISOString() : null;
                }
                break;
            case 'error_logs':
                // These use SERIAL id
                if (record.id && typeof record.id === 'number') {
                    base.id = record.id;
                }
                // Handle resolved_at
                if (record.resolvedAt) {
                    const resolvedAt = timestampToLocalDate(record.resolvedAt as number | Date | string);
                    base.resolved_at = resolvedAt ? resolvedAt.toISOString() : null;
                }
                break;
            case 'muscle_statuses':
            case 'settings':
            case 'recovery_logs':
                // These use SERIAL id or composite keys
                if (record.id && typeof record.id === 'number') {
                    base.id = record.id;
                }
                break;
        }
        
        return base;
    }

    /**
     * Upsert a record to Supabase
     */
    private async upsertToSupabase(
        supabase: Awaited<ReturnType<typeof getSupabaseClientWithAuth>>,
        tableName: SyncableTable,
        record: Record<string, unknown>,
        userId: string
    ): Promise<void> {
        const query = userScopedQuery(supabase, tableName, userId);
        
        // Build upsert data (remove id for tables that auto-generate it)
        const upsertData = { ...record };
        
        // Handle table-specific upsert logic
        switch (tableName) {
            case 'workouts': {
                if (upsertData.id && typeof upsertData.id === 'number') {
                    // Use upsert with id
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(upsertData, { onConflict: 'id' });
                    if (error) throw error;
                } else {
                    // Insert new record
                    const { error } = await query.insert(upsertData);
                    if (error) throw error;
                }
                break;
            }
            case 'exercises':
            case 'workout_templates':
            case 'planned_workouts':
            case 'notifications': {
                if (upsertData.id) {
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(upsertData, { onConflict: 'id' });
                    if (error) throw error;
                } else {
                    const { error } = await query.insert(upsertData);
                    if (error) throw error;
                }
                break;
            }
            case 'user_profiles': {
                // Uses user_id as primary key
                const { error } = await supabase
                    .from(tableName)
                    .upsert(upsertData, { onConflict: 'user_id' });
                if (error) throw error;
                break;
            }
            case 'muscle_statuses': {
                // Composite key: user_id + muscle
                const { error } = await supabase
                    .from(tableName)
                    .upsert(upsertData, { onConflict: 'user_id,muscle' });
                if (error) throw error;
                break;
            }
            case 'settings': {
                // Composite key: user_id + key
                const { error } = await supabase
                    .from(tableName)
                    .upsert(upsertData, { onConflict: 'user_id,key' });
                if (error) throw error;
                break;
            }
            case 'sleep_logs': {
                // Composite key: user_id + date
                const { error } = await supabase
                    .from(tableName)
                    .upsert(upsertData, { onConflict: 'user_id,date' });
                if (error) throw error;
                break;
            }
            case 'recovery_logs': {
                // Composite key: user_id + date
                const { error } = await supabase
                    .from(tableName)
                    .upsert(upsertData, { onConflict: 'user_id,date' });
                if (error) throw error;
                break;
            }
            case 'error_logs': {
                if (upsertData.id && typeof upsertData.id === 'number') {
                    const { error } = await supabase
                        .from(tableName)
                        .upsert(upsertData, { onConflict: 'id' });
                    if (error) throw error;
                } else {
                    const { error } = await query.insert(upsertData);
                    if (error) throw error;
                }
                break;
            }
            default: {
                const { error } = await query.insert(upsertData);
                if (error) throw error;
            }
        }
    }

    /**
     * Convert record from Supabase format (snake_case) to IndexedDB format (camelCase)
     */
    private convertFromSupabaseFormat(
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Record<string, unknown> {
        const record = remoteRecord as Record<string, unknown>;
        
        // Helper to convert snake_case to camelCase
        const toCamelCase = (str: string): string => {
            return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        };
        
        // Recursively convert values (handles nested objects and arrays)
        const convertValue = (value: unknown): unknown => {
            if (value instanceof Date) {
                return value;
            }
            if (Array.isArray(value)) {
                // Recursively convert array elements
                return value.map(item => convertValue(item));
            }
            if (value && typeof value === 'object' && !(value instanceof Date)) {
                const obj: Record<string, unknown> = {};
                for (const [k, v] of Object.entries(value)) {
                    const camelKey = toCamelCase(k);
                    obj[camelKey] = convertValue(v);
                }
                return obj;
            }
            return value;
        };
        
        // Convert all snake_case keys to camelCase
        const base: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(record)) {
            const camelKey = toCamelCase(key);
            base[camelKey] = convertValue(value);
        }
        
        // Handle special field mappings
        if (record.user_id !== undefined) {
            base.userId = record.user_id;
        } else if (record.userId !== undefined) {
            base.userId = record.userId;
        }

        if (record.created_at !== undefined) {
            const createdAt = typeof record.created_at === 'string' 
                ? new Date(record.created_at) 
                : record.created_at;
            const localDate = timestampToLocalDate(createdAt as number | Date | string);
            base.createdAt = localDate ? localDate.getTime() : Date.now();
        } else if (record.createdAt !== undefined) {
            const createdAt = typeof record.createdAt === 'string' 
                ? new Date(record.createdAt) 
                : record.createdAt;
            const localDate = timestampToLocalDate(createdAt as number | Date | string);
            base.createdAt = localDate ? localDate.getTime() : Date.now();
        }

        if (record.updated_at !== undefined) {
            const updatedAt = typeof record.updated_at === 'string' 
                ? new Date(record.updated_at) 
                : record.updated_at;
            const localDate = timestampToLocalDate(updatedAt as number | Date | string);
            base.updatedAt = localDate ? localDate.getTime() : Date.now();
        } else if (record.updatedAt !== undefined) {
            const updatedAt = typeof record.updatedAt === 'string' 
                ? new Date(record.updatedAt) 
                : record.updatedAt;
            const localDate = timestampToLocalDate(updatedAt as number | Date | string);
            base.updatedAt = localDate ? localDate.getTime() : Date.now();
        }

        if (record.deleted_at !== undefined) {
            const deletedAt = record.deleted_at 
                ? (typeof record.deleted_at === 'string' ? new Date(record.deleted_at) : record.deleted_at)
                : null;
            const localDate = timestampToLocalDate(deletedAt as number | Date | string | null);
            base.deletedAt = localDate ? localDate.getTime() : null;
        } else if (record.deletedAt !== undefined) {
            const deletedAt = record.deletedAt 
                ? (typeof record.deletedAt === 'string' ? new Date(record.deletedAt) : record.deletedAt)
                : null;
            const localDate = timestampToLocalDate(deletedAt as number | Date | string | null);
            base.deletedAt = localDate ? localDate.getTime() : null;
        }
        
        // Handle table-specific ID mappings
        if (record.id !== undefined) {
            if (tableName === 'workouts' || tableName === 'error_logs') {
                // These use numeric IDs in IndexedDB
                base.id = typeof record.id === 'string' ? parseInt(record.id, 10) : Number(record.id);
            } else if (tableName === 'exercises') {
                base.id = record.id;
            } else if (tableName === 'workout_templates') {
                base.id = record.id;
            } else if (tableName === 'planned_workouts') {
                base.id = record.id;
            } else if (tableName === 'notifications') {
                base.id = record.id;
            } else if (tableName !== 'user_profiles') {
                base.id = record.id;
            }
        }
        
        // Special handling for notifications (read_at)
        if (tableName === 'notifications') {
            if (record.read_at !== undefined) {
                const readAt = record.read_at 
                    ? (typeof record.read_at === 'string' ? new Date(record.read_at) : record.read_at)
                    : null;
                const localDate = timestampToLocalDate(readAt as number | Date | string | null);
                base.readAt = localDate ? localDate.getTime() : null;
            } else if (record.readAt !== undefined) {
                const readAt = record.readAt 
                    ? (typeof record.readAt === 'string' ? new Date(record.readAt) : record.readAt)
                    : null;
                const localDate = timestampToLocalDate(readAt as number | Date | string | null);
                base.readAt = localDate ? localDate.getTime() : null;
            }
            // Handle 'read' boolean field
            if (record.read !== undefined) {
                base.isRead = record.read;
            } else if (record.isRead !== undefined) {
                base.isRead = record.isRead;
            }
        }
        
        // Handle JSON fields that might be stored as strings in Supabase
        if (record.data !== undefined && typeof record.data === 'string') {
            try {
                base.data = JSON.parse(record.data);
            } catch {
                base.data = record.data;
            }
        }
        
        // Handle other common snake_case fields that need camelCase conversion
        // These are already converted by the loop above, but ensure they're properly typed
        if (record.workout_type !== undefined) base.workoutType = record.workout_type;
        if (record.muscles_targeted !== undefined) base.musclesTargeted = record.muscles_targeted;
        if (record.experience_level !== undefined) base.experienceLevel = record.experience_level;
        if (record.preferred_unit !== undefined) base.preferredUnit = record.preferred_unit;
        if (record.default_rest_time !== undefined) base.defaultRestTime = record.default_rest_time;
        if (record.profile_picture !== undefined) base.profilePicture = record.profile_picture;
        if (record.total_volume !== undefined) base.totalVolume = record.total_volume;
        if (record.total_duration !== undefined) base.totalDuration = record.total_duration;
        if (record.recovery_status !== undefined) base.recoveryStatus = record.recovery_status;
        if (record.recovery_percentage !== undefined) base.recoveryPercentage = record.recovery_percentage;
        if (record.workload_score !== undefined) base.workloadScore = record.workload_score;
        if (record.recommended_rest_days !== undefined) base.recommendedRestDays = record.recommended_rest_days;
        if (record.total_volume_last_7_days !== undefined) base.totalVolumeLast7Days = record.total_volume_last_7_days;
        if (record.training_frequency !== undefined) base.trainingFrequency = record.training_frequency;
        if (record.is_custom !== undefined) base.isCustom = record.is_custom;
        if (record.tracking_type !== undefined) base.trackingType = record.tracking_type;
        if (record.anatomy_image_url !== undefined) base.anatomyImageUrl = record.anatomy_image_url;
        if (record.strengthlog_url !== undefined) base.strengthlogUrl = record.strengthlog_url;
        if (record.strengthlog_slug !== undefined) base.strengthlogSlug = record.strengthlog_slug;
        // advanced_details is already converted by the loop above (line 1729-1732) with recursive conversion
        // No need to override it here as that would overwrite the correctly converted nested object
        if (record.muscle_category !== undefined) base.muscleCategory = record.muscle_category;
        if (record.template_id !== undefined) base.templateId = record.template_id;
        if (record.workout_name !== undefined) base.workoutName = record.workout_name;
        if (record.estimated_duration !== undefined) base.estimatedDuration = record.estimated_duration;
        if (record.is_featured !== undefined) base.isFeatured = record.is_featured;
        if (record.is_trending !== undefined) base.isTrending = record.is_trending;
        if (record.match_percentage !== undefined) base.matchPercentage = record.match_percentage;
        if (record.planned_workout_id !== undefined) base.plannedWorkoutId = record.planned_workout_id;
        if (record.is_completed !== undefined) base.isCompleted = record.is_completed;
        if (record.completed_workout_id !== undefined) base.completedWorkoutId = record.completed_workout_id;
        if (record.overall_recovery !== undefined) base.overallRecovery = record.overall_recovery;
        if (record.stress_level !== undefined) base.stressLevel = record.stress_level;
        if (record.energy_level !== undefined) base.energyLevel = record.energy_level;
        if (record.readiness_to_train !== undefined) base.readinessToTrain = record.readiness_to_train;
        if (record.error_type !== undefined) base.errorType = record.error_type;
        if (record.error_message !== undefined) base.errorMessage = record.error_message;
        if (record.error_stack !== undefined) base.errorStack = record.error_stack;
        if (record.table_name !== undefined) base.tableName = record.table_name;
        if (record.record_id !== undefined) base.recordId = record.record_id;
        if (record.resolved_at !== undefined) {
            const resolvedAt = record.resolved_at 
                ? (typeof record.resolved_at === 'string' ? new Date(record.resolved_at) : record.resolved_at)
                : null;
            const localDate = timestampToLocalDate(resolvedAt as number | Date | string | null);
            base.resolvedAt = localDate ? localDate.getTime() : null;
        } else if (record.resolvedAt !== undefined) {
            const resolvedAt = record.resolvedAt 
                ? (typeof record.resolvedAt === 'string' ? new Date(record.resolvedAt) : record.resolvedAt)
                : null;
            const localDate = timestampToLocalDate(resolvedAt as number | Date | string | null);
            base.resolvedAt = localDate ? localDate.getTime() : null;
        }
        if (record.resolved_by !== undefined) base.resolvedBy = record.resolved_by;
        if (record.soreness !== undefined) base.soreness = record.soreness;
        if (record.bedtime !== undefined) {
            const bedtime = record.bedtime 
                ? (typeof record.bedtime === 'string' ? new Date(record.bedtime) : record.bedtime)
                : null;
            const localDate = timestampToLocalDate(bedtime as number | Date | string | null);
            base.bedtime = localDate ? localDate.getTime() : null;
        }
        if (record.wake_time !== undefined) {
            const wakeTime = record.wake_time 
                ? (typeof record.wake_time === 'string' ? new Date(record.wake_time) : record.wake_time)
                : null;
            const localDate = timestampToLocalDate(wakeTime as number | Date | string | null);
            base.wakeTime = localDate ? localDate.getTime() : null;
        } else if (record.wakeTime !== undefined) {
            const wakeTime = record.wakeTime 
                ? (typeof record.wakeTime === 'string' ? new Date(record.wakeTime) : record.wakeTime)
                : null;
            const localDate = timestampToLocalDate(wakeTime as number | Date | string | null);
            base.wakeTime = localDate ? localDate.getTime() : null;
        }
        if (record.duration !== undefined) base.duration = record.duration;
        if (record.quality !== undefined) base.quality = record.quality;
        
        return base;
    }

    /**
     * @deprecated Use convertFromSupabaseFormat instead. This method expects MongoDB/camelCase format.
     */
    private convertFromMongoFormat(
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Record<string, unknown> {
        const record = remoteRecord as Record<string, unknown>;
        
        // MongoDB uses camelCase, so conversion is simpler than Supabase
        // Main thing is to map _id to id for IndexedDB
        const base: Record<string, unknown> = {
            ...record,
        };

        // Map Prisma id field to IndexedDB id field
        // Prisma uses 'id' (mapped from MongoDB _id)
        if (record.id) {
            if (tableName === 'workouts' || tableName === 'error_logs') {
                // These use numeric IDs in IndexedDB
                // Convert string ID to number if possible
                base.id = typeof record.id === 'string' ? parseInt(record.id, 16) : Number(record.id);
            } else if (tableName === 'exercises') {
                // Exercises use exerciseId in Prisma, map to id for IndexedDB
                base.id = record.exerciseId || record.id;
            } else if (tableName === 'workout_templates') {
                // Templates use templateId in Prisma
                base.id = record.templateId || record.id;
            } else if (tableName === 'planned_workouts') {
                // Planned workouts use plannedWorkoutId in Prisma
                base.id = record.plannedWorkoutId || record.id;
            } else if (tableName === 'notifications') {
                // Notifications use notificationId in Prisma
                base.id = record.notificationId || record.id;
            } else if (tableName !== 'user_profiles') {
                // Most other tables use string IDs
                base.id = record.id;
            }
        }

        // Convert Date objects to timestamps for IndexedDB
        // Preserve local time representation
        if (record.createdAt instanceof Date) {
            base.createdAt = record.createdAt.getTime();
        } else if (record.createdAt) {
            const localDate = timestampToLocalDate(record.createdAt as number | Date | string);
            base.createdAt = localDate ? localDate.getTime() : Date.now();
        }
        if (record.updatedAt instanceof Date) {
            base.updatedAt = record.updatedAt.getTime();
        } else if (record.updatedAt) {
            const localDate = timestampToLocalDate(record.updatedAt as number | Date | string);
            base.updatedAt = localDate ? localDate.getTime() : Date.now();
        }
        
        // Special handling for notifications (timestamps)
        if (tableName === 'notifications') {
            if (record.readAt instanceof Date) {
                base.readAt = record.readAt.getTime();
            } else if (record.readAt) {
                const localDate = timestampToLocalDate(record.readAt as number | Date | string);
                base.readAt = localDate ? localDate.getTime() : null;
            }
        }

        return base;
    }

    private getRecordId(record: Record<string, unknown>, tableName?: SyncableTable): string | number {
        if (tableName === 'user_profiles') {
            return (record.userId as string | number) || (record.id as string | number) || '';
        }
        
        if (tableName === 'muscle_statuses') {
            const userId = record.userId;
            const muscle = record.muscle;
            if (userId && muscle) {
                return `${userId}:${muscle}`;
            }
        }
        
        if (tableName === 'settings') {
            const userId = record.userId;
            const key = record.key;
            if (userId && key) {
                return `${userId}:${key}`;
            }
        }
        
        if (tableName === 'sleep_logs') {
            const userId = record.userId;
            const date = record.date;
            if (userId && date) {
                const dateStr = date instanceof Date 
                    ? date.toISOString().split('T')[0]
                    : typeof date === 'string'
                    ? date.split('T')[0]
                    : String(date);
                return `${userId}:${dateStr}`;
            }
        }
        
        if (tableName === 'recovery_logs') {
            const userId = record.userId;
            const date = record.date;
            if (userId && date) {
                const dateStr = date instanceof Date 
                    ? date.toISOString().split('T')[0]
                    : typeof date === 'string'
                    ? date.split('T')[0]
                    : String(date);
                return `${userId}:${dateStr}`;
            }
        }
        
        return (record.id as string | number) || (record._id as string | number) || (record.userId as string | number) || (record.key as string) || '';
    }

    private getUpdatedAt(record: Record<string, unknown>): Date {
        if (record.updatedAt) {
            return record.updatedAt instanceof Date ? record.updatedAt : new Date(record.updatedAt as string | number | Date);
        }
        return new Date();
    }

    /**
     * Queue local record for push after conflict resolution (local-first strategy)
     * This ensures local data is synced to remote even when conflicts occur
     */
    private queueLocalForPush(
        userId: string,
        tableName: SyncableTable,
        recordId: string | number
    ): void {
        const key = `${userId}:${tableName}`;
        if (!this.recordsToPushAfterConflict.has(key)) {
            this.recordsToPushAfterConflict.set(key, new Set());
        }
        this.recordsToPushAfterConflict.get(key)!.add(recordId);
        logger.log(`[MongoDBSyncService.queueLocalForPush] Queued ${tableName} ${recordId} for push after conflict`);
    }

    /**
     * Check if local record was modified offline (after last sync)
     * This helps identify records that should be pushed even if versions are equal
     */
    private async isLocalModifiedOffline(
        userId: string,
        tableName: SyncableTable,
        localRecord: Record<string, unknown>
    ): Promise<boolean> {
        try {
            const metadata = await syncMetadataService.getLocalMetadata(tableName, userId);
            const lastSyncAt = metadata?.lastSyncAt ? new Date(metadata.lastSyncAt) : null;
            
            if (!lastSyncAt) {
                // Never synced, consider it modified offline
                return true;
            }
            
            const localUpdatedAt = this.getUpdatedAt(localRecord);
            return localUpdatedAt > lastSyncAt;
        } catch (error) {
            // On error, assume it was modified offline to be safe
            logger.warn(`[MongoDBSyncService.isLocalModifiedOffline] Error checking offline modification for ${tableName}:`, error);
            return true;
        }
    }


    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    async getSyncStatus(userId: string): Promise<SyncStatus> {
        const validatedUserId = requireUserId(userId, {
            functionName: 'getSyncStatus',
        });

        if (this.isSyncing) return 'syncing';

        const allMetadata = await syncMetadataService.getAllMetadata(validatedUserId);
        const hasErrors = allMetadata.some(m => m.syncStatus === 'error');
        const hasConflicts = allMetadata.some(m => m.conflictCount > 0);

        if (hasErrors) return 'error';
        if (hasConflicts) return 'conflict';
        return 'idle';
    }

    private async syncTable(
        userId: string,
        table: SyncableTable,
        direction: SyncDirection,
        options: SyncOptions
    ): Promise<SyncResult> {
        return await errorRecovery.withRetry(async () => {
            if (direction === 'bidirectional') {
                return await this.syncBidirectional(userId, table, options);
            } else if (direction === 'push') {
                return await this.syncPush(userId, table, options);
            } else {
                return await this.syncPull(userId, table, options);
            }
        }, {
            maxRetries: options.maxRetries ?? 3,
            retryableErrors: (error) => {
                const message = error.message.toLowerCase();
                return message.includes('network') || 
                       message.includes('timeout') || 
                       message.includes('temporary');
            },
        });
    }
}

export const mongodbSyncService = new MongoDBSyncService();

