import mongoose, { Schema } from 'mongoose';

export interface IErrorLog {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    errorType: 'sync_error' | 'workout_error' | 'database_error' | 'network_error' | 'validation_error' | 'application_error' | 'unknown_error';
    errorMessage: string;
    errorStack?: string;
    context?: Record<string, unknown>;
    tableName?: string;
    recordId?: string | number;
    operation?: 'create' | 'update' | 'delete' | 'read' | 'sync' | 'other';
    severity: 'info' | 'warning' | 'error' | 'critical';
    resolved: boolean;
    resolvedAt?: Date | null;
    resolvedBy?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        errorType: {
            type: String,
            required: true,
            enum: ['sync_error', 'workout_error', 'database_error', 'network_error', 'validation_error', 'application_error', 'unknown_error'],
        },
        errorMessage: {
            type: String,
            required: true,
        },
        errorStack: {
            type: String,
        },
        context: {
            type: Schema.Types.Mixed,
        },
        tableName: {
            type: String,
        },
        recordId: {
            type: Schema.Types.Mixed,
        },
        operation: {
            type: String,
            enum: ['create', 'update', 'delete', 'read', 'sync', 'other'],
        },
        severity: {
            type: String,
            required: true,
            enum: ['info', 'warning', 'error', 'critical'],
            default: 'error',
        },
        resolved: {
            type: Boolean,
            required: true,
            default: false,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        resolvedBy: {
            type: String,
        },
        version: {
            type: Number,
            default: 1,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
ErrorLogSchema.index({ userId: 1, errorType: 1 });
ErrorLogSchema.index({ userId: 1, severity: 1 });
ErrorLogSchema.index({ userId: 1, resolved: 1 });
ErrorLogSchema.index({ userId: 1, createdAt: -1 });
ErrorLogSchema.index({ userId: 1, updatedAt: -1 });
ErrorLogSchema.index({ userId: 1, deletedAt: 1 });
ErrorLogSchema.index({ tableName: 1 });

// Pre-save hook to increment version on updates
ErrorLogSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const ErrorLog = mongoose.model<IErrorLog>('ErrorLog', ErrorLogSchema);

