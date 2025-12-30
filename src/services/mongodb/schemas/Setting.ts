import mongoose, { Schema } from 'mongoose';

export interface ISetting {
    _id?: mongoose.Types.ObjectId;
    userId: string;
    key: string;
    value: Record<string, unknown>;
    version: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        key: {
            type: String,
            required: true,
        },
        value: {
            type: Schema.Types.Mixed,
            required: true,
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

// Unique compound index for userId + key
SettingSchema.index({ userId: 1, key: 1 }, { unique: true });
SettingSchema.index({ userId: 1, updatedAt: -1 });
SettingSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
SettingSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);

