import mongoose, { Schema } from 'mongoose';

export interface IPlannedWorkout {
    _id?: mongoose.Types.ObjectId;
    id: string;
    userId: string;
    scheduledDate: Date;
    scheduledTime?: Date;
    templateId?: string;
    workoutName: string;
    category: 'strength' | 'hypertrophy' | 'cardio' | 'home' | 'flexibility';
    estimatedDuration: number;
    exercises: Array<Record<string, unknown>>;
    musclesTargeted: string[];
    notes?: string;
    isCompleted: boolean;
    completedWorkoutId?: number;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const PlannedWorkoutSchema = new Schema<IPlannedWorkout>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        scheduledDate: {
            type: Date,
            required: true,
            index: true,
        },
        scheduledTime: {
            type: Date,
        },
        templateId: {
            type: String,
        },
        workoutName: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['strength', 'hypertrophy', 'cardio', 'home', 'flexibility'],
        },
        estimatedDuration: {
            type: Number,
            required: true,
        },
        exercises: {
            type: [Schema.Types.Mixed] as unknown as typeof Schema.Types.Mixed,
            default: [],
        },
        musclesTargeted: {
            type: [String],
            default: [],
        },
        notes: {
            type: String,
        },
        isCompleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        completedWorkoutId: {
            type: Number,
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
PlannedWorkoutSchema.index({ userId: 1, scheduledDate: 1 });
PlannedWorkoutSchema.index({ userId: 1, updatedAt: -1 });
PlannedWorkoutSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
PlannedWorkoutSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        const currentVersion = (this.get('version') as number) || 1;
        this.set('version', currentVersion + 1);
    }
    next();
});

export const PlannedWorkout = mongoose.model<IPlannedWorkout>('PlannedWorkout', PlannedWorkoutSchema);

