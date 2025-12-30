import mongoose, { Schema } from 'mongoose';

export interface IWorkoutTemplate {
    _id?: mongoose.Types.ObjectId;
    id: string;
    userId: string;
    name: string;
    category: 'strength' | 'hypertrophy' | 'cardio' | 'home' | 'flexibility';
    description?: string;
    imageUrl?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    daysPerWeek?: number;
    exercises: Array<Record<string, unknown>>;
    estimatedDuration: number;
    musclesTargeted: string[];
    isFeatured?: boolean;
    isTrending?: boolean;
    matchPercentage?: number;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const WorkoutTemplateSchema = new Schema<IWorkoutTemplate>(
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
        name: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['strength', 'hypertrophy', 'cardio', 'home', 'flexibility'],
        },
        description: {
            type: String,
        },
        imageUrl: {
            type: String,
        },
        difficulty: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
        },
        daysPerWeek: {
            type: Number,
        },
        exercises: {
            type: [Schema.Types.Mixed] as unknown as typeof Schema.Types.Mixed,
            default: [],
        },
        estimatedDuration: {
            type: Number,
            required: true,
        },
        musclesTargeted: {
            type: [String],
            default: [],
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isTrending: {
            type: Boolean,
            default: false,
        },
        matchPercentage: {
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
WorkoutTemplateSchema.index({ userId: 1, category: 1 });
WorkoutTemplateSchema.index({ userId: 1, updatedAt: -1 });
WorkoutTemplateSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
WorkoutTemplateSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        const currentVersion = (this.get('version') as number) || 1;
        this.set('version', currentVersion + 1);
    }
    next();
});

export const WorkoutTemplate = mongoose.model<IWorkoutTemplate>('WorkoutTemplate', WorkoutTemplateSchema);

