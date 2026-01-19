import { dbHelpers, ExerciseUsageHistory } from './database';
import { logger } from '@/utils/logger';

/**
 * Service for tracking and managing exercise usage history
 * Provides recently used and most frequently used exercises
 */
class ExerciseHistoryService {
  private readonly MAX_RECENT = 10; // Maximum number of recent exercises to track
  private recentCache: Map<string, ExerciseUsageHistory[]> = new Map(); // userId -> recent exercises

  /**
   * Record usage of an exercise
   * Automatically increments use count and updates last used timestamp
   */
  async recordUsage(userId: string, exerciseId: string, exerciseName: string): Promise<void> {
    try {
      await dbHelpers.recordExerciseUsage(userId, exerciseId, exerciseName);

      // Invalidate cache for this user
      this.recentCache.delete(userId);

      logger.log(`[ExerciseHistory] Recorded usage of ${exerciseName} (${exerciseId})`);
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to record usage:', error);
      // Don't throw - usage tracking should never break the app
    }
  }

  /**
   * Get recently used exercises (last N exercises used)
   * Returns exercises sorted by most recent first
   */
  async getRecentExercises(userId: string, limit: number = this.MAX_RECENT): Promise<ExerciseUsageHistory[]> {
    try {
      // Check cache first
      const cached = this.recentCache.get(userId);
      if (cached) {
        return cached.slice(0, limit);
      }

      // Load from database
      const recent = await dbHelpers.getExerciseUsageHistory(userId, limit);

      // Update cache
      this.recentCache.set(userId, recent);

      logger.log(`[ExerciseHistory] Loaded ${recent.length} recent exercises for user ${userId}`);
      return recent;
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to get recent exercises:', error);
      return [];
    }
  }

  /**
   * Get most frequently used exercises
   * Returns exercises sorted by use count (highest first)
   */
  async getMostUsed(userId: string, limit: number = 10): Promise<ExerciseUsageHistory[]> {
    try {
      const mostUsed = await dbHelpers.getMostUsedExercises(userId, limit);
      logger.log(`[ExerciseHistory] Loaded ${mostUsed.length} most used exercises for user ${userId}`);
      return mostUsed;
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to get most used exercises:', error);
      return [];
    }
  }

  /**
   * Get usage statistics for a specific exercise
   */
  async getExerciseStats(userId: string, exerciseId: string): Promise<ExerciseUsageHistory | null> {
    try {
      const id = `${userId}-${exerciseId}`;
      const stats = await dbHelpers.getExerciseUsageHistory(userId, 1000); // Get all
      return stats.find(s => s.id === id) || null;
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to get exercise stats:', error);
      return null;
    }
  }

  /**
   * Check if an exercise was recently used (within last N exercises)
   */
  async wasRecentlyUsed(userId: string, exerciseId: string, withinLast: number = 5): Promise<boolean> {
    try {
      const recent = await this.getRecentExercises(userId, withinLast);
      return recent.some(r => r.exerciseId === exerciseId);
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to check if recently used:', error);
      return false;
    }
  }

  /**
   * Get exercises paired with a specific exercise
   * Returns exercises that were frequently used in the same workout sessions
   */
  async getPairedExercises(userId: string, exerciseId: string, limit: number = 5): Promise<string[]> {
    // TODO: Implement by analyzing workout history to find exercises
    // that frequently appear together in the same workout
    // For now, return empty array
    logger.log(`[ExerciseHistory] getPairedExercises not yet implemented`);
    return [];
  }

  /**
   * Clear cache for a user (useful on logout)
   */
  clearCache(userId: string): void {
    this.recentCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.recentCache.clear();
  }

  /**
   * Preload recent exercises into cache
   * Call this on app startup for better UX
   */
  async preloadRecent(userId: string): Promise<void> {
    try {
      await this.getRecentExercises(userId);
      logger.log(`[ExerciseHistory] Preloaded recent exercises for user ${userId}`);
    } catch (error) {
      logger.error('[ExerciseHistory] Failed to preload recent exercises:', error);
    }
  }
}

export const exerciseHistoryService = new ExerciseHistoryService();
