/**
 * Data Refresh Utility
 *
 * Provides centralized data refresh functionality after import operations.
 * Handles Firestore sync completion tracking and store updates without page reload.
 */

import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { firestoreSyncService } from '@/services/firestoreSyncService';
import { logger } from '@/utils/logger';

export interface RefreshOptions {
  includeSync?: boolean; // Wait for Firestore sync to complete
  syncTimeoutMs?: number; // Default 10000 (10 seconds)
}

/**
 * Refresh all app data after import
 *
 * @param userId - User ID to refresh data for
 * @param options - Refresh options (sync, timeout)
 * @returns Promise that resolves when refresh is complete
 */
export async function refreshAllAppData(
  userId: string,
  options: RefreshOptions = {}
): Promise<void> {
  const { includeSync = true, syncTimeoutMs = 10000 } = options;

  try {
    logger.info('[dataRefresh] Starting data refresh for user:', userId);

    // Trigger Firestore sync if requested
    if (includeSync) {
      await waitForSyncCompletion(userId, syncTimeoutMs);
    }

    // Refresh all stores in parallel
    const refreshPromises = [
      useUserStore.getState().initializeUser({ id: userId }),
      useWorkoutStore.getState().loadWorkouts(userId),
    ];

    const results = await Promise.allSettled(refreshPromises);

    // Log any refresh failures (but don't throw)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`[dataRefresh] Store refresh ${index} failed:`, result.reason);
      }
    });

    logger.info('[dataRefresh] Successfully refreshed all app data');
  } catch (error) {
    logger.error('[dataRefresh] Failed to refresh app data:', error);
    throw error;
  }
}

/**
 * Wait for Firestore sync to complete
 *
 * @param userId - User ID to sync data for
 * @param timeoutMs - Maximum time to wait for sync
 * @returns Promise that resolves when sync completes or times out
 */
async function waitForSyncCompletion(
  userId: string,
  timeoutMs: number
): Promise<void> {
  logger.info('[dataRefresh] Checking Firestore sync status...');

  // Check if sync is already in progress
  if (firestoreSyncService.getIsSyncing()) {
    logger.info('[dataRefresh] Sync already in progress, waiting...');

    // Poll for sync completion with timeout
    const startTime = Date.now();
    while (firestoreSyncService.getIsSyncing()) {
      if (Date.now() - startTime > timeoutMs) {
        logger.warn('[dataRefresh] Sync timeout reached, proceeding anyway');
        break;
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('[dataRefresh] Existing sync completed');
  } else {
    // Trigger sync and wait for completion
    logger.info('[dataRefresh] Triggering new sync...');
    try {
      await firestoreSyncService.sync(userId, { direction: 'push' });
      logger.info('[dataRefresh] Sync completed successfully');
    } catch (error) {
      logger.warn('[dataRefresh] Sync failed, but continuing refresh:', error);
      // Don't throw - allow data refresh to continue even if sync fails
      // Data is still saved locally, sync will be retried automatically
    }
  }
}
