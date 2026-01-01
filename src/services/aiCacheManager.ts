import { db, InsightType, AICacheMetadata as DBAICacheMetadata } from './database';

export type { InsightType };

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

class AICacheManager {
    /**
     * Get cache metadata for a specific insight type
     */
    async getCacheMetadata(
        insightType: InsightType,
        userId?: string
    ): Promise<DBAICacheMetadata | null> {
        try {
            const metadata = await db.aiCacheMetadata
                .where('[insightType+userId]')
                .equals([insightType, userId || 'default'])
                .first();

            return metadata || null;
        } catch (error) {
            console.error('Failed to get cache metadata:', error);
            return null;
        }
    }

    /**
     * Update cache metadata after an AI fetch
     */
    async updateCacheMetadata(
        insightType: InsightType,
        fingerprint: string,
        lastWorkoutId: string | null,
        userId?: string
    ): Promise<void> {
        try {
            const now = Date.now();
            const existing = await db.aiCacheMetadata
                .where('[insightType+userId]')
                .equals([insightType, userId || 'default'])
                .first();

            if (existing) {
                await db.aiCacheMetadata.update(existing.id!, {
                    lastFetchTimestamp: now,
                    lastWorkoutId,
                    fingerprint,
                });
            } else {
                await db.aiCacheMetadata.add({
                    insightType,
                    lastFetchTimestamp: now,
                    lastWorkoutId,
                    fingerprint,
                    userId: userId || 'default',
                });
            }
        } catch (error) {
            console.error('Failed to update cache metadata:', error);
        }
    }

    /**
     * Check if 24 hours have passed since last fetch
     */
    async has24HoursPassed(
        insightType: InsightType,
        userId?: string
    ): Promise<boolean> {
        const metadata = await this.getCacheMetadata(insightType, userId);

        if (!metadata) {
            return true; // No previous fetch, allow refresh
        }

        const timeSinceLastFetch = Date.now() - metadata.lastFetchTimestamp;
        return timeSinceLastFetch >= TWENTY_FOUR_HOURS_MS;
    }

    /**
     * Check if there are new workouts since last fetch
     */
    async hasNewWorkouts(
        insightType: InsightType,
        currentWorkoutId: string | null,
        userId?: string
    ): Promise<boolean> {
        const metadata = await this.getCacheMetadata(insightType, userId);

        if (!metadata || !metadata.lastWorkoutId) {
            return currentWorkoutId !== null; // If we have a workout now but no previous, it's new
        }

        if (!currentWorkoutId) {
            return false; // No current workout
        }

        // Compare string IDs - if they're different, there's a new workout
        // Since workout IDs now include datetime, different IDs mean different workouts
        return currentWorkoutId !== metadata.lastWorkoutId;
    }

    /**
     * Check if refresh is needed based on 24hr rule and new workouts
     */
    async shouldRefresh(
        insightType: InsightType,
        currentWorkoutId: string | null,
        fingerprint: string,
        userId?: string
    ): Promise<{ shouldRefresh: boolean; reason?: string }> {
        // Check if fingerprint matches (data hasn't changed)
        const metadata = await this.getCacheMetadata(insightType, userId);

        if (metadata && metadata.fingerprint === fingerprint) {
            // Data hasn't changed, check if 24hr passed
            const has24Hours = await this.has24HoursPassed(insightType, userId);

            if (has24Hours) {
                return {
                    shouldRefresh: true,
                    reason: '24 hours have passed since last fetch',
                };
            }

            // Check for new workouts
            const hasNew = await this.hasNewWorkouts(insightType, currentWorkoutId, userId);

            if (hasNew) {
                return {
                    shouldRefresh: true,
                    reason: 'New workout detected since last fetch',
                };
            }

            return {
                shouldRefresh: false,
                reason: 'No refresh needed - data unchanged and within 24hr window',
            };
        }

        // Fingerprint changed or no metadata - allow refresh
        return {
            shouldRefresh: true,
            reason: metadata ? 'Data fingerprint changed' : 'No previous cache metadata',
        };
    }

    /**
     * Get the last workout ID that was processed for a specific insight type
     */
    async getLastWorkoutId(
        insightType: InsightType,
        userId?: string
    ): Promise<string | null> {
        const metadata = await this.getCacheMetadata(insightType, userId);
        return metadata?.lastWorkoutId || null;
    }

    /**
     * Clear cache metadata for a specific insight type or all types
     */
    async clearCacheMetadata(insightType?: InsightType, userId?: string): Promise<void> {
        try {
            if (insightType) {
                if (userId) {
                    await db.aiCacheMetadata
                        .where('[insightType+userId]')
                        .equals([insightType, userId])
                        .delete();
                } else {
                    await db.aiCacheMetadata
                        .where('insightType')
                        .equals(insightType)
                        .delete();
                }
            } else {
                if (userId) {
                    await db.aiCacheMetadata
                        .where('userId')
                        .equals(userId)
                        .delete();
                } else {
                    await db.aiCacheMetadata.clear();
                }
            }
        } catch (error) {
            console.error('Failed to clear cache metadata:', error);
        }
    }

    /**
     * Get time remaining until next allowed refresh
     */
    async getTimeUntilRefresh(
        insightType: InsightType,
        userId?: string
    ): Promise<number> {
        const metadata = await this.getCacheMetadata(insightType, userId);

        if (!metadata) {
            return 0; // Can refresh immediately
        }

        const timeSinceLastFetch = Date.now() - metadata.lastFetchTimestamp;
        const timeRemaining = TWENTY_FOUR_HOURS_MS - timeSinceLastFetch;

        return Math.max(0, timeRemaining);
    }
}

export const aiCacheManager = new AICacheManager();

