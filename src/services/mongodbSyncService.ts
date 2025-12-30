import mongoose from 'mongoose';
import { connectToMongoDB } from './mongodbClient';
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
import {
    Workout as WorkoutModel,
    Exercise as ExerciseModel,
    WorkoutTemplate as WorkoutTemplateModel,
    PlannedWorkout as PlannedWorkoutModel,
    MuscleStatus as MuscleStatusModel,
    UserProfile as UserProfileModel,
    Setting as SettingModel,
    Notification as NotificationModel,
    SleepLog as SleepLogModel,
    RecoveryLog as RecoveryLogModel,
    ErrorLog as ErrorLogModel,
} from './mongodb/schemas';

type UserProfile = {
    id: string;
    name: string;
    [key: string]: unknown;
};

const BATCH_SIZE = 100;

type ProgressCallback = (progress: SyncProgress) => void;

// Map table names to Mongoose models
const getModel = (tableName: SyncableTable) => {
    switch (tableName) {
        case 'workouts':
            return WorkoutModel;
        case 'exercises':
            return ExerciseModel;
        case 'workout_templates':
            return WorkoutTemplateModel;
        case 'planned_workouts':
            return PlannedWorkoutModel;
        case 'muscle_statuses':
            return MuscleStatusModel;
        case 'user_profiles':
            return UserProfileModel;
        case 'settings':
            return SettingModel;
        case 'notifications':
            return NotificationModel;
        case 'sleep_logs':
            return SleepLogModel;
        case 'recovery_logs':
            return RecoveryLogModel;
        case 'error_logs':
            return ErrorLogModel;
        default:
            throw new Error(`Unknown table name: ${tableName}`);
    }
};

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
        this.syncQueue = this.syncQueue.then(() => this.performSync(userId, options));
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
            await connectToMongoDB();
            userContextManager.setUserId(validatedUserId);

            const independentTables = tables.filter(t => 
                !['user_profiles', 'settings', 'notifications'].includes(t)
            );
            const dependentTables = tables.filter(t => 
                ['user_profiles', 'settings'].includes(t)
            );
            const pullOnlyTables = tables.filter(t => 
                t === 'notifications'
            );

            const independentResults = await Promise.all(
                independentTables.map(table => this.syncTable(validatedUserId, table, direction, options))
            );
            results.push(...independentResults);

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
                        userId,
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
                        userId,
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
        } finally {
            this.isSyncing = false;
            this.currentProgress = null;
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
                        userId,
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
                userId,
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
            const allLocalRecords = await this.fetchLocalRecords(userId, tableName);
            const allRemoteRecords = await this.fetchRemoteRecords(validatedUserId, tableName);
            
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

            this.updateProgress({
                currentOperation: `Pushing ${recordsToPush.length} records to ${tableName}...`,
                totalRecords: recordsToPush.length,
            });

            const batches = this.chunkArray(recordsToPush, options.batchSize || BATCH_SIZE);

            for (const batch of batches) {
                try {
                    const batchResult = await this.pushBatch(validatedUserId, tableName, batch);
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
                        userId,
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
                userId,
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
        
        const Model = getModel(tableName);
        const baseFilter = userScopedFilter(validatedUserId, tableName);
        
        // Add updatedAt filter if since is provided
        const filter = since 
            ? { ...baseFilter, updatedAt: { $gt: since } }
            : baseFilter;
        
        const records = await Model.find(filter).sort({ updatedAt: 1 }).lean();

        console.debug(`[MongoDBSyncService.fetchRemoteRecords] Fetched ${records?.length || 0} records for ${tableName} (userId: ${validatedUserId})`);

        return records || [];
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
                return (await dbHelpers.getWorkout(Number(recordId))) ?? null;
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

        const result = {
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            conflicts: 0,
            errors: [] as SyncError[],
        };

        const Model = getModel(tableName);

        for (const localRecord of batch) {
            try {
                const mongoRecord = this.convertToMongoFormat(tableName, localRecord, validatedUserId);
                const recordId = this.getRecordId(localRecord as Record<string, unknown>, tableName);

                // Build filter based on table type
                let filter: Record<string, unknown> = userScopedFilter(validatedUserId, tableName);
                
                // Add ID filter based on table structure
                if (tableName === 'workouts' || tableName === 'error_logs') {
                    // These use _id in MongoDB
                    if (typeof recordId === 'number') {
                        filter._id = recordId;
                    } else if (mongoRecord._id) {
                        filter._id = mongoRecord._id;
                    }
                } else if (tableName === 'user_profiles') {
                    // user_profiles uses userId as primary key
                    filter.userId = validatedUserId;
                } else if (tableName === 'muscle_statuses') {
                    filter.muscle = (mongoRecord as Record<string, unknown>).muscle;
                } else if (tableName === 'settings') {
                    filter.key = (mongoRecord as Record<string, unknown>).key;
                } else if (tableName === 'sleep_logs' || tableName === 'recovery_logs') {
                    filter.date = (mongoRecord as Record<string, unknown>).date;
                } else {
                    // Most tables use 'id' field
                    filter.id = mongoRecord.id || recordId;
                }
                
                const existing = await Model.findOne(filter).lean();

                if (existing) {
                    const conflictInfo = versionManager.detectConflict(
                        tableName,
                        recordId,
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    );

                    if (conflictInfo.hasConflict) {
                        const resolved = versionManager.resolveConflictLastWriteWins(
                            localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                            existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                        );
                        const resolvedRecord = this.convertToMongoFormat(tableName, resolved, validatedUserId);
                        
                        // Preserve _id if it exists
                        if (existing._id) {
                            resolvedRecord._id = existing._id;
                        }
                        
                        await Model.findOneAndUpdate(filter, resolvedRecord, { upsert: true, new: true, setDefaultsOnInsert: true });
                        result.recordsUpdated++;
                        result.conflicts++;
                    } else if (versionManager.compareVersions(
                        localRecord as { version?: number; updatedAt?: Date; deletedAt?: Date | null },
                        existing as { version?: number; updatedAt?: Date; deletedAt?: Date | null }
                    ) > 0) {
                        // Preserve _id if it exists
                        if (existing._id) {
                            mongoRecord._id = existing._id;
                        }
                        await Model.findOneAndUpdate(filter, mongoRecord, { upsert: true, new: true, setDefaultsOnInsert: true });
                        result.recordsUpdated++;
                    } else {
                        result.conflicts++;
                    }
                } else {
                    // Remove _id for new records (MongoDB will generate it)
                    delete mongoRecord._id;
                    await Model.create(mongoRecord);
                    result.recordsCreated++;
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
                    userId,
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
            deletedAt: record.deletedAt || null,
        };

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
                if (!record.isCustom) {
                    exerciseRecord.userId = null;
                }
                return exerciseRecord;
            }
            case 'user_profiles': {
                // user_profiles uses userId as primary key
                return {
                    ...base,
                    userId: record.id || userId,
                    ...record,
                };
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

        // Map _id to id for IndexedDB compatibility
        if (record._id) {
            if (tableName === 'workouts' || tableName === 'error_logs') {
                // These use numeric IDs in IndexedDB
                // Convert ObjectId to a number (use timestamp portion for consistency)
                if (record._id instanceof mongoose.Types.ObjectId) {
                    // Use the timestamp portion of ObjectId as a numeric ID
                    base.id = record._id.getTimestamp().getTime();
                } else {
                    base.id = typeof record._id === 'string' ? parseInt(record._id, 16) : Number(record._id);
                }
            } else if (tableName !== 'user_profiles') {
                // Most other tables use string IDs
                base.id = record.id || (record._id instanceof mongoose.Types.ObjectId ? record._id.toString() : String(record._id));
            }
            delete base._id;
        }

        // Special handling for notifications (timestamps)
        if (tableName === 'notifications') {
            if (record.createdAt instanceof Date) {
                base.createdAt = record.createdAt.getTime();
            }
            if (record.updatedAt instanceof Date) {
                base.updatedAt = record.updatedAt.getTime();
            }
            if (record.readAt instanceof Date) {
                base.readAt = record.readAt.getTime();
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

    private getCreatedAt(record: Record<string, unknown>): Date {
        if (record.createdAt) {
            return record.createdAt instanceof Date ? record.createdAt : new Date(record.createdAt as string | number | Date);
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

