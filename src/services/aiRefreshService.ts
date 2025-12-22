import { aiCacheManager } from './aiCacheManager';
import { workoutEventTracker } from './workoutEventTracker';
import { aiCallManager } from './aiCallManager';
import { InsightType } from './aiCacheManager';

interface RefreshRequest {
  insightType: InsightType;
  fingerprint: string;
  generateFn: () => Promise<any>;
  priority?: number;
}

class AIRefreshService {
  private pendingRefreshes: Map<string, Promise<any>> = new Map();
  private refreshQueue: RefreshRequest[] = [];
  private isProcessingQueue = false;

  /**
   * Check if refresh is needed based on 24hr rule and new workouts
   */
  async shouldRefresh(
    insightType: InsightType,
    fingerprint: string,
    currentWorkoutId: number | null,
    userId?: string
  ): Promise<{ shouldRefresh: boolean; reason?: string }> {
    return aiCacheManager.shouldRefresh(
      insightType,
      currentWorkoutId,
      fingerprint,
      userId
    );
  }

  /**
   * Refresh AI insights if conditions are met
   */
  async refreshIfNeeded<T>(
    insightType: InsightType,
    fingerprint: string,
    generateFn: () => Promise<T>,
    userId?: string,
    priority: number = 0
  ): Promise<T> {
    // Get current workout ID
    const currentWorkoutId = workoutEventTracker.getLastProcessedWorkoutId();

    // Check if refresh is needed
    const { shouldRefresh, reason } = await this.shouldRefresh(
      insightType,
      fingerprint,
      currentWorkoutId,
      userId
    );

    if (!shouldRefresh) {
      // Try to get from cache
      const cached = await aiCallManager.getCached<T>(fingerprint, insightType);
      if (cached) {
        console.log(`[AI Refresh] Using cached ${insightType} (${reason})`);
        return cached;
      }
    }

    // Create a unique key for this refresh request
    const refreshKey = `${insightType}:${fingerprint}`;

    // Check if there's already a pending refresh for this key
    if (this.pendingRefreshes.has(refreshKey)) {
      console.log(`[AI Refresh] Waiting for pending ${insightType} refresh`);
      return this.pendingRefreshes.get(refreshKey)!;
    }

    // Create refresh promise
    const refreshPromise = this.executeRefresh(
      insightType,
      fingerprint,
      generateFn,
      currentWorkoutId,
      userId,
      priority
    );

    // Store promise to prevent duplicate requests
    this.pendingRefreshes.set(refreshKey, refreshPromise);

    try {
      const result = await refreshPromise;
      return result;
    } finally {
      // Remove from pending after completion
      this.pendingRefreshes.delete(refreshKey);
    }
  }

  /**
   * Execute the actual refresh
   */
  private async executeRefresh<T>(
    insightType: InsightType,
    fingerprint: string,
    generateFn: () => Promise<T>,
    currentWorkoutId: number | null,
    userId?: string,
    priority: number = 0
  ): Promise<T> {
    console.log(`[AI Refresh] Refreshing ${insightType} (fingerprint: ${fingerprint.substring(0, 8)}...)`);

    try {
      // Execute AI call with caching
      const result = await aiCallManager.executeWithCache(
        fingerprint,
        insightType,
        generateFn,
        priority
      );

      // Update cache metadata
      await aiCacheManager.updateCacheMetadata(
        insightType,
        fingerprint,
        currentWorkoutId,
        userId
      );

      console.log(`[AI Refresh] Successfully refreshed ${insightType}`);
      return result;
    } catch (error) {
      console.error(`[AI Refresh] Failed to refresh ${insightType}:`, error);
      throw error;
    }
  }

  /**
   * Force refresh (bypasses 24hr rule and cache)
   */
  async forceRefresh<T>(
    insightType: InsightType,
    fingerprint: string,
    generateFn: () => Promise<T>,
    userId?: string,
    priority: number = 0
  ): Promise<T> {
    // Clear cache for this insight type
    await aiCacheManager.clearCacheMetadata(insightType, userId);

    // Get current workout ID
    const currentWorkoutId = workoutEventTracker.getLastProcessedWorkoutId();

    // Execute refresh
    return this.executeRefresh(
      insightType,
      fingerprint,
      generateFn,
      currentWorkoutId,
      userId,
      priority
    );
  }

  /**
   * Queue a refresh request (for background processing)
   */
  queueRefresh(request: RefreshRequest): void {
    this.refreshQueue.push(request);
    this.processQueue();
  }

  /**
   * Process queued refresh requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.refreshQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Sort by priority (higher first)
    this.refreshQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    while (this.refreshQueue.length > 0) {
      const request = this.refreshQueue.shift()!;
      
      try {
        await this.refreshIfNeeded(
          request.insightType,
          request.fingerprint,
          request.generateFn,
          undefined,
          request.priority
        );
      } catch (error) {
        console.error(`[AI Refresh] Failed to process queued refresh for ${request.insightType}:`, error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get time until next allowed refresh
   */
  async getTimeUntilRefresh(
    insightType: InsightType,
    userId?: string
  ): Promise<number> {
    return aiCacheManager.getTimeUntilRefresh(insightType, userId);
  }

  /**
   * Clear all cache metadata
   */
  async clearCache(insightType?: InsightType, userId?: string): Promise<void> {
    await aiCacheManager.clearCacheMetadata(insightType, userId);
    aiCallManager.invalidateCache();
  }
}

export const aiRefreshService = new AIRefreshService();

