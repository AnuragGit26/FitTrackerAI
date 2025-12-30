import mongoose, { Schema } from 'mongoose';

export interface IMuscleStatus {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    muscle: string;
    lastWorked?: Date | null;
    recoveryStatus: 'fresh' | 'recovering' | 'sore' | 'ready' | 'overworked';
    recoveryPercentage: number;
    workloadScore: number;
    recommendedRestDays: number;
    totalVolumeLast7Days: number;
    trainingFrequency: number;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const MuscleStatusSchema = new Schema<IMuscleStatus>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        muscle: {
            type: String,
            required: true,
        },
        lastWorked: {
            type: Date,
            default: null,
        },
        recoveryStatus: {
            type: String,
            required: true,
            enum: ['fresh', 'recovering', 'sore', 'ready', 'overworked'],
        },
        recoveryPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        workloadScore: {
            type: Number,
            required: true,
            default: 0,
        },
        recommendedRestDays: {
            type: Number,
            required: true,
            default: 0,
        },
        totalVolumeLast7Days: {
            type: Number,
            required: true,
            default: 0,
        },
        trainingFrequency: {
            type: Number,
            required: true,
            default: 0,
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

// Unique compound index for userId + muscle
MuscleStatusSchema.index({ userId: 1, muscle: 1 }, { unique: true });
MuscleStatusSchema.index({ userId: 1, updatedAt: -1 });
MuscleStatusSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
MuscleStatusSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const MuscleStatus = mongoose.model<IMuscleStatus>('MuscleStatus', MuscleStatusSchema);

