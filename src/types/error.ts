export type ErrorType =
    | 'sync_error'
    | 'workout_error'
    | 'database_error'
    | 'network_error'
    | 'validation_error'
    | 'application_error'
    | 'unknown_error';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorOperation = 'create' | 'update' | 'delete' | 'read' | 'sync' | 'other';

export interface ErrorLog {
    id?: number;
    userId: string;
    errorType: ErrorType;
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
    tableName?: string;
    recordId?: string | number;
    operation?: ErrorOperation;
    severity: ErrorSeverity;
    resolved: boolean;
    resolvedAt?: Date | null;
    resolvedBy?: string;
    version?: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ErrorLogCreateInput {
    userId: string;
    errorType: ErrorType;
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
    tableName?: string;
    recordId?: string | number;
    operation?: ErrorOperation;
    severity?: ErrorSeverity;
}

