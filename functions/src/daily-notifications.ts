import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Daily notification function
 * Runs every day at 8 AM IST to send workout reminders via Chrome push notifications
 *
 * This function:
 * 1. Queries Firestore for users with workout reminders enabled
 * 2. Checks planned workouts scheduled for today
 * 3. Identifies users who haven't logged a workout in the past 3 days
 * 4. Sends push notifications via Firebase Cloud Messaging (FCM) to Chrome browsers
 *
 * Push notifications are delivered through the service worker and displayed as Chrome notifications
 */
export const dailyNotifications = functions
  .region('asia-south1') // Match Firestore region
  .pubsub
  .schedule('30 2 * * *') // Every day at 8 AM IST (2:30 AM UTC)
  .timeZone('UTC')
  .onRun(async (_context) => {
    // const db = admin.firestore();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;
    const threeDaysAgo = now.getTime() - 3 * 24 * 60 * 60 * 1000;

    try {
      // Query for users (we'll need to implement user settings in Firestore)
      // For now, this is a placeholder that logs the execution

      functions.logger.info('Daily notifications function started', {
        timestamp: now.toISOString(),
        todayStart,
        todayEnd,
        threeDaysAgo,
      });

      // TODO: Implement actual notification logic when user settings are in Firestore
      //
      // Implementation Guide for Chrome Push Notifications:
      //
      // 1. Store FCM tokens in Firestore user_profiles:
      //    - Add fcmToken field to user_profiles collection
      //    - Update token when user enables notifications in the app
      //    - Token is obtained via: messaging.getToken() in the web app
      //
      // 2. Query users with notifications enabled:
      //    const db = admin.firestore();
      //    const usersSnapshot = await db.collection('user_profiles')
      //      .where('notificationSettings.workoutReminderEnabled', '==', true)
      //      .get();
      //
      // 3. For each user, check planned workouts and send notifications:
      //    for (const userDoc of usersSnapshot.docs) {
      //      const userId = userDoc.id;
      //      const fcmToken = userDoc.data().fcmToken;
      //
      //      if (!fcmToken) continue; // Skip users without FCM token
      //
      //      // Check for planned workouts today
      //      const plannedWorkouts = await db.collection('planned_workouts')
      //        .where('userId', '==', userId)
      //        .where('scheduledTime', '>=', todayStart)
      //        .where('scheduledTime', '<', todayEnd)
      //        .get();
      //
      //      if (!plannedWorkouts.empty) {
      //        // Send Chrome push notification via FCM
      //        await admin.messaging().send({
      //          token: fcmToken,
      //          notification: {
      //            title: '💪 Workout Reminder',
      //            body: `You have ${plannedWorkouts.size} workout(s) planned for today!`,
      //            icon: '/fittrackAI_icon.png',
      //          },
      //          webpush: {
      //            fcmOptions: {
      //              link: 'https://fittrack.ai/planner',
      //            },
      //            notification: {
      //              badge: '/fittrackAI_icon.png',
      //              vibrate: [200, 100, 200],
      //              requireInteraction: false,
      //              tag: 'workout-reminder',
      //              renotify: true,
      //            },
      //          },
      //        });
      //      }
      //
      //      // Check if user hasn't worked out recently
      //      const recentWorkouts = await db.collection('workouts')
      //        .where('userId', '==', userId)
      //        .where('completedAt', '>=', threeDaysAgo)
      //        .limit(1)
      //        .get();
      //
      //      if (recentWorkouts.empty) {
      //        // Send motivational notification
      //        await admin.messaging().send({
      //          token: fcmToken,
      //          notification: {
      //            title: '🔥 Time to Get Moving!',
      //            body: "You haven't logged a workout in 3 days. Let's stay consistent!",
      //            icon: '/fittrackAI_icon.png',
      //          },
      //          webpush: {
      //            fcmOptions: {
      //              link: 'https://fittrack.ai/workouts',
      //            },
      //            notification: {
      //              badge: '/fittrackAI_icon.png',
      //              vibrate: [200, 100, 200],
      //              requireInteraction: true, // Keep visible until user interacts
      //              tag: 'motivational-reminder',
      //              renotify: true,
      //            },
      //          },
      //        });
      //      }
      //    }

      functions.logger.info('Daily notifications function completed successfully');
      return null;
    } catch (error) {
      functions.logger.error('Error in daily notifications function:', error);
      throw error;
    }
  });

/**
 * Helper function to send Chrome push notifications via FCM
 *
 * Chrome push notifications work through:
 * 1. Firebase Cloud Messaging (FCM) sends the notification
 * 2. Service worker receives the notification
 * 3. Chrome displays the notification to the user
 *
 * @param fcmToken - The FCM token for the user's Chrome browser
 * @param notification - The notification payload with title, body, and optional actions
 * @param link - The URL to open when notification is clicked
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _sendChromeNotification(
  fcmToken: string,
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
  },
  link?: string
): Promise<void> {
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      webpush: {
        fcmOptions: {
          link: link || 'https://fittrack.ai',
        },
        notification: {
          icon: notification.icon || '/fittrackAI_icon.png',
          badge: notification.badge || '/fittrackAI_icon.png',
          vibrate: [200, 100, 200],
          requireInteraction: notification.requireInteraction || false,
          tag: notification.tag || 'fittrack-notification',
          renotify: true,
          // Actions can be added here for interactive notifications
          // actions: [
          //   { action: 'view', title: 'View Workout' },
          //   { action: 'dismiss', title: 'Dismiss' },
          // ],
        },
      },
    });

    functions.logger.info('Chrome push notification sent successfully', {
      title: notification.title,
      link,
    });
  } catch (error) {
    functions.logger.error('Error sending Chrome push notification:', error);
    throw error;
  }
}
