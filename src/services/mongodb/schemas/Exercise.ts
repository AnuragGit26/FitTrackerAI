import mongoose, { Schema } from 'mongoose';

export interface IExercise {
    _id?: mongoose.Types.ObjectId;
    id: string;
    userId?: string | null;
    name: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'olympic' | 'plyometric';
    primaryMuscles: string[];
    secondaryMuscles: string[];
    equipment: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    instructions: string[];
    videoUrl?: string;
    isCustom: boolean;
    trackingType: 'weight_reps' | 'reps_only' | 'cardio' | 'duration';
    anatomyImageUrl?: string;
    strengthlogUrl?: string;
    strengthlogSlug?: string;
    advancedDetails?: Record<string, unknown>;
    muscleCategory?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
    {
        id: {
            type: String,
            required: true,
            unique: true,
        },
        userId: {
            type: String,
            default: null,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['strength', 'cardio', 'flexibility', 'olympic', 'plyometric'],
        },
        primaryMuscles: {
            type: [String],
            default: [],
        },
        secondaryMuscles: {
            type: [String],
            default: [],
        },
        equipment: {
            type: [String],
            default: [],
        },
        difficulty: {
            type: String,
            required: true,
            enum: ['beginner', 'intermediate', 'advanced'],
        },
        instructions: {
            type: [String],
            default: [],
        },
        videoUrl: {
            type: String,
        },
        isCustom: {
            type: Boolean,
            required: true,
            default: false,
        },
        trackingType: {
            type: String,
            required: true,
            enum: ['weight_reps', 'reps_only', 'cardio', 'duration'],
        },
        anatomyImageUrl: {
            type: String,
        },
        strengthlogUrl: {
            type: String,
        },
        strengthlogSlug: {
            type: String,
        },
        advancedDetails: {
            type: Schema.Types.Mixed,
        },
        muscleCategory: {
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
ExerciseSchema.index({ userId: 1, isCustom: 1 });
ExerciseSchema.index({ category: 1 });
ExerciseSchema.index({ userId: 1, updatedAt: -1 });
ExerciseSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
ExerciseSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const Exercise = mongoose.model<IExercise>('Exercise', ExerciseSchema);

