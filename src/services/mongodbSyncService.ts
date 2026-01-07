import { prisma } from './prismaClient';
import { userScopedFilter } from './mongodbQueryBuilder';
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

/**
 * Get current local date/time as a Date object
 * This ensures we use the local timezone instead of UTC
 */
function getCurrentLocalDate(): Date {
    return new Date();
}

/**
 * Convert a timestamp (number) to a local Date object
 * Preserves the local time representation
 */
function timestampToLocalDate(timestamp: number | Date | string | null | undefined): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    // For numeric timestamps, create a Date object which will be in local time
    return new Date(timestamp);
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
    private syncQueue: Promise<SyncResult[]> = Promise.resolve([]);
    private currentProgress: SyncProgress | null = null;
    private progressCallback: ProgressCallback | null = null;

    getIsSyncing(): boolean {
        return this.isSyncing;
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
        // eslint-disable-next-line no-console
        console.log('[MongoDBSyncService.sync] Starting sync for userId:', userId, 'options:', options);
        this.syncQueue = this.syncQueue
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('[MongoDBSyncService.sync] Executing performSync...');
                return this.performSync(userId, options);
            })
            .catch((error) => {
                console.error('[MongoDBSyncService.sync] Sync failed:', error);
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
            // eslint-disable-next-line no-console
            console.log('[MongoDBSyncService.performSync] Using Prisma Client, setting userId...');
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

            // eslint-disable-next-line no-console
            console.log('[MongoDBSyncService.performSync] Syncing independent tables:', independentTables);
            // Use Promise.allSettled instead of Promise.all to prevent one failure from stopping others
            const independentPromises = independentTables.map(async (table) => {
                // eslint-disable-next-line no-console
                console.log(`[MongoDBSyncService.performSync] Syncing table: ${table}`);
                try {
                    const result = await this.syncTable(validatedUserId, table, direction, options);
                    this.updateProgress({
                        completedTables: results.length + 1,
                        percentage: Math.round(((results.length + 1) / tables.length) * 100),
                    });
                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`[MongoDBSyncService.performSync] Error syncing table ${table}:`, errorMessage);
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
                        console.error('Failed to log sync error:', logError);
                    });
                    return errorResult;
                }
            });
            const independentResults = await Promise.all(independentPromises);
            results.push(...independentResults);
            // eslint-disable-next-line no-console
            console.log('[MongoDBSyncService.performSync] Independent tables synced, results:', independentResults);

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
                        console.error('Failed to log sync error:', logError);
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
                        console.error('Failed to log sync error:', logError);
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
                    console.error('Failed to log sync summary error:', logError);
                }

                errorLogService.syncToMongoDB(validatedUserId).catch((syncError) => {
                    console.error('Failed to sync error logs to MongoDB:', syncError);
                });
            }
        } catch (error) {
            console.error('[MongoDBSyncService.performSync] Sync error:', error);
            this.isSyncing = false;
            this.currentProgress = null;
            throw error;
        } finally {
            this.isSyncing = false;
            this.currentProgress = null;
            // eslint-disable-next-line no-console
            console.log('[MongoDBSyncService.performSync] Sync completed, results count:', results.length);
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

                    await this.applyRemoteRecord(validatedUserId, tableName, remoteRecord);
                    result.recordsProcessed++;
                    result.recordsCreated++;
                    this.updateProgress({
                        recordsProcessed: result.recordsProcessed,
                    });
                } catch (error) {
                    const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
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
                    console.error('Failed to log sync error:', logError);
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
                console.error('Failed to log sync error:', logError);
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

        // eslint-disable-next-line no-console
        console.log(`[MongoDBSyncService.syncPush] Starting push sync for table: ${tableName}, userId: ${validatedUserId}`);

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
            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Fetching local records for ${tableName}...`);
            const allLocalRecords = await this.fetchLocalRecords(userId, tableName);
            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Fetched ${allLocalRecords.length} local records`);
            
            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Fetching remote records for ${tableName}...`);
            const allRemoteRecords = await this.fetchRemoteRecords(validatedUserId, tableName);
            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Fetched ${allRemoteRecords.length} remote records`);
            
            const remoteMap = new Map<string | number, Record<string, unknown>>();
            for (const remoteRecord of allRemoteRecords) {
                const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
                remoteMap.set(recordId, remoteRecord as Record<string, unknown>);
            }
            
            const recordsToPush: unknown[] = [];
            
            for (const localRecord of allLocalRecords) {
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);
                const remoteRecord = remoteMap.get(recordId);
                
                if (!remoteRecord) {
                    recordsToPush.push(localRecord);
                } else {
                    const localUpdatedAt = this.getUpdatedAt(localRecord as Record<string, unknown>);
                    const remoteUpdatedAt = this.getUpdatedAt(remoteRecord);
                    
                    const localVersion = (localRecord as Record<string, unknown>).version as number | undefined;
                    const remoteVersion = remoteRecord.version as number | undefined;
                    
                    const needsUpdate = 
                        (localVersion && remoteVersion && localVersion > remoteVersion) ||
                        (!localVersion && !remoteVersion && localUpdatedAt > remoteUpdatedAt) ||
                        (localVersion && !remoteVersion);
                    
                    if (needsUpdate) {
                        recordsToPush.push(localRecord);
                    }
                }
            }

            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Found ${recordsToPush.length} records to push to ${tableName}`);

            this.updateProgress({
                currentOperation: `Pushing ${recordsToPush.length} records to ${tableName}...`,
                totalRecords: recordsToPush.length,
            });

            const batches = this.chunkArray(recordsToPush, options.batchSize || BATCH_SIZE);
            // eslint-disable-next-line no-console
            console.log(`[MongoDBSyncService.syncPush] Split into ${batches.length} batches`);

            for (const batch of batches) {
                try {
                    // eslint-disable-next-line no-console
                    console.log(`[MongoDBSyncService.syncPush] Pushing batch of ${batch.length} records to ${tableName}...`);
                    const batchResult = await this.pushBatch(validatedUserId, tableName, batch);
                    // eslint-disable-next-line no-console
                    console.log(`[MongoDBSyncService.syncPush] Batch result:`, batchResult);
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
                        console.error('Failed to log sync error:', logError);
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
                console.error('Failed to log sync error:', logError);
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

        // eslint-disable-next-line no-console
        console.debug(`[MongoDBSyncService.fetchRemoteRecords] Fetching ${tableName} for userId: ${validatedUserId}`, since ? `since ${since.toISOString()}` : '');
        
        const baseFilter = userScopedFilter(validatedUserId, tableName);
        
        // Add updatedAt filter if since is provided
        const where = since 
            ? { ...baseFilter, updatedAt: { gt: since } }
            : baseFilter;
        
        let records: unknown[] = [];

        try {
            switch (tableName) {
                case 'workouts':
                    records = await prisma.workout.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'exercises':
                    records = await prisma.exercise.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'workout_templates':
                    records = await prisma.workoutTemplate.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'planned_workouts':
                    records = await prisma.plannedWorkout.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'muscle_statuses':
                    records = await prisma.muscleStatus.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'user_profiles':
                    records = await prisma.userProfile.findMany({
                        where: where as never,
                    });
                    break;
                case 'settings':
                    records = await prisma.setting.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'notifications':
                    records = await prisma.notification.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'sleep_logs':
                    records = await prisma.sleepLog.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'recovery_logs':
                    records = await prisma.recoveryLog.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                case 'error_logs':
                    records = await prisma.errorLog.findMany({
                        where: where as never,
                        orderBy: { updatedAt: 'asc' },
                    });
                    break;
                default:
                    records = [];
            }
        } catch (error) {
            console.error(`[MongoDBSyncService.fetchRemoteRecords] Error fetching ${tableName}:`, error);
            records = [];
        }

        // eslint-disable-next-line no-console
        console.debug(`[MongoDBSyncService.fetchRemoteRecords] Fetched ${records.length} records for ${tableName} (userId: ${validatedUserId})`);

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
        const localRecord = await this.getLocalRecord(userId, tableName, this.getRecordId(remoteRecord as Record<string, unknown>, tableName));

        if (!localRecord) return false;

        const conflictInfo = versionManager.detectConflict(
            tableName,
            this.getRecordId(remoteRecord as Record<string, unknown>, tableName),
            localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
            remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
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
    ): Promise<void> {
        const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
        const localRecord = await this.getLocalRecord(userId, tableName, recordId);

        if (localRecord) {
            const conflictInfo = versionManager.detectConflict(
                tableName,
                recordId,
                localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
            );

            if (conflictInfo.hasConflict) {
                const resolved = versionManager.resolveConflictLastWriteWins(
                    localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                    remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                );
                await this.updateLocalRecord(userId, tableName, resolved);
            } else if (versionManager.compareVersions(
                localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
            ) < 0) {
                await this.updateLocalRecord(userId, tableName, remoteRecord);
            }
        } else {
            await this.createLocalRecord(userId, tableName, remoteRecord);
        }
    }

    private async createLocalRecord(
        _userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Promise<void> {
        const converted = this.convertFromMongoFormat(tableName, remoteRecord);

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
        remoteRecord: unknown
    ): Promise<void> {
        const converted = this.convertFromMongoFormat(tableName, remoteRecord);
        const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);

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

        // eslint-disable-next-line no-console
        console.log(`[MongoDBSyncService.pushBatch] Processing batch of ${batch.length} records for ${tableName}`);

        const result = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            conflicts: 0,
            errors: [] as SyncError[],
        };

        // eslint-disable-next-line no-console
        console.log(`[MongoDBSyncService.pushBatch] Processing ${tableName} with Prisma`);

        for (const localRecord of batch) {
            try {
                const mongoRecord = this.convertToMongoFormat(tableName, localRecord, validatedUserId);
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);

                // Build where clause based on table type to find existing record
                // For workouts/error_logs: use userId + other unique fields since ID format may differ
                // For other tables: use their unique identifiers
                const where: Record<string, unknown> = userScopedFilter(validatedUserId, tableName);
                
                // Helper function to check if a string is a valid MongoDB ObjectID (24 hex chars)
                const isValidObjectId = (id: string): boolean => {
                    return /^[0-9a-fA-F]{24}$/.test(id);
                };

                // Add ID filter based on table structure
                // Note: For workouts/error_logs, we can't reliably use numeric IDs to find ObjectId strings
                // So we'll search by userId + other unique fields, or try to find by ID if it's a valid ObjectID
                if (tableName === 'workouts') {
                    // For workouts, try to find by id if it's a valid ObjectID, otherwise search by userId + date
                    const idToCheck = (mongoRecord.id && typeof mongoRecord.id === 'string') 
                        ? mongoRecord.id 
                        : (typeof recordId === 'string' ? recordId : null);
                    
                    if (idToCheck && isValidObjectId(idToCheck)) {
                        // Valid ObjectID format - use it for lookup
                        where.id = idToCheck;
                    } else {
                        // Not a valid ObjectID (e.g., "wkt-..." format) - use userId + date instead
                        if (mongoRecord.date) {
                            where.date = mongoRecord.date;
                        }
                    }
                } else if (tableName === 'error_logs') {
                    // For error_logs, try to find by id if it's a valid ObjectID, otherwise search by userId + errorMessage + createdAt
                    const errorIdToCheck = (mongoRecord.id && typeof mongoRecord.id === 'string') 
                        ? mongoRecord.id 
                        : (typeof recordId === 'string' ? recordId : null);
                    
                    if (errorIdToCheck && isValidObjectId(errorIdToCheck)) {
                        // Valid ObjectID format - use it for lookup
                        where.id = errorIdToCheck;
                    } else {
                        // Not a valid ObjectID - use userId + errorMessage + createdAt
                        if (mongoRecord.errorMessage) {
                            where.errorMessage = mongoRecord.errorMessage;
                        }
                        if (mongoRecord.createdAt) {
                            where.createdAt = mongoRecord.createdAt;
                        }
                    }
                } else if (tableName === 'user_profiles') {
                    // user_profiles uses userId as primary key
                    where.userId = validatedUserId;
                } else if (tableName === 'muscle_statuses') {
                    where.muscle = (mongoRecord as Record<string, unknown>).muscle;
                } else if (tableName === 'settings') {
                    where.key = (mongoRecord as Record<string, unknown>).key;
                } else if (tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                    where.date = (mongoRecord as Record<string, unknown>).date;
                } else if (tableName === 'exercises') {
                    where.exerciseId = mongoRecord.exerciseId || recordId;
                } else if (tableName === 'workout_templates') {
                    where.templateId = mongoRecord.templateId || recordId;
                } else if (tableName === 'planned_workouts') {
                    where.plannedWorkoutId = mongoRecord.plannedWorkoutId || recordId;
                } else if (tableName === 'notifications') {
                    where.notificationId = mongoRecord.notificationId || recordId;
                } else {
                    // Fallback - only use ID if it's a valid ObjectID
                    const fallbackId = (mongoRecord.id && typeof mongoRecord.id === 'string') 
                        ? mongoRecord.id 
                        : (typeof recordId === 'string' ? recordId : null);
                    
                    if (fallbackId && isValidObjectId(fallbackId)) {
                        where.id = fallbackId;
                    }
                }
                
                // Fetch existing record using Prisma
                // eslint-disable-next-line no-console
                console.log(`[MongoDBSyncService.pushBatch] Looking for existing ${tableName} record with where:`, JSON.stringify(where, null, 2));
                let existing: unknown = null;
                try {
                    switch (tableName) {
                        case 'workouts':
                            existing = await prisma.workout.findFirst({ where: where as never });
                            break;
                        case 'exercises':
                            existing = await prisma.exercise.findFirst({ where: where as never });
                            break;
                        case 'workout_templates':
                            existing = await prisma.workoutTemplate.findFirst({ where: where as never });
                            break;
                        case 'planned_workouts':
                            existing = await prisma.plannedWorkout.findFirst({ where: where as never });
                            break;
                        case 'muscle_statuses':
                            existing = await prisma.muscleStatus.findFirst({ where: where as never });
                            break;
                        case 'user_profiles':
                            existing = await prisma.userProfile.findFirst({ where: where as never });
                            break;
                        case 'settings':
                            existing = await prisma.setting.findFirst({ where: where as never });
                            break;
                        case 'notifications':
                            existing = await prisma.notification.findFirst({ where: where as never });
                            break;
                        case 'sleep_logs':
                            existing = await prisma.sleepLog.findFirst({ where: where as never });
                            break;
                        case 'recovery_logs':
                            existing = await prisma.recoveryLog.findFirst({ where: where as never });
                            break;
                        case 'error_logs':
                            existing = await prisma.errorLog.findFirst({ where: where as never });
                            break;
                    }
                    // eslint-disable-next-line no-console
                    console.log(`[MongoDBSyncService.pushBatch] findFirst result for ${tableName} ${recordId}:`, existing ? 'FOUND' : 'NOT FOUND');
                    if (existing && tableName === 'workouts') {
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Found workout with id: ${(existing as Record<string, unknown>).id}, date: ${(existing as Record<string, unknown>).date}`);
                    }
                } catch (findError) {
                    const errorMessage = findError instanceof Error ? findError.message : 'Unknown error';
                    console.error(`[MongoDBSyncService.pushBatch] Error finding existing record for ${tableName} ${recordId}:`, errorMessage);
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
                        console.error('Failed to log sync error:', logError);
                    });
                    continue; // Skip to next record if we can't find existing
                }

                if (existing) {
                    // Validate that existing is a proper record object, not a response wrapper
                    // Check if it looks like a response wrapper (e.g., { success: true })
                    const existingObj = existing as Record<string, unknown>;
                    if (Object.keys(existingObj).length === 1 && 'success' in existingObj) {
                        // This is likely a response wrapper, not an actual record
                        console.warn(`[MongoDBSyncService.pushBatch] Received response wrapper instead of record for ${tableName} ${recordId}, treating as not found`);
                        existing = null;
                    }
                }

                if (existing) {
                    // Extract existingId early so it's available in all code paths
                    const existingId = (existing as Record<string, unknown>).id;
                    
                    // eslint-disable-next-line no-console
                    console.log(`[MongoDBSyncService.pushBatch] Found existing record for ${tableName} ${recordId}, existing version: ${(existing as { version?: number }).version || 1}, local version: ${(localRecord as { version?: number }).version || 1}`);
                    
                    if (tableName === 'workouts') {
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Workout existing record keys:`, Object.keys(existing as Record<string, unknown>));
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Workout existingId extracted:`, existingId, `type:`, typeof existingId);
                        if (!existingId) {
                            console.error(`[MongoDBSyncService.pushBatch] Workout existing record (no id):`, JSON.stringify(existing, null, 2));
                        }
                    }
                    
                    const conflictInfo = versionManager.detectConflict(
                        tableName,
                        recordId,
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    );

                    if (conflictInfo.hasConflict) {
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Conflict detected for ${tableName} record ${recordId}, pushing local data to remote`);
                        
                        // For push operations, always push local data to remote
                        // Conflict resolution (last-write-wins) will be handled on pull
                        const resolvedRecord = this.convertToMongoFormat(tableName, localRecord, validatedUserId);
                        
                        // Preserve id if it exists (for workouts/error_logs that use ObjectId)
                        // Use the existingId we extracted earlier
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            resolvedRecord.id = existingId;
                        }
                        
                        // Update with version increment
                        // Calculate new version manually (Prisma increment might not work with MongoDB)
                        const existingVersion = (existing as { version?: number }).version || 1;
                        const newVersion = existingVersion + 1;
                        const updateData: Record<string, unknown> = {
                            ...resolvedRecord,
                            version: newVersion, // Use calculated version instead of increment
                            updatedAt: getCurrentLocalDate(), // Use current local date/time
                        };
                        // Remove id from update data (will be used in where clause instead)
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete updateData.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete updateData.id;
                        }
                        delete updateData.createdAt; // Don't update createdAt
                        
                        // Use upsert directly to handle both update and create cases
                        const upsertData = { ...resolvedRecord };
                        // Remove id from upsert data for tables that auto-generate it
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete upsertData.id;
                        }
                        // Remove id for composite key tables
                        if (tableName === 'muscle_statuses' || tableName === 'settings' || 
                            tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                            delete upsertData.id;
                        }
                        // For user_profiles, never include id field (uses userId as primary key)
                        if (tableName === 'user_profiles') {
                            delete upsertData.id;
                        }
                        
                        try {
                            // eslint-disable-next-line no-console
                            console.log(`[MongoDBSyncService.pushBatch] Attempting to upsert ${tableName} record ${recordId}`);
                            // eslint-disable-next-line no-console
                            console.log(`[MongoDBSyncService.pushBatch] existingId: ${existingId}, updateData keys: ${Object.keys(updateData).join(', ')}`);
                            switch (tableName) {
                                case 'workouts': {
                                    // For workouts, we need the existingId to update
                                    // Use the existingId we extracted earlier (before conflict detection)
                                    // eslint-disable-next-line no-console
                                    console.log(`[MongoDBSyncService.pushBatch] Workout conflict resolution - existingId: ${existingId}, type: ${typeof existingId}`);
                                    
                                    if (!existingId) {
                                        console.error(`[MongoDBSyncService.pushBatch] No existingId for workout ${recordId}, existing record keys:`, Object.keys(existing as Record<string, unknown>));
                                        console.error(`[MongoDBSyncService.pushBatch] Existing record:`, JSON.stringify(existing, null, 2));
                                        
                                        // The existing record should have an id if it came from MongoDB
                                        // If it doesn't, this is a data integrity issue
                                        // Try to use the existing record's _id field (MongoDB native)
                                        const mongoId = (existing as Record<string, unknown>)._id || (existing as Record<string, unknown>).id;
                                        if (mongoId) {
                                            // eslint-disable-next-line no-console
                                            console.log(`[MongoDBSyncService.pushBatch] Using _id field as fallback: ${mongoId}`);
                                            const workoutResult = await prisma.workout.upsert({ 
                                                where: { id: String(mongoId) }, 
                                                update: updateData as never, 
                                                create: upsertData as never 
                                            });
                                            // eslint-disable-next-line no-console
                                            console.log(`[MongoDBSyncService.pushBatch] Workout upsert result (using _id):`, workoutResult.id);
                                        } else {
                                            // Last resort: try to find by userId + date
                                            const workoutWhere = userScopedFilter(validatedUserId, 'workouts') as Record<string, unknown>;
                                            if (mongoRecord.date) {
                                                // Ensure date is a Date object for comparison
                                                const workoutDate = mongoRecord.date instanceof Date 
                                                    ? mongoRecord.date 
                                                    : new Date(mongoRecord.date as string | number);
                                                workoutWhere.date = workoutDate;
                                            }
                                            // eslint-disable-next-line no-console
                                            console.log(`[MongoDBSyncService.pushBatch] Attempting fallback query by date:`, workoutWhere);
                                            const foundWorkout = await prisma.workout.findFirst({ where: workoutWhere as never });
                                            if (foundWorkout && (foundWorkout as Record<string, unknown>).id) {
                                                const fallbackId = (foundWorkout as Record<string, unknown>).id;
                                                // eslint-disable-next-line no-console
                                                console.log(`[MongoDBSyncService.pushBatch] Found workout by date fallback, using id: ${fallbackId}`);
                                                const workoutResult = await prisma.workout.upsert({ 
                                                    where: { id: String(fallbackId) }, 
                                                    update: updateData as never, 
                                                    create: upsertData as never 
                                                });
                                                // eslint-disable-next-line no-console
                                                console.log(`[MongoDBSyncService.pushBatch] Workout upsert result (fallback):`, workoutResult.id);
                                            } else {
                                                console.error(`[MongoDBSyncService.pushBatch] Could not find workout by date fallback, foundWorkout:`, foundWorkout);
                                                throw new Error(`No existingId for workout ${recordId} and could not find by date`);
                                            }
                                        }
                                    } else {
                                        const workoutResult = await prisma.workout.upsert({ 
                                            where: { id: String(existingId) }, 
                                            update: updateData as never, 
                                            create: upsertData as never 
                                        });
                                        // eslint-disable-next-line no-console
                                        console.log(`[MongoDBSyncService.pushBatch] Workout upsert result:`, workoutResult.id);
                                    }
                                    break;
                                }
                                case 'exercises':
                                    await prisma.exercise.upsert({ 
                                        where: { exerciseId: (where.exerciseId as string) || 'new' }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'workout_templates':
                                    await prisma.workoutTemplate.upsert({ 
                                        where: { templateId: (where.templateId as string) || 'new' }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'planned_workouts':
                                    await prisma.plannedWorkout.upsert({ 
                                        where: { plannedWorkoutId: (where.plannedWorkoutId as string) || 'new' }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'muscle_statuses':
                                    await prisma.muscleStatus.upsert({ 
                                        where: { userId_muscle: { userId: validatedUserId, muscle: (where.muscle as string) || '' } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'user_profiles':
                                    await prisma.userProfile.upsert({ 
                                        where: { userId: validatedUserId }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'settings': {
                                    const settingKey = (where.key as string) || (mongoRecord.key as string);
                                    if (!settingKey) {
                                        console.error(`[MongoDBSyncService.pushBatch] Invalid key for setting ${recordId}`);
                                        throw new Error(`Invalid key for setting ${recordId}`);
                                    }
                                    await prisma.setting.upsert({ 
                                        where: { userId_key: { userId: validatedUserId, key: settingKey } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'notifications': {
                                    const notificationId = (where.notificationId as string) || (mongoRecord.notificationId as string) || recordId;
                                    if (!notificationId || notificationId === 'new') {
                                        console.error(`[MongoDBSyncService.pushBatch] Invalid notificationId for notification ${recordId}`);
                                        throw new Error(`Invalid notificationId for notification ${recordId}`);
                                    }
                                    await prisma.notification.upsert({ 
                                        where: { notificationId: notificationId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'sleep_logs':
                                    await prisma.sleepLog.upsert({ 
                                        where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'recovery_logs':
                                    await prisma.recoveryLog.upsert({ 
                                        where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'error_logs':
                                    await prisma.errorLog.upsert({ 
                                        where: { id: (existingId as string) || 'new' }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                            }
                            // eslint-disable-next-line no-console
                            console.log(`[MongoDBSyncService.pushBatch] Successfully resolved conflict and updated ${tableName} record ${recordId}`);
                            result.recordsUpdated++;
                            result.conflicts++;
                        } catch (upsertError) {
                            const errorMessage = upsertError instanceof Error ? upsertError.message : 'Unknown error';
                            console.error(`[MongoDBSyncService.pushBatch] Error upserting conflict-resolved record for ${tableName} ${recordId}:`, errorMessage);
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
                                console.error('Failed to log sync error:', logError);
                            });
                        }
                    } else if (versionManager.compareVersions(
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    ) > 0) {
                        // Local record is newer, update remote
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Local record is newer for ${tableName} ${recordId}, updating remote`);
                        // Preserve id if it exists (for workouts/error_logs that use ObjectId)
                        // existingId was extracted earlier, reuse it
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            mongoRecord.id = existingId;
                        }
                        
                        // Update with version increment
                        // Calculate new version manually (Prisma increment might not work with MongoDB)
                        const existingVersion = (existing as { version?: number }).version || 1;
                        const newVersion = existingVersion + 1;
                        const updateData: Record<string, unknown> = {
                            ...mongoRecord,
                            version: newVersion, // Use calculated version instead of increment
                            updatedAt: getCurrentLocalDate(), // Use current local date/time
                        };
                        // Remove id from update data (will be used in where clause instead)
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete updateData.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete updateData.id;
                        }
                        delete updateData.createdAt; // Don't update createdAt
                        
                        // Use upsert directly to handle both update and create cases
                        const upsertData = { ...mongoRecord };
                        // Remove id from upsert data for tables that auto-generate it
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete upsertData.id;
                        }
                        // Remove id for composite key tables
                        if (tableName === 'muscle_statuses' || tableName === 'settings' || 
                            tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                            delete upsertData.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete upsertData.id;
                        }
                        
                        switch (tableName) {
                            case 'workouts': {
                                // For workouts, we need the existingId to update
                                const workoutExistingId = existingId || (existing as Record<string, unknown>).id;
                                if (!workoutExistingId) {
                                    // Try to find by userId + date as fallback
                                    const workoutWhere = userScopedFilter(validatedUserId, 'workouts');
                                    if (mongoRecord.date) {
                                        workoutWhere.date = mongoRecord.date;
                                    }
                                    const foundWorkout = await prisma.workout.findFirst({ where: workoutWhere as never });
                                    if (foundWorkout && (foundWorkout as Record<string, unknown>).id) {
                                        const fallbackId = (foundWorkout as Record<string, unknown>).id;
                                        await prisma.workout.upsert({ 
                                            where: { id: fallbackId as string }, 
                                            update: updateData as never, 
                                            create: upsertData as never 
                                        });
                                    } else {
                                        throw new Error(`No existingId for workout ${recordId} and could not find by date`);
                                    }
                                } else {
                                    await prisma.workout.upsert({ 
                                        where: { id: workoutExistingId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                }
                                break;
                            }
                            case 'exercises':
                                await prisma.exercise.upsert({ 
                                    where: { exerciseId: (where.exerciseId as string) || 'new' }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'workout_templates':
                                await prisma.workoutTemplate.upsert({ 
                                    where: { templateId: (where.templateId as string) || 'new' }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'planned_workouts':
                                await prisma.plannedWorkout.upsert({ 
                                    where: { plannedWorkoutId: (where.plannedWorkoutId as string) || 'new' }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'muscle_statuses':
                                await prisma.muscleStatus.upsert({ 
                                    where: { userId_muscle: { userId: validatedUserId, muscle: (where.muscle as string) || '' } }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'user_profiles':
                                await prisma.userProfile.upsert({ 
                                    where: { userId: validatedUserId }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'settings':
                                await prisma.setting.upsert({ 
                                    where: { userId_key: { userId: validatedUserId, key: (where.key as string) || '' } }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'notifications':
                                await prisma.notification.upsert({ 
                                    where: { notificationId: (where.notificationId as string) || 'new' }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'sleep_logs':
                                await prisma.sleepLog.upsert({ 
                                    where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'recovery_logs':
                                await prisma.recoveryLog.upsert({ 
                                    where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                            case 'error_logs':
                                await prisma.errorLog.upsert({ 
                                    where: { id: (existingId as string) || 'new' }, 
                                    update: updateData as never, 
                                    create: upsertData as never 
                                });
                                break;
                        }
                        result.recordsUpdated++;
                    } else {
                        // Remote record is newer or same, but for push operations, we still push local data
                        // Conflict resolution (last-write-wins) will be handled on pull
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Remote record is newer or same for ${tableName} ${recordId}, but pushing local data anyway (push operation)`);
                        
                        // Preserve id if it exists (for workouts/error_logs that use ObjectId)
                        // existingId was extracted earlier, reuse it
                        if (existingId && (tableName === 'workouts' || tableName === 'error_logs')) {
                            mongoRecord.id = existingId;
                        }
                        
                        // Update with version increment
                        // Calculate new version manually (Prisma increment might not work with MongoDB)
                        const existingVersion = (existing as { version?: number }).version || 1;
                        const newVersion = existingVersion + 1;
                        const updateData: Record<string, unknown> = {
                            ...mongoRecord,
                            version: newVersion, // Use calculated version instead of increment
                            updatedAt: getCurrentLocalDate(), // Use current local date/time
                        };
                        // Remove id from update data (will be used in where clause instead)
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete updateData.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete updateData.id;
                        }
                        delete updateData.createdAt; // Don't update createdAt
                        
                        // Use upsert directly to handle both update and create cases
                        const upsertData = { ...mongoRecord };
                        // Remove id from upsert data for tables that auto-generate it
                        if (tableName === 'workouts' || tableName === 'error_logs') {
                            delete upsertData.id;
                        }
                        // Remove id for composite key tables
                        if (tableName === 'muscle_statuses' || tableName === 'settings' || 
                            tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                            delete upsertData.id;
                        }
                        // For user_profiles, never include id field
                        if (tableName === 'user_profiles') {
                            delete upsertData.id;
                        }
                        
                        try {
                            // eslint-disable-next-line no-console
                            console.log(`[MongoDBSyncService.pushBatch] Attempting to upsert ${tableName} record ${recordId} (remote newer but pushing local)`);
                            switch (tableName) {
                                case 'workouts': {
                                    // For workouts, we need the existingId to update
                                    const workoutExistingId = existingId || (existing as Record<string, unknown>).id;
                                    if (!workoutExistingId) {
                                        // Try to find by userId + date as fallback
                                        const workoutWhere = userScopedFilter(validatedUserId, 'workouts') as Record<string, unknown>;
                                        if (mongoRecord.date) {
                                            const workoutDate = mongoRecord.date instanceof Date 
                                                ? mongoRecord.date 
                                                : new Date(mongoRecord.date as string | number);
                                            workoutWhere.date = workoutDate;
                                        }
                                        const foundWorkout = await prisma.workout.findFirst({ where: workoutWhere as never });
                                        if (foundWorkout && (foundWorkout as Record<string, unknown>).id) {
                                            const fallbackId = (foundWorkout as Record<string, unknown>).id;
                                            await prisma.workout.upsert({ 
                                                where: { id: fallbackId as string }, 
                                                update: updateData as never, 
                                                create: upsertData as never 
                                            });
                                        } else {
                                            throw new Error(`No existingId for workout ${recordId} and could not find by date`);
                                        }
                                    } else {
                                        await prisma.workout.upsert({ 
                                            where: { id: workoutExistingId as string }, 
                                            update: updateData as never, 
                                            create: upsertData as never 
                                        });
                                    }
                                    break;
                                }
                                case 'exercises': {
                                    const exerciseId = (where.exerciseId as string) || (mongoRecord.exerciseId as string) || recordId;
                                    if (!exerciseId || exerciseId === 'new') {
                                        throw new Error(`Invalid exerciseId for exercise ${recordId}`);
                                    }
                                    await prisma.exercise.upsert({ 
                                        where: { exerciseId: exerciseId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'workout_templates': {
                                    const templateId = (where.templateId as string) || (mongoRecord.templateId as string) || recordId;
                                    if (!templateId || templateId === 'new') {
                                        throw new Error(`Invalid templateId for template ${recordId}`);
                                    }
                                    await prisma.workoutTemplate.upsert({ 
                                        where: { templateId: templateId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'planned_workouts': {
                                    const plannedWorkoutId = (where.plannedWorkoutId as string) || (mongoRecord.plannedWorkoutId as string) || recordId;
                                    if (!plannedWorkoutId || plannedWorkoutId === 'new') {
                                        throw new Error(`Invalid plannedWorkoutId for planned workout ${recordId}`);
                                    }
                                    await prisma.plannedWorkout.upsert({ 
                                        where: { plannedWorkoutId: plannedWorkoutId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'muscle_statuses':
                                    await prisma.muscleStatus.upsert({ 
                                        where: { userId_muscle: { userId: validatedUserId, muscle: (where.muscle as string) || '' } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'user_profiles':
                                    await prisma.userProfile.upsert({ 
                                        where: { userId: validatedUserId }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'settings': {
                                    const settingKey = (where.key as string) || (mongoRecord.key as string);
                                    if (!settingKey) {
                                        throw new Error(`Invalid key for setting ${recordId}`);
                                    }
                                    await prisma.setting.upsert({ 
                                        where: { userId_key: { userId: validatedUserId, key: settingKey } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'notifications': {
                                    const notificationId = (where.notificationId as string) || (mongoRecord.notificationId as string) || recordId;
                                    if (!notificationId || notificationId === 'new') {
                                        throw new Error(`Invalid notificationId for notification ${recordId}`);
                                    }
                                    await prisma.notification.upsert({ 
                                        where: { notificationId: notificationId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                                case 'sleep_logs':
                                    await prisma.sleepLog.upsert({ 
                                        where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'recovery_logs':
                                    await prisma.recoveryLog.upsert({ 
                                        where: { userId_date: { userId: validatedUserId, date: (where.date as Date) || new Date() } }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                case 'error_logs': {
                                    if (!existingId) {
                                        throw new Error(`No existingId for error log ${recordId}`);
                                    }
                                    await prisma.errorLog.upsert({ 
                                        where: { id: existingId as string }, 
                                        update: updateData as never, 
                                        create: upsertData as never 
                                    });
                                    break;
                                }
                            }
                            // eslint-disable-next-line no-console
                            console.log(`[MongoDBSyncService.pushBatch] Successfully pushed local data for ${tableName} record ${recordId} (remote was newer)`);
                            result.recordsUpdated++;
                            result.conflicts++;
                        } catch (upsertError) {
                            const errorMessage = upsertError instanceof Error ? upsertError.message : 'Unknown error';
                            console.error(`[MongoDBSyncService.pushBatch] Error upserting record for ${tableName} ${recordId} (remote newer case):`, errorMessage);
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
                                console.error('Failed to log sync error:', logError);
                            });
                        }
                    }
                } else {
                    // No existing record - create new record
                    // Remove id from mongoRecord for create operations (let MongoDB generate it)
                    const createData = { ...mongoRecord };
                    if (tableName === 'workouts' || tableName === 'error_logs') {
                        delete createData.id;
                    }
                    // Remove id for composite key tables
                    if (tableName === 'muscle_statuses' || tableName === 'settings' || 
                        tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                        delete createData.id;
                    }
                    // For user_profiles, never include id field (uses userId as primary key)
                    if (tableName === 'user_profiles') {
                        delete createData.id;
                    }
                    // eslint-disable-next-line no-console
                    console.log(`[MongoDBSyncService.pushBatch] Creating new record in ${tableName}:`, createData);
                    
                    try {
                        switch (tableName) {
                            case 'workouts':
                                await prisma.workout.create({ 
                                    data: createData as never 
                                });
                                // eslint-disable-next-line no-console
                                console.log(`[MongoDBSyncService.pushBatch] Successfully created workout record`);
                                break;
                            case 'exercises': {
                                const exerciseId = (mongoRecord.exerciseId as string) || recordId;
                                if (!exerciseId || exerciseId === 'new') {
                                    throw new Error(`Invalid exerciseId for exercise ${recordId}`);
                                }
                                await prisma.exercise.create({ 
                                    data: createData as never 
                                });
                                break;
                            }
                            case 'workout_templates': {
                                const templateId = (mongoRecord.templateId as string) || recordId;
                                if (!templateId || templateId === 'new') {
                                    throw new Error(`Invalid templateId for template ${recordId}`);
                                }
                                await prisma.workoutTemplate.create({ 
                                    data: createData as never 
                                });
                                break;
                            }
                            case 'planned_workouts': {
                                const plannedWorkoutId = (mongoRecord.plannedWorkoutId as string) || recordId;
                                if (!plannedWorkoutId || plannedWorkoutId === 'new') {
                                    throw new Error(`Invalid plannedWorkoutId for planned workout ${recordId}`);
                                }
                                await prisma.plannedWorkout.create({ 
                                    data: createData as never 
                                });
                                break;
                            }
                            case 'muscle_statuses':
                                await prisma.muscleStatus.create({ 
                                    data: createData as never 
                                });
                                break;
                            case 'user_profiles':
                                await prisma.userProfile.create({ 
                                    data: createData as never 
                                });
                                break;
                            case 'settings': {
                                const settingKey = (mongoRecord.key as string);
                                if (!settingKey) {
                                    throw new Error(`Invalid key for setting ${recordId}`);
                                }
                                await prisma.setting.create({ 
                                    data: createData as never 
                                });
                                break;
                            }
                            case 'notifications': {
                                const notificationId = (mongoRecord.notificationId as string) || recordId;
                                if (!notificationId || notificationId === 'new') {
                                    throw new Error(`Invalid notificationId for notification ${recordId}`);
                                }
                                await prisma.notification.create({ 
                                    data: createData as never 
                                });
                                break;
                            }
                            case 'sleep_logs':
                                await prisma.sleepLog.create({ 
                                    data: createData as never 
                                });
                                break;
                            case 'recovery_logs':
                                await prisma.recoveryLog.create({ 
                                    data: createData as never 
                                });
                                break;
                            case 'error_logs':
                                await prisma.errorLog.create({ 
                                    data: createData as never 
                                });
                                break;
                        }
                        // eslint-disable-next-line no-console
                        console.log(`[MongoDBSyncService.pushBatch] Successfully created record in ${tableName}`);
                        result.recordsCreated++;
                    } catch (createError) {
                        const errorMessage = createError instanceof Error ? createError.message : 'Unknown error';
                        console.error(`[MongoDBSyncService.pushBatch] Error creating new record for ${tableName} ${recordId}:`, errorMessage);
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
                            console.error('Failed to log sync error:', logError);
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
                    console.error('Failed to log sync error:', logError);
                });
            }
        }

        return result;
    }

    private convertToMongoFormat(
        tableName: SyncableTable,
        localRecord: unknown,
        userId: string
    ): Record<string, unknown> {
        const record = localRecord as Record<string, unknown>;
        
        // MongoDB already uses camelCase, so we mostly just need to ensure userId is set
        const base: Record<string, unknown> = {
            userId: userId,
            version: record.version ?? 1,
            deletedAt: record.deletedAt ? timestampToLocalDate(record.deletedAt as number | Date | string) : null,
        };
        
        // Convert date fields to local Date objects
        if (record.createdAt) {
            base.createdAt = timestampToLocalDate(record.createdAt as number | Date | string) || getCurrentLocalDate();
        }
        if (record.updatedAt) {
            base.updatedAt = timestampToLocalDate(record.updatedAt as number | Date | string) || getCurrentLocalDate();
        }

        // For most tables, we can pass through the record with userId set
        // Special handling for tables that need ID mapping
        switch (tableName) {
            case 'workouts': {
                // Workouts: preserve id as _id if it exists (for consistency)
                const workoutRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // If id exists and is a number, we can't use it as _id directly in MongoDB
                // MongoDB _id must be ObjectId or string. We'll let MongoDB generate _id
                // and store the original id in a separate field if needed, or just let it be
                // The id will be lost on first sync, but that's okay - we'll use _id going forward
                delete workoutRecord.id; // Remove id, MongoDB will generate _id
                return workoutRecord;
            }
            case 'exercises': {
                const exerciseRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Map id to exerciseId for Prisma
                if (record.id && !record.exerciseId) {
                    exerciseRecord.exerciseId = record.id;
                    delete exerciseRecord.id;
                }
                if (!record.isCustom) {
                    exerciseRecord.userId = null;
                }
                return exerciseRecord;
            }
            case 'workout_templates': {
                const templateRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Map id to templateId for Prisma
                if (record.id && !record.templateId) {
                    templateRecord.templateId = record.id;
                    delete templateRecord.id;
                }
                return templateRecord;
            }
            case 'planned_workouts': {
                const plannedRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Map id to plannedWorkoutId for Prisma
                if (record.id && !record.plannedWorkoutId) {
                    plannedRecord.plannedWorkoutId = record.id;
                    delete plannedRecord.id;
                }
                return plannedRecord;
            }
            case 'notifications': {
                const notificationRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Map id to notificationId for Prisma
                if (record.id && !record.notificationId) {
                    notificationRecord.notificationId = record.id;
                    delete notificationRecord.id;
                }
                return notificationRecord;
            }
            case 'user_profiles': {
                // user_profiles uses userId as primary key, never use id field
                const profileRecord: Record<string, unknown> = {
                    ...base,
                    userId: record.id || userId,
                    ...record,
                };
                // Remove id field - user_profiles uses userId as primary key, not id
                delete profileRecord.id;
                return profileRecord;
            }
            case 'muscle_statuses': {
                const muscleRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Remove id field - muscle_statuses uses composite key userId_muscle
                delete muscleRecord.id;
                return muscleRecord;
            }
            case 'settings': {
                const settingRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Remove id field - settings uses composite key userId_key
                delete settingRecord.id;
                return settingRecord;
            }
            case 'sleep_logs': {
                const sleepRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Remove id field - sleep_logs uses composite key userId_date
                delete sleepRecord.id;
                return sleepRecord;
            }
            case 'recovery_logs': {
                const recoveryRecord: Record<string, unknown> = {
                    ...base,
                    ...record,
                };
                // Remove id field - recovery_logs uses composite key userId_date
                delete recoveryRecord.id;
                return recoveryRecord;
            }
            default:
                return {
                    ...base,
                    ...record,
                };
        }
    }

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

