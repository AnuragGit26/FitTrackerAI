import { PlannedWorkout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import type { Notification, NotificationCreateInput, NotificationFilters, NotificationType } from '@/types/notification';
import { dbHelpers } from './database';
import { getSupabaseClientWithAuth } from './supabaseClient';
import { requireUserId } from '@/utils/userIdValidation';

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
      return (stored as Record<string, { recoveryPercentage: number; recoveryStatus: string; notifiedAt: number }>) || {};
    } catch (error) {
      return {} as Record<string, { recoveryPercentage: number; recoveryStatus: string; notifiedAt: number }>;
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

  // ============================================================================
  // In-App Notification CRUD Operations
  // ============================================================================

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Create a new notification and store it in IndexedDB and Supabase
   */
  async createNotification(input: NotificationCreateInput): Promise<Notification> {
    const notification: Notification = {
      id: this.generateUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      data: input.data || {},
      isRead: false,
      readAt: null,
      createdAt: Date.now(),
      version: 1,
      deletedAt: null,
    };

    // Save to IndexedDB
    await dbHelpers.saveNotification(notification);

    // Try to sync to Supabase (non-blocking)
    this.syncToSupabase(notification).catch(error => {
      console.error('[NotificationService] Failed to sync notification to Supabase:', error);
    });

    return notification;
  }

  /**
   * Get notifications with optional filters
   */
  async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
    return await dbHelpers.getAllNotifications(filters.userId, {
      isRead: filters.isRead,
      limit: filters.limit,
    });
  }

  /**
   * Get a single notification by ID
   */
  async getNotification(id: string): Promise<Notification | undefined> {
    return await dbHelpers.getNotification(id);
  }

  /**
   * Get count of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      return 0;
    }
    return await dbHelpers.getUnreadNotificationsCount(userId);
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await dbHelpers.markNotificationAsRead(id);

    // Get the notification to sync to Supabase
    const notification = await dbHelpers.getNotification(id);
    if (notification) {
      this.syncToSupabase(notification).catch(error => {
        console.error('[NotificationService] Failed to sync notification update to Supabase:', error);
      });
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const count = await dbHelpers.markAllNotificationsAsRead(userId);

    // Sync all updated notifications to Supabase
    const notifications = await dbHelpers.getAllNotifications(userId, { isRead: false });
    await Promise.all(
      notifications.map(n => this.syncToSupabase(n).catch(error => {
        console.error('[NotificationService] Failed to sync notification update to Supabase:', error);
      }))
    );

    return count;
  }

  /**
   * Delete a notification (soft delete)
   */
  async deleteNotification(id: string): Promise<void> {
    await dbHelpers.deleteNotification(id);

    // Get the notification to sync to Supabase
    const notification = await dbHelpers.getNotification(id);
    if (notification) {
      this.syncToSupabase(notification).catch(error => {
        console.error('[NotificationService] Failed to sync notification delete to Supabase:', error);
      });
    }
  }

  /**
   * Permanently delete a notification
   */
  async deleteNotificationPermanently(id: string): Promise<void> {
    await dbHelpers.deleteNotificationPermanently(id);
  }

  /**
   * Sync notification to Supabase (internal helper)
   */
  private async syncToSupabase(notification: Notification): Promise<void> {
    try {
      // Validate userId
      const userId = requireUserId(notification.userId, {
        functionName: 'syncToSupabase',
        additionalInfo: { notificationId: notification.id },
      });

      const supabase = await getSupabaseClientWithAuth(userId);

      const supabaseNotification = {
        id: notification.id,
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        is_read: notification.isRead,
        read_at: notification.readAt ? new Date(notification.readAt).toISOString() : null,
        version: notification.version || 1,
        deleted_at: notification.deletedAt ? new Date(notification.deletedAt).toISOString() : null,
        created_at: new Date(notification.createdAt).toISOString(),
      };

      // Upsert to Supabase using user-scoped query
      const { error } = await supabase
        .from('notifications')
        .upsert(supabaseNotification, {
          onConflict: 'id',
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      // Log error but don't throw - sync failures shouldn't break the app
      console.error('[NotificationService] Failed to sync notification to Supabase:', error);
    }
  }

  /**
   * Pull notifications from Supabase and merge with local
   * Only pulls notifications that don't exist locally or have newer versions
   */
  async pullFromSupabase(userId: string): Promise<number> {
    try {
      // Validate userId
      const validatedUserId = requireUserId(userId, {
        functionName: 'pullFromSupabase',
        additionalInfo: { operation: 'pull_notifications' },
      });

      const supabase = await getSupabaseClientWithAuth(validatedUserId);

      // Get all notifications from Supabase using user-scoped query
      // Only get unread notifications or notifications from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', validatedUserId)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      // Get existing notifications from IndexedDB to check for duplicates
      const existingNotifications = await dbHelpers.getAllNotifications(validatedUserId);
      const existingIds = new Set(existingNotifications.map(n => n.id));

      // Convert Supabase format to local format and save only new/updated notifications
      const notificationsToSave: Notification[] = [];
      
      for (const n of data) {
        const existing = existingNotifications.find(ex => ex.id === n.id);
        const remoteVersion = n.version || 1;
        const localVersion = existing?.version || 0;

        // Only save if notification doesn't exist locally or remote version is newer
        if (!existing || remoteVersion > localVersion) {
          notificationsToSave.push({
            id: n.id,
            userId: n.user_id,
            type: n.type as NotificationType,
            title: n.title,
            message: n.message,
            data: n.data || {},
            isRead: n.is_read,
            readAt: n.read_at ? new Date(n.read_at).getTime() : null,
            createdAt: new Date(n.created_at).getTime(),
            version: remoteVersion,
            deletedAt: n.deleted_at ? new Date(n.deleted_at).getTime() : null,
          });
        }
      }

      // Save all new/updated notifications to IndexedDB
      if (notificationsToSave.length > 0) {
        await Promise.all(
          notificationsToSave.map(n => dbHelpers.saveNotification(n))
        );
      }

      return notificationsToSave.length;
    } catch (error) {
      console.error('[NotificationService] Failed to pull notifications from Supabase:', error);
      throw error;
    }
  }

  /**
   * Start periodic notification pulling from Supabase
   * Checks for new notifications every hour
   */
  startPeriodicPull(userId: string, intervalMinutes: number = 60): () => void {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const pullNotifications = async () => {
      try {
        await this.pullFromSupabase(userId);
      } catch (error) {
        console.error('[NotificationService] Periodic pull failed:', error);
      }
    };

    // Pull immediately on start
    pullNotifications();

    // Set up interval
    intervalId = setInterval(pullNotifications, intervalMinutes * 60 * 1000);

    // Return cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }
}

export const notificationService = new NotificationService();

