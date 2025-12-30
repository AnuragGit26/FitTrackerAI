import mongoose, { Schema } from 'mongoose';

export interface INotification {
    _id?: mongoose.Types.ObjectId;
    id: string;
    userId: string;
    type: 'workout_reminder' | 'muscle_recovery' | 'ai_insight' | 'system' | 'achievement';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    isRead: boolean;
    readAt?: Date | null;
    version?: number;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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
        type: {
            type: String,
            required: true,
            enum: ['workout_reminder', 'muscle_recovery', 'ai_insight', 'system', 'achievement'],
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        data: {
            type: Schema.Types.Mixed,
        },
        isRead: {
            type: Boolean,
            required: true,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
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
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, updatedAt: -1 });
NotificationSchema.index({ userId: 1, deletedAt: 1 });

// Pre-save hook to increment version on updates
NotificationSchema.pre('save', function (next) {
    if (this.isModified() && !this.isNew) {
        this.version = (this.version || 1) + 1;
    }
    next();
});

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

