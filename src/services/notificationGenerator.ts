/**
 * Notification Generator Service
 * Creates notifications for various events in FitTrackAI
 */

import { notificationService } from './notificationService';
import { NotificationCreateInput, NotificationType } from '@/types/notification';
import { PlannedWorkout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';

class NotificationGenerator {
    /**
     * Generate workout reminder notification
     */
    async createWorkoutReminder(
        userId: string,
        plannedWorkout: PlannedWorkout
    ): Promise<void> {
        const scheduledTime = plannedWorkout.scheduledTime
            ? new Date(plannedWorkout.scheduledTime)
            : null;

        if (!scheduledTime) {
            return;
        }

        const input: NotificationCreateInput = {
            userId,
            type: 'workout_reminder',
            title: 'Workout Reminder',
            message: `Your "${plannedWorkout.workoutName}" workout is scheduled ${this.formatTimeUntil(scheduledTime)}.`,
            data: {
                workoutId: plannedWorkout.id,
                workoutName: plannedWorkout.workoutName,
                scheduledTime: scheduledTime.getTime(),
            },
        };

        await notificationService.createNotification(input);
    }

    /**
     * Generate muscle recovery notification
     */
    async createMuscleRecoveryNotification(
        userId: string,
        muscleStatus: MuscleStatus
    ): Promise<void> {
        const input: NotificationCreateInput = {
            userId,
            type: 'muscle_recovery',
            title: 'Muscle Ready',
            message: `Your ${this.formatMuscleName(muscleStatus.muscle)} is fully recovered and ready for training!`,
            data: {
                muscle: muscleStatus.muscle,
                recoveryPercentage: muscleStatus.recoveryPercentage,
                recoveryStatus: muscleStatus.recoveryStatus,
            },
        };

        await notificationService.createNotification(input);
    }

    /**
     * Generate AI insight notification
     */
    async createAIInsightNotification(
        userId: string,
        insightType: string,
        message: string
    ): Promise<void> {
        const input: NotificationCreateInput = {
            userId,
            type: 'ai_insight',
            title: 'New AI Insight',
            message,
            data: {
                insightType,
            },
        };

        await notificationService.createNotification(input);
    }

    /**
     * Generate achievement notification
     */
    async createAchievementNotification(
        userId: string,
        achievementType: 'pr' | 'streak' | 'milestone',
        details: {
            exerciseName?: string;
            weight?: number;
            reps?: number;
            streakDays?: number;
            milestone?: string;
        }
    ): Promise<void> {
        let title: string;
        let message: string;

        switch (achievementType) {
            case 'pr':
                title = 'New Personal Record!';
                message = `Congratulations! You set a new PR for ${details.exerciseName}: ${details.weight}kg × ${details.reps} reps`;
                break;
            case 'streak':
                title = 'Workout Streak!';
                message = `Amazing! You've completed ${details.streakDays} days in a row. Keep it up!`;
                break;
            case 'milestone':
                title = 'Milestone Achieved!';
                message = details.milestone || 'You reached a new milestone!';
                break;
            default:
                return;
        }

        const input: NotificationCreateInput = {
            userId,
            type: 'achievement',
            title,
            message,
            data: {
                achievementType,
                achievementValue: details.weight || details.streakDays || details.milestone,
                exerciseName: details.exerciseName,
                weight: details.weight,
                reps: details.reps,
                streakDays: details.streakDays,
            },
        };

        await notificationService.createNotification(input);
    }

    /**
     * Generate system notification
     */
    async createSystemNotification(
        userId: string,
        title: string,
        message: string,
        actionUrl?: string,
        actionLabel?: string
    ): Promise<void> {
        const input: NotificationCreateInput = {
            userId,
            type: 'system',
            title,
            message,
            data: {
                actionUrl,
                actionLabel,
            },
        };

        await notificationService.createNotification(input);
    }

    /**
     * Generate sync status notification
     */
    async createSyncStatusNotification(
        userId: string,
        status: 'success' | 'error' | 'conflict',
        message: string
    ): Promise<void> {
        const title =
            status === 'success'
                ? 'Sync Complete'
                : status === 'error'
                    ? 'Sync Error'
                    : 'Sync Conflicts';

        await this.createSystemNotification(userId, title, message);
    }

    /**
     * Format time until scheduled workout
     */
    private formatTimeUntil(date: Date): string {
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `in ${days} day${days > 1 ? 's' : ''}`;
        }
        if (hours > 0) {
            return `in ${hours} hour${hours > 1 ? 's' : ''}`;
        }
        if (minutes > 0) {
            return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        return 'now';
    }

    /**
     * Format muscle name for display
     */
    private formatMuscleName(muscle: string): string {
        return muscle
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}

export const notificationGenerator = new NotificationGenerator();

