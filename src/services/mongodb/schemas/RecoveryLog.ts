import mongoose, { Schema } from 'mongoose';

export interface IRecoveryLog {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    date: Date;
    overallRecovery: number;
    stressLevel: number;
    energyLevel: number;
    soreness: number;
    readinessToTrain: 'full-power' | 'light' | 'rest-day';
    notes?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const RecoveryLogSchema = new Schema<IRecoveryLog>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        overallRecovery: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        stressLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        energyLevel: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        soreness: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
        },
        readinessToTrain: {
            type: String,
            required: true,
            enum: ['full-power', 'light', 'rest-day'],
        },
        notes: {
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

// Unique compound index for userId + date
RecoveryLogSchema.index({ userId: 1, date: 1 }, { unique: true });
RecoveryLogSchema.index({ userId: 1, updatedAt: -1 });
RecoveryLogSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
RecoveryLogSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const RecoveryLog = mongoose.model<IRecoveryLog>('RecoveryLog', RecoveryLogSchema);

