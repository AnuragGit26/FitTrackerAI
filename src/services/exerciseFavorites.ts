import { dbHelpers, ExerciseFavorite } from './database';
import { logger } from '@/utils/logger';

/**
 * Service for managing exercise favorites
 * Provides functionality to star/unstar exercises and retrieve favorite lists
 */
class ExerciseFavoritesService {
  private favoritesCache: Map<string, Set<string>> = new Map(); // userId -> Set of favorited exerciseIds

  /**
   * Load favorites for a user from database
   */
  async loadFavorites(userId: string): Promise<ExerciseFavorite[]> {
    try {
      const favorites = await dbHelpers.getUserFavorites(userId);

      // Update cache
      const favoriteIds = new Set(favorites.map(f => f.exerciseId));
      this.favoritesCache.set(userId, favoriteIds);

      logger.log(`[ExerciseFavorites] Loaded ${favorites.length} favorites for user ${userId}`);
      return favorites;
    } catch (error) {
      logger.error('[ExerciseFavorites] Failed to load favorites:', error);
      return [];
    }
  }

  /**
   * Toggle favorite status for an exercise
   */
  async toggleFavorite(userId: string, exerciseId: string): Promise<boolean> {
    try {
      const isFavorited = await this.isFavorite(userId, exerciseId);

      if (isFavorited) {
        await dbHelpers.removeFavorite(userId, exerciseId);

        // Update cache
        const userFavorites = this.favoritesCache.get(userId);
        if (userFavorites) {
          userFavorites.delete(exerciseId);
        }

        logger.log(`[ExerciseFavorites] Unfavorited exercise ${exerciseId}`);
        return false;
      } else {
        await dbHelpers.addFavorite(userId, exerciseId);

        // Update cache
        let userFavorites = this.favoritesCache.get(userId);
        if (!userFavorites) {
          userFavorites = new Set();
          this.favoritesCache.set(userId, userFavorites);
        }
        userFavorites.add(exerciseId);

        logger.log(`[ExerciseFavorites] Favorited exercise ${exerciseId}`);
        return true;
      }
    } catch (error) {
      logger.error('[ExerciseFavorites] Failed to toggle favorite:', error);
      throw error;
    }
  }

  /**
   * Check if an exercise is favorited
   * Uses cache for fast lookups
   */
  async isFavorite(userId: string, exerciseId: string): Promise<boolean> {
    // Check cache first
    const userFavorites = this.favoritesCache.get(userId);
    if (userFavorites !== undefined) {
      return userFavorites.has(exerciseId);
    }

    // Cache miss - load from database
    try {
      const isFav = await dbHelpers.isFavorite(userId, exerciseId);

      // Initialize cache for this user
      if (!this.favoritesCache.has(userId)) {
        await this.loadFavorites(userId);
      }

      return isFav;
    } catch (error) {
      logger.error('[ExerciseFavorites] Failed to check favorite status:', error);
      return false;
    }
  }

  /**
   * Get all favorite exercise IDs for a user
   */
  getFavoriteIds(userId: string): string[] {
    const userFavorites = this.favoritesCache.get(userId);
    return userFavorites ? Array.from(userFavorites) : [];
  }

  /**
   * Get all favorites for a user (full objects)
   */
  async getFavorites(userId: string): Promise<ExerciseFavorite[]> {
    try {
      return await dbHelpers.getUserFavorites(userId);
    } catch (error) {
      logger.error('[ExerciseFavorites] Failed to get favorites:', error);
      return [];
    }
  }

  /**
   * Clear cache for a user (useful on logout)
   */
  clearCache(userId: string): void {
    this.favoritesCache.delete(userId);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.favoritesCache.clear();
  }
}

export const exerciseFavoritesService = new ExerciseFavoritesService();
