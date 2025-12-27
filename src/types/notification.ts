/**
 * Notification types and interfaces for FitTrackAI
 * Note: This uses 'Notification' as the interface name. In TypeScript, interfaces
 * are compile-time only and won't conflict with the browser's global Notification API.
 */

export type NotificationType =
    | 'workout_reminder'
    | 'muscle_recovery'
    | 'ai_insight'
    | 'system'
    | 'achievement';

export interface Notification {
    id: string; // UUID
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
    isRead: boolean;
    readAt?: number | null; // timestamp
    createdAt: number; // timestamp
    version?: number;
    deletedAt?: number | null; // timestamp
}

export interface NotificationData {
    // Workout reminder data
    workoutId?: string;
    workoutName?: string;
    scheduledTime?: number; // timestamp

    // Muscle recovery data
    muscle?: string;
    recoveryPercentage?: number;
    recoveryStatus?: string;

    // AI insight data
    insightType?: string;
    insightId?: string;

    // Achievement data
    achievementType?: string;
    achievementValue?: number | string;

    // System notification data
    actionUrl?: string;
    actionLabel?: string;

    // Generic data
    [key: string]: unknown;
}

export interface NotificationCreateInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
}

export interface NotificationUpdateInput {
    isRead?: boolean;
    readAt?: number | null;
    deletedAt?: number | null;
}

export interface NotificationFilters {
    userId: string;
    isRead?: boolean;
    type?: NotificationType;
    limit?: number;
    offset?: number;
}

