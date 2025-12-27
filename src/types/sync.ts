export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict';

export type SyncDirection = 'push' | 'pull' | 'bidirectional';

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
    | 'recovery_logs';

export interface SyncMetadata {
    id?: number;
    tableName: SyncableTable;
    userId: string;
    lastSyncAt: Date | null;
    lastPushAt: Date | null;
    lastPullAt: Date | null;
    syncStatus: SyncStatus;
    conflictCount: number;
    errorMessage?: string;
    lastErrorAt?: Date;
    recordCount?: number;
    version?: number; // Schema version
    lastSuccessfulSyncAt?: Date | null; // Last successful sync timestamp
    syncToken?: string; // For idempotent operations
}

export interface SyncResult {
    tableName: SyncableTable;
    direction: SyncDirection;
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

export interface SyncOptions {
    direction?: SyncDirection;
    tables?: SyncableTable[];
    forceFullSync?: boolean;
    batchSize?: number;
    retryOnError?: boolean;
    maxRetries?: number;
}

export interface ConflictResolution {
    tableName: SyncableTable;
    recordId: string | number;
    localVersion: number;
    remoteVersion: number;
    localUpdatedAt: Date;
    remoteUpdatedAt: Date;
    resolution: 'local' | 'remote' | 'merge';
    resolvedAt: Date;
}

export interface SyncQueueItem {
    id: string;
    userId: string;
    tableName: SyncableTable;
    recordId: string;
    operation: 'insert' | 'update' | 'delete';
    payload: Record<string, unknown>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    retryCount: number;
    errorMessage?: string;
    createdAt: Date;
    processedAt?: Date;
    syncToken?: string;
}

export interface SyncProgress {
    currentTable: SyncableTable | null;
    totalTables: number;
    completedTables: number;
    currentOperation: string;
    recordsProcessed: number;
    totalRecords: number;
    percentage: number;
}

