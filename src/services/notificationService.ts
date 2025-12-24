import { PlannedWorkout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';

interface ScheduledNotification {
  id: string;
  type: 'workout_reminder' | 'muscle_recovery';
  scheduledTime: number;
  data: {
    workoutId?: string;
    workoutName?: string;
    muscle?: string;
  };
}

class NotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async initialize() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        this.swRegistration = registration;
      } catch (error) {
        console.error('[NotificationService] Failed to get service worker registration:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  async scheduleWorkoutReminder(plannedWorkout: PlannedWorkout, reminderMinutes: number = 30): Promise<void> {
    if (!this.swRegistration) {
      await this.initialize();
    }

    if (!plannedWorkout.scheduledTime) {
      return;
    }

    const scheduledTime = new Date(plannedWorkout.scheduledTime);
    const reminderTime = new Date(scheduledTime.getTime() - reminderMinutes * 60 * 1000);
    const now = new Date();

    // Only schedule if reminder time is in the future
    if (reminderTime <= now) {
      return;
    }

    const notificationId = `workout-${plannedWorkout.id}`;

    // Store notification metadata in IndexedDB
    const notificationData: ScheduledNotification = {
      id: notificationId,
      type: 'workout_reminder',
      scheduledTime: reminderTime.getTime(),
      data: {
        workoutId: plannedWorkout.id,
        workoutName: plannedWorkout.workoutName,
      },
    };

    try {
      const { dbHelpers } = await import('./database');
      await dbHelpers.setSetting(`notification_${notificationId}`, notificationData);

      // Send message to service worker to schedule notification
      if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage({
          type: 'SCHEDULE_WORKOUT_REMINDER',
          notification: notificationData,
        });
      }
    } catch (error) {
      console.error('[NotificationService] Failed to schedule workout reminder:', error);
    }
  }

  async cancelWorkoutReminder(workoutId: string): Promise<void> {
    const notificationId = `workout-${workoutId}`;

    try {
      // Remove from IndexedDB
      const { dbHelpers } = await import('./database');
      await dbHelpers.deleteSetting(`notification_${notificationId}`);

      // Send message to service worker to cancel
      if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage({
          type: 'CANCEL_WORKOUT_REMINDER',
          notificationId,
        });
      }
    } catch (error) {
      console.error('[NotificationService] Failed to cancel workout reminder:', error);
    }
  }

  async checkAndNotifyRecovery(muscleStatuses: MuscleStatus[]): Promise<void> {
    if (!this.swRegistration) {
      await this.initialize();
    }

    // Check for muscles that just became ready
    const readyMuscles = muscleStatuses.filter(
      (status) => status.recoveryStatus === 'ready' && status.recoveryPercentage >= 100
    );

    if (readyMuscles.length === 0) {
      return;
    }

    // Get last notified statuses from IndexedDB
    const lastNotified = await this.getLastNotifiedRecovery();

    for (const muscle of readyMuscles) {
      const lastNotifiedStatus = lastNotified[muscle.muscle];
      const wasNotReady = !lastNotifiedStatus || lastNotifiedStatus.recoveryPercentage < 100;

      if (wasNotReady) {
        await this.notifyMuscleRecovery(muscle);
        // Update last notified status
        lastNotified[muscle.muscle] = {
          recoveryPercentage: muscle.recoveryPercentage,
          recoveryStatus: muscle.recoveryStatus,
          notifiedAt: Date.now(),
        };
      }
    }

    // Save updated last notified statuses
    const { dbHelpers } = await import('./database');
    await dbHelpers.setSetting('last_notified_recovery', lastNotified);
  }

  private async notifyMuscleRecovery(muscle: MuscleStatus): Promise<void> {
    const notificationId = `recovery-${muscle.muscle}-${Date.now()}`;

    const notificationData: ScheduledNotification = {
      id: notificationId,
      type: 'muscle_recovery',
      scheduledTime: Date.now(),
      data: {
        muscle: muscle.muscle,
      },
    };

    try {
      // Send message to service worker to show notification immediately
      if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage({
          type: 'SHOW_MUSCLE_RECOVERY_NOTIFICATION',
          notification: notificationData,
        });
      }
    } catch (error) {
      console.error('[NotificationService] Failed to notify muscle recovery:', error);
    }
  }

  private async getLastNotifiedRecovery(): Promise<Record<string, { recoveryPercentage: number; recoveryStatus: string; notifiedAt: number }>> {
    try {
      const { dbHelpers } = await import('./database');
      const stored = await dbHelpers.getSetting('last_notified_recovery');
      return stored || {};
    } catch (error) {
      return {};
    }
  }

  async scheduleRecoveryCheck(muscleStatus: MuscleStatus): Promise<void> {
    if (!this.swRegistration) {
      await this.initialize();
    }

    // If muscle is already ready, no need to schedule
    if (muscleStatus.recoveryStatus === 'ready' && muscleStatus.recoveryPercentage >= 100) {
      return;
    }

    // Calculate when muscle will be ready (approximate)
    // This is a rough estimate based on recovery percentage
    const remainingPercentage = 100 - muscleStatus.recoveryPercentage;
    const estimatedHoursUntilReady = (remainingPercentage / 100) * (muscleStatus.recommendedRestDays * 24);
    const checkTime = Date.now() + (estimatedHoursUntilReady * 60 * 60 * 1000);

    const notificationId = `recovery-check-${muscleStatus.muscle}`;

    const notificationData: ScheduledNotification = {
      id: notificationId,
      type: 'muscle_recovery',
      scheduledTime: checkTime,
      data: {
        muscle: muscleStatus.muscle,
      },
    };

    try {
      const { dbHelpers } = await import('./database');
      await dbHelpers.setSetting(`notification_${notificationId}`, notificationData);

      // Register periodic sync for recovery checks
      if (this.swRegistration && 'periodicSync' in this.swRegistration) {
        try {
          const registration = this.swRegistration as ServiceWorkerRegistration & {
            periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
          };
          if (registration.periodicSync) {
            await registration.periodicSync.register('recovery-check', {
              minInterval: 60 * 60 * 1000, // 1 hour
            });
          }
        } catch (error) {
          console.warn('[NotificationService] Periodic sync not supported:', error);
        }
      }
    } catch (error) {
      console.error('[NotificationService] Failed to schedule recovery check:', error);
    }
  }

  async getAllScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const { db } = await import('./database');
      const allSettings = await db.settings
        .where('key')
        .startsWith('notification_')
        .toArray();

      return allSettings
        .map((setting: { value: unknown }) => setting.value as ScheduledNotification)
        .filter((n) => n && n.scheduledTime > Date.now());
    } catch (error) {
      console.error('[NotificationService] Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      const { db, dbHelpers } = await import('./database');
      const allNotifications = await db.settings
        .where('key')
        .startsWith('notification_')
        .toArray();

      await Promise.all(
        allNotifications.map((setting: { key: string }) => dbHelpers.deleteSetting(setting.key))
      );

      // Notify service worker
      if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage({
          type: 'CLEAR_ALL_NOTIFICATIONS',
        });
      }
    } catch (error) {
      console.error('[NotificationService] Failed to clear notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();

