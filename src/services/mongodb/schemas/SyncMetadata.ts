import mongoose, { Schema } from 'mongoose';

export interface ISyncMetadata {
    _id?: mongoose.Types.ObjectId;
    tableName: string;
    userId: string;
    lastSyncAt?: Date;
    lastPushAt?: Date;
    lastPullAt?: Date;
    syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
    conflictCount: number;
    errorMessage?: string;
    lastErrorAt?: Date;
    recordCount?: number;
    syncToken?: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}

const SyncMetadataSchema = new Schema<ISyncMetadata>(
    {
        tableName: {
            type: String,
            required: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        lastSyncAt: {
            type: Date,
        },
        lastPushAt: {
            type: Date,
        },
        lastPullAt: {
            type: Date,
        },
        syncStatus: {
            type: String,
            required: true,
            enum: ['idle', 'syncing', 'success', 'error', 'conflict'],
            default: 'idle',
        },
        conflictCount: {
            type: Number,
            required: true,
            default: 0,
        },
        errorMessage: {
            type: String,
        },
        lastErrorAt: {
            type: Date,
        },
        recordCount: {
            type: Number,
        },
        syncToken: {
            type: String,
        },
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
    }
);

// Unique compound index for tableName + userId
SyncMetadataSchema.index({ tableName: 1, userId: 1 }, { unique: true });
SyncMetadataSchema.index({ userId: 1, updatedAt: -1 });

// Pre-save hook to increment version on updates
SyncMetadataSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const SyncMetadata = mongoose.model<ISyncMetadata>('SyncMetadata', SyncMetadataSchema);

