// Type definitions for sync-to-mongodb Edge Function

export type SyncableTable =
    | 'workouts'
    | 'exercises'
    | 'workout_templates'
    | 'planned_workouts'
    | 'muscle_statuses'
    | 'user_profiles'
    | 'settings'
    | 'notifications'
    | 'sleep_logs'
    | 'recovery_logs'
    | 'error_logs';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export interface SyncRequest {
    type: 'webhook' | 'manual' | 'cron';
    userId?: string;
    tableName?: SyncableTable;
    recordId?: string | number;
    operation?: 'insert' | 'update' | 'delete';
    payload?: Record<string, unknown>;
}

export interface SyncResult {
    tableName: SyncableTable;
    status: SyncStatus;
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsDeleted: number;
    conflicts: number;
    errors: SyncError[];
    duration: number;
}

export interface SyncError {
    tableName: SyncableTable;
    recordId: string | number;
    error: string;
    timestamp: Date;
    operation: 'create' | 'update' | 'delete' | 'read';
}

export interface SyncMetadata {
    tableName: SyncableTable;
    userId: string;
    lastSyncAt: Date | null;
    syncStatus: SyncStatus;
    conflictCount: number;
    errorMessage?: string;
    lastErrorAt?: Date;
    recordCount?: number;
}
