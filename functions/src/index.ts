/**
 * Firebase Cloud Functions for FitTrackAI
 *
 * This module exports all Cloud Functions for the application:
 * - dailyNotifications: Scheduled function that runs daily at 9 AM IST
 *
 * To deploy: npm run deploy
 * To test locally: npm run serve
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all functions
export { dailyNotifications } from './daily-notifications';

// Future functions can be added here:
// export { cleanupOldData } from './cleanup-old-data';
// export { sendWeeklySummary } from './weekly-summary';
// export { processWorkoutAnalytics } from './analytics';
