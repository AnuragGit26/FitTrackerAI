import mongoose, { Schema } from 'mongoose';

export interface IWorkout {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    date: Date;
    startTime: Date;
    endTime?: Date;
    exercises: Array<Record<string, unknown>>;
    totalDuration: number;
    totalVolume: number;
    calories?: number;
    notes?: string;
    musclesTargeted: string[];
    workoutType: string;
    mood?: 'great' | 'good' | 'okay' | 'tired' | 'exhausted';
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const WorkoutSchema = new Schema<IWorkout>(
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
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
        },
        exercises: {
            type: [Schema.Types.Mixed] as unknown as typeof Schema.Types.Mixed,
            default: [],
        },
        totalDuration: {
            type: Number,
            required: true,
            default: 0,
        },
        totalVolume: {
            type: Number,
            required: true,
            default: 0,
        },
        calories: {
            type: Number,
        },
        notes: {
            type: String,
        },
        musclesTargeted: {
            type: [String],
            default: [],
        },
        workoutType: {
            type: String,
            required: true,
        },
        mood: {
            type: String,
            enum: ['great', 'good', 'okay', 'tired', 'exhausted'],
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

// Compound indexes for efficient queries
WorkoutSchema.index({ userId: 1, date: 1 });
WorkoutSchema.index({ userId: 1, updatedAt: -1 });
WorkoutSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
WorkoutSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        const currentVersion = (this.get('version') as number) || 1;
        this.set('version', currentVersion + 1);
    }
    next();
});

export const Workout = mongoose.model<IWorkout>('Workout', WorkoutSchema);

