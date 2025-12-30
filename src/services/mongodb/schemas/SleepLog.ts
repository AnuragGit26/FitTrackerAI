import mongoose, { Schema } from 'mongoose';

export interface ISleepLog {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    date: Date;
    bedtime: Date;
    wakeTime: Date;
    duration: number;
    quality: number;
    notes?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const SleepLogSchema = new Schema<ISleepLog>(
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
        bedtime: {
            type: Date,
            required: true,
        },
        wakeTime: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        quality: {
            type: Number,
            required: true,
            min: 1,
            max: 10,
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
SleepLogSchema.index({ userId: 1, date: 1 }, { unique: true });
SleepLogSchema.index({ userId: 1, updatedAt: -1 });
SleepLogSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
SleepLogSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const SleepLog = mongoose.model<ISleepLog>('SleepLog', SleepLogSchema);

