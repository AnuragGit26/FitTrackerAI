import mongoose, { Schema } from 'mongoose';

export interface IUserProfile {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    name: string;
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    goals?: string[];
    equipment?: string[];
    workoutFrequency?: number;
    preferredUnit?: 'kg' | 'lbs';
    defaultRestTime?: number;
    age?: number;
    gender?: 'male' | 'female' | 'other';
    weight?: number;
    height?: number;
    profilePicture?: string;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        experienceLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
        },
        goals: {
            type: [String],
            default: [],
        },
        equipment: {
            type: [String],
            default: [],
        },
        workoutFrequency: {
            type: Number,
        },
        preferredUnit: {
            type: String,
            enum: ['kg', 'lbs'],
        },
        defaultRestTime: {
            type: Number,
        },
        age: {
            type: Number,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
        },
        weight: {
            type: Number,
        },
        height: {
            type: Number,
        },
        profilePicture: {
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

// Pre-save hook to increment version on updates
UserProfileSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);

