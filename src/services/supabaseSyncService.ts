import { SupabaseClient } from '@supabase/supabase-js';
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
// UserProfile type is defined in userStore but not exported, using inline type
type UserProfile = {
  id: string;
  name: string;
  [key: string]: unknown;
};
import { versionManager } from './versionManager';
import { errorRecovery } from './errorRecovery';
import { userContextManager } from './userContextManager';
import { db } from './database';
import { sleepRecoveryService } from './sleepRecoveryService';

const BATCH_SIZE = 100;

type ProgressCallback = (progress: SyncProgress) => void;

class SupabaseSyncService {
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
        // Queue sync operations to prevent race conditions
        // Each sync waits for the previous one to complete
        this.syncQueue = this.syncQueue.then(() => this.performSync(userId, options));
        return this.syncQueue;
    }

    private async performSync(
        userId: string,
        options: SyncOptions = {}
    ): Promise<SyncResult[]> {
        // Validate userId at the start
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
            const client = await getSupabaseClientWithAuth(validatedUserId);
            userContextManager.setUserId(validatedUserId);

            // Sync tables in parallel for independent tables
            const independentTables = tables.filter(t => 
                !['user_profiles', 'settings'].includes(t)
            );
            const dependentTables = tables.filter(t => 
                ['user_profiles', 'settings'].includes(t)
            );

            // Sync independent tables in parallel
            const independentResults = await Promise.all(
                independentTables.map(table => this.syncTable(client, userId, table, direction, options))
            );
            results.push(...independentResults);

            // Sync dependent tables sequentially
            for (const table of dependentTables) {
                this.updateProgress({
                    currentTable: table,
                    currentOperation: `Syncing ${table}...`,
                });

                try {
                    const result = await this.syncTable(client, userId, table, direction, options);
                    results.push(result);
                    this.updateProgress({
                        completedTables: results.length,
                        percentage: Math.round((results.length / tables.length) * 100),
                    });
                } catch (error) {
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
                                error: error instanceof Error ? error.message : 'Unknown error',
                                timestamp: new Date(),
                                operation: 'read',
                            },
                        ],
                        duration: 0,
                    };
                    results.push(errorResult);
                }
            }
        } finally {
            this.isSyncing = false;
            this.currentProgress = null;
        }

        return results;
    }

    private async syncBidirectional(
        client: SupabaseClient,
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        // Validate userId
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncBidirectional',
            additionalInfo: { tableName },
        });

        const startTime = Date.now();
        await syncMetadataService.updateSyncStatus(tableName, validatedUserId, 'syncing');

        try {
            const pullResult = await this.syncPull(client, validatedUserId, tableName, options);
            const pushResult = await this.syncPush(client, validatedUserId, tableName, options);

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
            
            // Only update last sync time if sync was successful
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
        client: SupabaseClient,
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        // Validate userId
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
                client,
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
                    result.errors.push({
                        tableName,
                        recordId: this.getRecordId(remoteRecord as Record<string, unknown>, tableName),
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date(),
                        operation: 'read',
                    });
                }
            }

            result.duration = Date.now() - startTime;
            
            // Only update last sync time if sync was successful
            if (result.status === 'success') {
                await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'pull');
            }
            
            return result;
        } catch (error) {
            result.status = 'error';
            result.errors.push({
                tableName,
                recordId: 'all',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
                operation: 'read',
            });
            result.duration = Date.now() - startTime;
            return result;
        }
    }

    private async syncPush(
        client: SupabaseClient,
        userId: string,
        tableName: SyncableTable,
        options: SyncOptions
    ): Promise<SyncResult> {
        // Validate userId
        const validatedUserId = requireUserId(userId, {
            functionName: 'syncPush',
            additionalInfo: { tableName },
        });

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
            // Fetch ALL local records from IndexedDB
            const allLocalRecords = await this.fetchLocalRecords(userId, tableName);
            
            // Fetch ALL remote records from Supabase for comparison
            const allRemoteRecords = await this.fetchRemoteRecords(client, userId, tableName);
            
            // Create a map of remote records by ID for quick lookup
            const remoteMap = new Map<string | number, Record<string, unknown>>();
            for (const remoteRecord of allRemoteRecords) {
                const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
                remoteMap.set(recordId, remoteRecord as Record<string, unknown>);
            }
            
            // Find records that need to be pushed:
            // 1. Records that exist locally but not remotely (need to create)
            // 2. Records that exist in both but local is newer (need to update)
            const recordsToPush: unknown[] = [];
            
            for (const localRecord of allLocalRecords) {
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);
                const remoteRecord = remoteMap.get(recordId);
                
                if (!remoteRecord) {
                    // Record doesn't exist remotely, needs to be created
                    recordsToPush.push(localRecord);
                } else {
                    // Record exists in both, check if local is newer
                    const localUpdatedAt = this.getUpdatedAt(localRecord as Record<string, unknown>);
                    const remoteUpdatedAt = this.getUpdatedAt(remoteRecord);
                    
                    // Also check version if available
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

            this.updateProgress({
                currentOperation: `Pushing ${recordsToPush.length} records to ${tableName}...`,
                totalRecords: recordsToPush.length,
            });

            const batches = this.chunkArray(recordsToPush, options.batchSize || BATCH_SIZE);

            for (const batch of batches) {
                try {
                    const batchResult = await this.pushBatch(client, validatedUserId, tableName, batch);
                    result.recordsProcessed += batchResult.recordsProcessed;
                    result.recordsCreated += batchResult.recordsCreated;
                    result.recordsUpdated += batchResult.recordsUpdated;
                    result.conflicts += batchResult.conflicts;
                    result.errors.push(...batchResult.errors);

                    this.updateProgress({
                        recordsProcessed: result.recordsProcessed,
                    });
                } catch (error) {
                    result.errors.push({
                        tableName,
                        recordId: 'batch',
                        error: error instanceof Error ? error.message : 'Unknown error',
                        timestamp: new Date(),
                        operation: 'create',
                    });
                }
            }

            result.duration = Date.now() - startTime;
            
            // Only update last sync time if sync was successful
            if (result.status === 'success') {
                await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'push');
            }
            
            return result;
        } catch (error) {
            result.status = 'error';
            result.errors.push({
                tableName,
                recordId: 'all',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
                operation: 'create',
            });
            result.duration = Date.now() - startTime;
            return result;
        }
    }

    private async fetchRemoteRecords(
        client: SupabaseClient,
        userId: string,
        tableName: SyncableTable,
        since?: Date
    ): Promise<unknown[]> {
        // Validate userId
        const validatedUserId = requireUserId(userId, {
            functionName: 'fetchRemoteRecords',
            additionalInfo: { tableName },
        });

        // eslint-disable-next-line no-console
        console.debug(`[SupabaseSyncService.fetchRemoteRecords] Fetching ${tableName} for userId: ${validatedUserId}`, since ? `since ${since.toISOString()}` : '');
        
        // Use user-scoped query helper to ensure user_id is always in URL
        let query = userScopedQuery(client, tableName, validatedUserId).select('*');

        if (since) {
            query = query.gt('updated_at', since.toISOString());
        }

        const { data, error } = await query.order('updated_at', { ascending: true });

        if (error) {
            // eslint-disable-next-line no-console
            console.error(`[SupabaseSyncService.fetchRemoteRecords] Error fetching ${tableName}:`, error);
            throw new Error(`Failed to fetch remote records: ${error.message}`);
        }

        // eslint-disable-next-line no-console
        console.debug(`[SupabaseSyncService.fetchRemoteRecords] Fetched ${data?.length || 0} records for ${tableName} (userId: ${userId})`);
        
        // Debug: Log user_ids found in fetched records to detect mismatches
        if (data && data.length > 0 && tableName === 'workouts') {
            const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.user_id))];
            // eslint-disable-next-line no-console
            console.debug(`[SupabaseSyncService.fetchRemoteRecords] user_ids found in fetched workouts:`, userIds);
            if (userIds.length > 1 || (userIds.length === 1 && userIds[0] !== validatedUserId)) {
                // eslint-disable-next-line no-console
                console.warn(`[SupabaseSyncService.fetchRemoteRecords] Mismatch detected! Query userId: ${validatedUserId}, Found user_ids:`, userIds);
            }
        }

        return data || [];
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
                // Filter by userId if provided
                return userId 
                    ? allStatuses.filter((s: { userId?: string }) => s.userId === userId)
                    : allStatuses;
            }

            case 'user_profiles': {
                const profile = await dataService.getUserProfile(userId);
                return profile ? [profile] : [];
            }

            case 'settings': {
                // Settings are stored as key-value pairs in IndexedDB
                // We need to fetch all settings and convert them to array format
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

        // Use version manager for conflict detection
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
                return (await dbHelpers.getWorkout(Number(recordId))) ?? null;
            case 'exercises':
                return (await dbHelpers.getExercise(String(recordId))) ?? null;
            case 'workout_templates':
                return (await dbHelpers.getTemplate(String(recordId))) ?? null;
            case 'planned_workouts':
                return (await dbHelpers.getPlannedWorkout(String(recordId))) ?? null;
            case 'muscle_statuses': {
                // For muscle_statuses, recordId might be composite "userId:muscle" or just muscle
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
                // For settings, recordId is composite "userId:key", need to extract key
                const key = typeof recordId === 'string' && recordId.includes(':') 
                    ? recordId.split(':')[1] 
                    : String(recordId);
                const setting = await dbHelpers.getSetting(key);
                return setting ? { key, value: setting } : null;
            }
            case 'notifications':
                return (await dbHelpers.getNotification(String(recordId))) ?? null;
            case 'sleep_logs': {
                // For sleep_logs, recordId is composite "userId:date"
                if (typeof recordId === 'string' && recordId.includes(':')) {
                    const [recordUserId, dateStr] = recordId.split(':');
                    const date = new Date(dateStr);
                    return (await sleepRecoveryService.getSleepLog(recordUserId, date)) ?? null;
                }
                // Fallback to id lookup if recordId is a number
                return (await dbHelpers.getSleepLog(Number(recordId))) ?? null;
            }
            case 'recovery_logs': {
                // For recovery_logs, recordId is composite "userId:date"
                if (typeof recordId === 'string' && recordId.includes(':')) {
                    const [recordUserId, dateStr] = recordId.split(':');
                    const date = new Date(dateStr);
                    return (await dbHelpers.getRecoveryLogByDate(recordUserId, date)) ?? null;
                }
                // Fallback to id lookup if recordId is a number
                return (await dbHelpers.getRecoveryLog(Number(recordId))) ?? null;
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
            // Use version manager for conflict resolution
            const conflictInfo = versionManager.detectConflict(
                tableName,
                recordId,
                localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
            );

            if (conflictInfo.hasConflict) {
                // Resolve conflict using last-write-wins
                const resolved = versionManager.resolveConflictLastWriteWins(
                    localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                    remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                );
                await this.updateLocalRecord(userId, tableName, resolved);
            } else if (versionManager.compareVersions(
                localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                remoteRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
            ) < 0) {
                // Remote is newer, update local
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
        const converted = this.convertFromSupabaseFormat(tableName, remoteRecord);
        
        // Debug: Log userId from remote record vs converted record
        if (tableName === 'workouts') {
            const remoteUserId = (remoteRecord as Record<string, unknown>).user_id;
            const convertedUserId = (converted as Record<string, unknown>).userId;
            // eslint-disable-next-line no-console
            console.debug(`[SupabaseSyncService.createLocalRecord] Creating workout - remote user_id: ${remoteUserId}, converted userId: ${convertedUserId}`);
            
            if (remoteUserId !== convertedUserId) {
                // eslint-disable-next-line no-console
                console.warn(`[SupabaseSyncService.createLocalRecord] userId mismatch! remote: ${remoteUserId}, converted: ${convertedUserId}`);
            }
        }

        switch (tableName) {
            case 'workouts':
                await dbHelpers.saveWorkout(converted as Omit<Workout, 'id'>);
                break;
            case 'exercises':
                await dbHelpers.saveExercise(converted as unknown as Exercise);
                break;
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
        }
    }

    private async updateLocalRecord(
        _userId: string,
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Promise<void> {
        const converted = this.convertFromSupabaseFormat(tableName, remoteRecord);
        const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);

        switch (tableName) {
            case 'workouts':
                await dbHelpers.updateWorkout(Number(recordId), converted as Partial<Workout>);
                break;
            case 'exercises':
                await dbHelpers.saveExercise(converted as unknown as Exercise);
                break;
            case 'workout_templates':
                await dbHelpers.updateTemplate(String(recordId), converted as Partial<WorkoutTemplate>);
                break;
            case 'planned_workouts':
                await dbHelpers.updatePlannedWorkout(String(recordId), converted as Partial<PlannedWorkout>);
                break;
            case 'muscle_statuses': {
                // For muscle_statuses, recordId is composite "userId:muscle", need to find by muscle
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
                // For sleep_logs, recordId is composite "userId:date", need to find by date
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
                // For recovery_logs, recordId is composite "userId:date", need to find by date
                const recoveryLog = converted as unknown as RecoveryLog;
                const existing = await sleepRecoveryService.getRecoveryLog(recoveryLog.userId, recoveryLog.date);
                if (existing?.id) {
                    await dbHelpers.updateRecoveryLog(existing.id, recoveryLog);
                } else {
                    await sleepRecoveryService.saveRecoveryLog(recoveryLog);
                }
                break;
            }
        }
    }

    private async pushBatch(
        client: SupabaseClient,
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
        // Validate userId at the start
        const validatedUserId = requireUserId(userId, {
            functionName: 'pushBatch',
            additionalInfo: { tableName, batchSize: batch.length },
        });

        const result = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            conflicts: 0,
            errors: [] as SyncError[],
        };

        for (const localRecord of batch) {
            try {
                const supabaseRecord = this.convertToSupabaseFormat(tableName, localRecord, validatedUserId);
                const recordId = this.getRecordId(supabaseRecord, tableName);

                // Build query - exercises, muscle_statuses, settings, sleep_logs, recovery_logs, and user_profiles need special handling
                // For user_profiles: use user_id instead of id in select
                const selectFields = tableName === 'user_profiles' 
                    ? 'user_id, updated_at, version'
                    : 'id, updated_at, version';
                let query = client.from(tableName).select(selectFields);

                // For user_profiles: use user_id as primary key (no id column)
                if (tableName === 'user_profiles') {
                    query = query.eq('user_id', validatedUserId);
                } else if (tableName === 'muscle_statuses') {
                    // For muscle_statuses: use (user_id, muscle) unique constraint instead of id
                    query = query
                        .eq('user_id', validatedUserId)
                        .eq('muscle', supabaseRecord.muscle as string);
                } else if (tableName === 'settings') {
                    // For settings: use (user_id, key) unique constraint instead of id
                    query = query
                        .eq('user_id', validatedUserId)
                        .eq('key', supabaseRecord.key as string);
                } else if (tableName === 'sleep_logs') {
                    // For sleep_logs: use (user_id, date) unique constraint instead of id
                    const dateStr = supabaseRecord.date instanceof Date 
                        ? supabaseRecord.date.toISOString().split('T')[0]
                        : typeof supabaseRecord.date === 'string'
                        ? supabaseRecord.date.split('T')[0]
                        : supabaseRecord.date;
                    query = query
                        .eq('user_id', validatedUserId)
                        .eq('date', dateStr);
                } else if (tableName === 'recovery_logs') {
                    // For recovery_logs: use (user_id, date) unique constraint instead of id
                    const dateStr = supabaseRecord.date instanceof Date 
                        ? supabaseRecord.date.toISOString().split('T')[0]
                        : typeof supabaseRecord.date === 'string'
                        ? supabaseRecord.date.split('T')[0]
                        : supabaseRecord.date;
                    query = query
                        .eq('user_id', validatedUserId)
                        .eq('date', dateStr);
                } else if (tableName === 'exercises') {
                    // For exercises: library exercises don't have user_id, custom exercises do
                    const isCustom = supabaseRecord.is_custom === true;
                    if (isCustom) {
                        query = query.eq('user_id', validatedUserId).eq('id', recordId);
                    } else {
                        // Library exercises: check if user_id is null or doesn't exist
                        query = query.is('user_id', null).eq('id', recordId);
                    }
                } else {
                    // For other tables, filter by id and user_id
                    query = query.eq('id', recordId).eq('user_id', validatedUserId);
                }

                // Use maybeSingle() instead of single() to handle 0 rows gracefully
                const { data: existing, error: queryError } = await query.maybeSingle();

                // Handle query errors (but not 0 rows - that's expected for new records)
                if (queryError && queryError.code !== 'PGRST116') {
                    throw queryError;
                }

                if (existing) {
                    // Use version manager for conflict detection
                    const conflictInfo = versionManager.detectConflict(
                        tableName,
                        recordId,
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    );

                    if (conflictInfo.hasConflict) {
                        // Conflict detected - use last-write-wins
                        const resolved = versionManager.resolveConflictLastWriteWins(
                            localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                            existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                        );
                        const resolvedRecord = this.convertToSupabaseFormat(tableName, resolved, validatedUserId);
                        
                        // Build update query with proper filtering
                        let updateQuery = client.from(tableName).update(resolvedRecord);

                        // For user_profiles: use user_id as primary key (no id column)
                        if (tableName === 'user_profiles') {
                            updateQuery = updateQuery.eq('user_id', validatedUserId);
                        } else if (tableName === 'muscle_statuses') {
                            // For muscle_statuses: use (user_id, muscle) unique constraint
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('muscle', resolvedRecord.muscle as string);
                        } else if (tableName === 'settings') {
                            // For settings: use (user_id, key) unique constraint
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('key', resolvedRecord.key as string);
                        } else if (tableName === 'sleep_logs') {
                            // For sleep_logs: use (user_id, date) unique constraint
                            const dateStr = resolvedRecord.date instanceof Date 
                                ? resolvedRecord.date.toISOString().split('T')[0]
                                : typeof resolvedRecord.date === 'string'
                                ? resolvedRecord.date.split('T')[0]
                                : resolvedRecord.date;
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('date', dateStr);
                        } else if (tableName === 'recovery_logs') {
                            // For recovery_logs: use (user_id, date) unique constraint
                            const dateStr = resolvedRecord.date instanceof Date 
                                ? resolvedRecord.date.toISOString().split('T')[0]
                                : typeof resolvedRecord.date === 'string'
                                ? resolvedRecord.date.split('T')[0]
                                : resolvedRecord.date;
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('date', dateStr);
                        } else if (tableName === 'exercises' && !supabaseRecord.is_custom) {
                            // For exercises: library exercises don't have user_id filter
                            updateQuery = updateQuery.is('user_id', null).eq('id', recordId);
                        } else {
                            updateQuery = updateQuery.eq('id', recordId).eq('user_id', validatedUserId);
                        }

                        const { error } = await updateQuery;
                        if (error) throw error;
                        result.recordsUpdated++;
                        result.conflicts++;
                    } else if (versionManager.compareVersions(
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    ) > 0) {
                        // Local is newer, update remote
                        let updateQuery = client.from(tableName).update(supabaseRecord);

                        // For user_profiles: use user_id as primary key (no id column)
                        if (tableName === 'user_profiles') {
                            updateQuery = updateQuery.eq('user_id', validatedUserId);
                        } else if (tableName === 'muscle_statuses') {
                            // For muscle_statuses: use (user_id, muscle) unique constraint
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('muscle', supabaseRecord.muscle as string);
                        } else if (tableName === 'settings') {
                            // For settings: use (user_id, key) unique constraint
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('key', supabaseRecord.key as string);
                        } else if (tableName === 'sleep_logs') {
                            // For sleep_logs: use (user_id, date) unique constraint
                            const dateStr = supabaseRecord.date instanceof Date 
                                ? supabaseRecord.date.toISOString().split('T')[0]
                                : typeof supabaseRecord.date === 'string'
                                ? supabaseRecord.date.split('T')[0]
                                : supabaseRecord.date;
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('date', dateStr);
                        } else if (tableName === 'recovery_logs') {
                            // For recovery_logs: use (user_id, date) unique constraint
                            const dateStr = supabaseRecord.date instanceof Date 
                                ? supabaseRecord.date.toISOString().split('T')[0]
                                : typeof supabaseRecord.date === 'string'
                                ? supabaseRecord.date.split('T')[0]
                                : supabaseRecord.date;
                            updateQuery = updateQuery
                                .eq('user_id', validatedUserId)
                                .eq('date', dateStr);
                        } else if (tableName === 'exercises' && !supabaseRecord.is_custom) {
                            // For exercises: library exercises don't have user_id filter
                            updateQuery = updateQuery.is('user_id', null).eq('id', recordId);
                        } else {
                            updateQuery = updateQuery.eq('id', recordId).eq('user_id', validatedUserId);
                        }

                        const { error } = await updateQuery;
                        if (error) throw error;
                        result.recordsUpdated++;
                    } else {
                        // Remote is newer or equal, skip
                        result.conflicts++;
                    }
                } else {
                    // Record doesn't exist, create it
                    // For exercises: library exercises should have user_id = null
                    if (tableName === 'exercises' && !supabaseRecord.is_custom) {
                        supabaseRecord.user_id = null;
                    }

                    const { error } = await client
                        .from(tableName)
                        .insert(supabaseRecord);

                    if (error) throw error;
                    result.recordsCreated++;
                }

                result.recordsProcessed++;
            } catch (error) {
                result.errors.push({
                    tableName,
                    recordId: this.getRecordId(localRecord as Record<string, unknown>, tableName),
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date(),
                    operation: 'create',
                });
            }
        }

        return result;
    }

    private convertToSupabaseFormat(
        tableName: SyncableTable,
        localRecord: unknown,
        userId: string
    ): Record<string, unknown> {
        const record = localRecord as Record<string, unknown>;
        const base = {
            user_id: userId,
            updated_at: this.getUpdatedAt(record).toISOString(),
            created_at: this.getCreatedAt(record).toISOString(),
            version: record.version ?? 1,
            deleted_at: record.deletedAt ? (record.deletedAt instanceof Date ? record.deletedAt.toISOString() : new Date(record.deletedAt as string | number).toISOString()) : null,
        };

        switch (tableName) {
            case 'workouts':
                return {
                    ...base,
                    id: record.id,
                    date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
                    start_time: record.startTime instanceof Date ? (record.startTime as Date).toISOString() : record.startTime,
                    end_time: record.endTime instanceof Date ? (record.endTime as Date).toISOString() : record.endTime,
                    exercises: JSON.stringify(record.exercises),
                    total_duration: record.totalDuration,
                    total_volume: record.totalVolume,
                    calories: record.calories,
                    notes: record.notes,
                    muscles_targeted: record.musclesTargeted,
                    workout_type: record.workoutType,
                    mood: record.mood,
                };

            case 'exercises': {
                const exerciseRecord: Record<string, unknown> = {
                    ...base,
                    id: record.id,
                    name: record.name,
                    category: record.category,
                    primary_muscles: record.primaryMuscles,
                    secondary_muscles: record.secondaryMuscles,
                    equipment: record.equipment,
                    difficulty: record.difficulty,
                    instructions: record.instructions,
                    video_url: record.videoUrl,
                    is_custom: record.isCustom,
                    tracking_type: record.trackingType,
                    anatomy_image_url: record.anatomyImageUrl,
                    strengthlog_url: record.strengthlogUrl,
                    strengthlog_slug: record.strengthlogSlug,
                    advanced_details: record.advancedDetails ? JSON.stringify(record.advancedDetails) : null,
                    muscle_category: record.muscleCategory,
                };
                // Library exercises should have user_id = null
                if (!record.isCustom) {
                    exerciseRecord.user_id = null;
                }
                return exerciseRecord;
            }

            case 'workout_templates':
                return {
                    ...base,
                    id: record.id,
                    name: record.name,
                    category: record.category,
                    description: record.description,
                    image_url: record.imageUrl,
                    difficulty: record.difficulty,
                    days_per_week: record.daysPerWeek,
                    exercises: JSON.stringify(record.exercises),
                    estimated_duration: record.estimatedDuration,
                    muscles_targeted: record.musclesTargeted,
                    is_featured: record.isFeatured,
                    is_trending: record.isTrending,
                    match_percentage: record.matchPercentage,
                };

            case 'planned_workouts':
                return {
                    ...base,
                    id: record.id,
                    scheduled_date: record.scheduledDate instanceof Date ? (record.scheduledDate as Date).toISOString().split('T')[0] : record.scheduledDate,
                    scheduled_time: record.scheduledTime instanceof Date ? (record.scheduledTime as Date).toISOString() : record.scheduledTime,
                    template_id: record.templateId,
                    workout_name: record.workoutName,
                    category: record.category,
                    estimated_duration: record.estimatedDuration,
                    exercises: JSON.stringify(record.exercises),
                    muscles_targeted: record.musclesTargeted,
                    notes: record.notes,
                    is_completed: record.isCompleted,
                    completed_workout_id: record.completedWorkoutId,
                };

            case 'muscle_statuses':
                return {
                    ...base,
                    id: record.id,
                    muscle: record.muscle,
                    last_worked: record.lastWorked instanceof Date ? (record.lastWorked as Date).toISOString() : record.lastWorked,
                    recovery_status: record.recoveryStatus,
                    recovery_percentage: record.recoveryPercentage,
                    workload_score: record.workloadScore,
                    recommended_rest_days: record.recommendedRestDays,
                    total_volume_last_7_days: record.totalVolumeLast7Days,
                    training_frequency: record.trainingFrequency,
                };

            case 'user_profiles':
                return {
                    ...base,
                    user_id: record.id,
                    name: record.name,
                    experience_level: record.experienceLevel,
                    goals: record.goals,
                    equipment: record.equipment,
                    workout_frequency: record.workoutFrequency,
                    preferred_unit: record.preferredUnit,
                    default_rest_time: record.defaultRestTime,
                    age: record.age,
                    gender: record.gender,
                    weight: record.weight,
                    height: record.height,
                    profile_picture: record.profilePicture,
                };

            case 'settings':
                return {
                    ...base,
                    key: record.key,
                    value: typeof record.value === 'string' ? record.value : JSON.stringify(record.value),
                };

            case 'notifications':
                return {
                    ...base,
                    id: record.id,
                    type: record.type,
                    title: record.title,
                    message: record.message,
                    data: typeof record.data === 'string' ? record.data : JSON.stringify(record.data || {}),
                    is_read: record.isRead,
                    read_at: record.readAt ? new Date(record.readAt as number).toISOString() : null,
                    created_at: new Date(record.createdAt as number).toISOString(),
                };

            case 'sleep_logs':
                return {
                    ...base,
                    id: record.id,
                    date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
                    bedtime: record.bedtime instanceof Date ? (record.bedtime as Date).toISOString() : record.bedtime,
                    wake_time: record.wakeTime instanceof Date ? (record.wakeTime as Date).toISOString() : record.wakeTime,
                    duration: record.duration,
                    quality: record.quality,
                    notes: record.notes,
                };

            case 'recovery_logs':
                return {
                    ...base,
                    id: record.id,
                    date: record.date instanceof Date ? record.date.toISOString().split('T')[0] : record.date,
                    overall_recovery: record.overallRecovery,
                    stress_level: record.stressLevel,
                    energy_level: record.energyLevel,
                    soreness: record.soreness,
                    readiness_to_train: record.readinessToTrain,
                    notes: record.notes,
                };

            default:
                return base;
        }
    }

    private convertFromSupabaseFormat(
        tableName: SyncableTable,
        remoteRecord: unknown
    ): Record<string, unknown> {
        const record = remoteRecord as Record<string, unknown>;
        switch (tableName) {
            case 'workouts':
                return {
                    id: record.id,
                    userId: record.user_id,
                    date: new Date(record.date as string | number | Date),
                    startTime: new Date(record.start_time as string | number | Date),
                    endTime: record.end_time ? new Date(record.end_time as string | number | Date) : undefined,
                    exercises: typeof record.exercises === 'string' ? JSON.parse(record.exercises) : record.exercises,
                    totalDuration: record.total_duration,
                    totalVolume: Number(record.total_volume),
                    calories: record.calories,
                    notes: record.notes,
                    musclesTargeted: record.muscles_targeted,
                    workoutType: record.workout_type,
                    mood: record.mood,
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'exercises':
                return {
                    id: record.id,
                    name: record.name,
                    category: record.category,
                    primaryMuscles: record.primary_muscles,
                    secondaryMuscles: record.secondary_muscles,
                    equipment: record.equipment,
                    difficulty: record.difficulty,
                    instructions: record.instructions,
                    videoUrl: record.video_url,
                    isCustom: record.is_custom,
                    trackingType: record.tracking_type,
                    anatomyImageUrl: record.anatomy_image_url,
                    strengthlogUrl: record.strengthlog_url,
                    strengthlogSlug: record.strengthlog_slug,
                    advancedDetails: record.advanced_details ? (typeof record.advanced_details === 'string' ? JSON.parse(record.advanced_details) : record.advanced_details) : undefined,
                    muscleCategory: record.muscle_category,
                    userId: record.user_id as string | undefined,
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'workout_templates':
                return {
                    id: record.id,
                    userId: record.user_id,
                    name: record.name,
                    category: record.category,
                    description: record.description,
                    imageUrl: record.image_url,
                    difficulty: record.difficulty,
                    daysPerWeek: record.days_per_week,
                    exercises: typeof record.exercises === 'string' ? JSON.parse(record.exercises) : record.exercises,
                    estimatedDuration: record.estimated_duration,
                    musclesTargeted: record.muscles_targeted,
                    isFeatured: record.is_featured,
                    isTrending: record.is_trending,
                    matchPercentage: record.match_percentage ? Number(record.match_percentage) : undefined,
                    createdAt: new Date(record.created_at as string | number | Date),
                    updatedAt: new Date(record.updated_at as string | number | Date),
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'planned_workouts':
                return {
                    id: record.id,
                    userId: record.user_id,
                    scheduledDate: new Date(record.scheduled_date as string | number | Date),
                    scheduledTime: record.scheduled_time ? new Date(record.scheduled_time as string | number | Date) : undefined,
                    templateId: record.template_id,
                    workoutName: record.workout_name,
                    category: record.category,
                    estimatedDuration: record.estimated_duration,
                    exercises: typeof record.exercises === 'string' ? JSON.parse(record.exercises) : record.exercises,
                    musclesTargeted: record.muscles_targeted,
                    notes: record.notes,
                    isCompleted: record.is_completed,
                    completedWorkoutId: record.completed_workout_id,
                    createdAt: new Date(record.created_at as string | number | Date),
                    updatedAt: new Date(record.updated_at as string | number | Date),
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'muscle_statuses':
                return {
                    id: record.id,
                    muscle: record.muscle,
                    lastWorked: record.last_worked ? new Date(record.last_worked as string | number | Date) : null,
                    recoveryStatus: record.recovery_status,
                    recoveryPercentage: record.recovery_percentage,
                    workloadScore: Number(record.workload_score),
                    recommendedRestDays: record.recommended_rest_days,
                    totalVolumeLast7Days: Number(record.total_volume_last_7_days),
                    trainingFrequency: Number(record.training_frequency),
                    userId: record.user_id as string | undefined,
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'user_profiles':
                return {
                    id: record.user_id,
                    name: record.name,
                    experienceLevel: record.experience_level,
                    goals: record.goals,
                    equipment: record.equipment,
                    workoutFrequency: record.workout_frequency,
                    preferredUnit: record.preferred_unit,
                    defaultRestTime: record.default_rest_time,
                    age: record.age,
                    gender: record.gender,
                    weight: record.weight ? Number(record.weight) : undefined,
                    height: record.height ? Number(record.height) : undefined,
                    profilePicture: record.profile_picture,
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'settings':
                return {
                    key: record.key,
                    value: typeof record.value === 'string' ? JSON.parse(record.value) : record.value,
                    userId: record.user_id as string,
                };

            case 'notifications':
                return {
                    id: record.id,
                    userId: record.user_id,
                    type: record.type,
                    title: record.title,
                    message: record.message,
                    data: typeof record.data === 'string' ? JSON.parse(record.data) : (record.data || {}),
                    isRead: record.is_read,
                    readAt: record.read_at ? new Date(record.read_at as string | number | Date).getTime() : null,
                    createdAt: new Date(record.created_at as string | number | Date).getTime(),
                    version: record.version as number | undefined,
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date).getTime() : null,
                };

            case 'sleep_logs':
                return {
                    id: record.id,
                    userId: record.user_id,
                    date: new Date(record.date as string | number | Date),
                    bedtime: new Date(record.bedtime as string | number | Date),
                    wakeTime: new Date(record.wake_time as string | number | Date),
                    duration: Number(record.duration),
                    quality: Number(record.quality),
                    notes: record.notes,
                    version: record.version as number | undefined,
                    createdAt: new Date(record.created_at as string | number | Date),
                    updatedAt: new Date(record.updated_at as string | number | Date),
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            case 'recovery_logs':
                return {
                    id: record.id,
                    userId: record.user_id,
                    date: new Date(record.date as string | number | Date),
                    overallRecovery: Number(record.overall_recovery),
                    stressLevel: Number(record.stress_level),
                    energyLevel: Number(record.energy_level),
                    soreness: Number(record.soreness),
                    readinessToTrain: record.readiness_to_train,
                    notes: record.notes,
                    version: record.version as number | undefined,
                    createdAt: new Date(record.created_at as string | number | Date),
                    updatedAt: new Date(record.updated_at as string | number | Date),
                    deletedAt: record.deleted_at ? new Date(record.deleted_at as string | number | Date) : null,
                };

            default:
                return record;
        }
    }

    private getRecordId(record: Record<string, unknown>, tableName?: SyncableTable): string | number {
        // For user_profiles, use user_id as primary key (no id column)
        if (tableName === 'user_profiles') {
            return (record.user_id as string | number) || (record.userId as string | number) || (record.id as string | number) || '';
        }
        
        // For muscle_statuses, use composite key (user_id, muscle) since it has UNIQUE constraint
        if (tableName === 'muscle_statuses') {
            const userId = record.user_id || record.userId;
            const muscle = record.muscle;
            if (userId && muscle) {
                return `${userId}:${muscle}`;
            }
        }
        
        // For settings, use composite key (user_id, key) since it has UNIQUE constraint
        if (tableName === 'settings') {
            const userId = record.user_id || record.userId;
            const key = record.key;
            if (userId && key) {
                return `${userId}:${key}`;
            }
        }
        
        // For sleep_logs, use composite key (user_id, date) since it has UNIQUE constraint
        if (tableName === 'sleep_logs') {
            const userId = record.user_id || record.userId;
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
        
        // For recovery_logs, use composite key (user_id, date) since it has UNIQUE constraint
        if (tableName === 'recovery_logs') {
            const userId = record.user_id || record.userId;
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
        
        return (record.id as string | number) || (record.user_id as string | number) || (record.key as string) || '';
    }

    private getUpdatedAt(record: Record<string, unknown>): Date {
        if (record.updatedAt) {
            return record.updatedAt instanceof Date ? record.updatedAt : new Date(record.updatedAt as string | number | Date);
        }
        if (record.updated_at) {
            return new Date(record.updated_at as string | number | Date);
        }
        return new Date();
    }

    private getCreatedAt(record: Record<string, unknown>): Date {
        if (record.createdAt) {
            return record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt as string | number | Date);
        }
        if (record.created_at) {
            return new Date(record.created_at as string | number | Date);
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
        // Validate userId
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

    /**
     * Sync a single table with error recovery
     */
    private async syncTable(
        client: SupabaseClient,
        userId: string,
        table: SyncableTable,
        direction: SyncDirection,
        options: SyncOptions
    ): Promise<SyncResult> {
        return await errorRecovery.withRetry(async () => {
            if (direction === 'bidirectional') {
                return await this.syncBidirectional(client, userId, table, options);
            } else if (direction === 'push') {
                return await this.syncPush(client, userId, table, options);
            } else {
                return await this.syncPull(client, userId, table, options);
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

export const supabaseSyncService = new SupabaseSyncService();

