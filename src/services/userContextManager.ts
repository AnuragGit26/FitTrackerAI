import { dbHelpers } from './database';
import { logger } from '@/utils/logger';

class UserContextManager {
  private currentUserId: string | null = null;
  private listeners: Set<(userId: string | null) => void> = new Set();

  /**
   * Set current user context
   */
  setUserId(userId: string | null): void {
    if (this.currentUserId !== userId) {
      this.currentUserId = userId;
      this.notifyListeners();
    }
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Ensure user ID is set, throw if not
   */
  requireUserId(): string {
    if (!this.currentUserId) {
      throw new Error('User ID is required but not set. Please authenticate first.');
    }
    return this.currentUserId;
  }

  /**
   * Subscribe to user context changes
   */
  onUserIdChange(callback: (userId: string | null) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of user context change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUserId);
      } catch (error) {
        console.error('Error in user context listener:', error);
      }
    });
  }

  /**
   * Clear user context (on logout)
   */
  clear(): void {
    this.setUserId(null);
  }

  /**
   * Validate that operation is for correct user
   */
  validateUserId(recordUserId: string | undefined): void {
    if (!this.currentUserId) {
      throw new Error('User context not set');
    }
    if (recordUserId && recordUserId !== this.currentUserId) {
      throw new Error('Operation attempted on data belonging to different user');
    }
  }

  /**
   * Ensure record has correct user ID
   */
  ensureUserId<T extends { userId?: string }>(record: T): T {
    if (!record.userId) {
      return { ...record, userId: this.requireUserId() };
    }
    this.validateUserId(record.userId);
    return record;
  }

  /**
   * Filter records by current user
   */
  filterByUser<T extends { userId?: string }>(records: T[]): T[] {
    if (!this.currentUserId) {
      return [];
    }
    return records.filter(record => record.userId === this.currentUserId);
  }

  /**
   * Clean up user data (on logout or account deletion)
   */
  async cleanupUserData(userId: string): Promise<void> {
    try {
      // Delete all user-specific data
      const workouts = await dbHelpers.getAllWorkouts(userId);
      for (const workout of workouts) {
        if (workout.id) {
          await dbHelpers.deleteWorkout(workout.id);
        }
      }

      // Delete user-specific exercises
      const exercises = await dbHelpers.getAllExercises();
      const userExercises = exercises.filter(e => e.userId === userId);
      for (const exercise of userExercises) {
        await dbHelpers.deleteExercise(exercise.id);
      }

      // Delete templates
      const templates = await dbHelpers.getAllTemplates(userId);
      for (const template of templates) {
        await dbHelpers.deleteTemplate(template.id);
      }

      // Delete planned workouts
      const plannedWorkouts = await dbHelpers.getAllPlannedWorkouts(userId);
      for (const planned of plannedWorkouts) {
        await dbHelpers.deletePlannedWorkout(planned.id);
      }

      // Delete sync metadata
      const syncMetadata = await dbHelpers.getAllSyncMetadata(userId);
      for (const metadata of syncMetadata) {
        await dbHelpers.deleteSyncMetadata(metadata.tableName, userId);
      }

      // Delete user settings
      // Note: Settings are keyed, so we need to get all and filter
      // This is a simplified version - in production, you'd want a more efficient approach
    } catch (error) {
      logger.error(`Failed to cleanup data for user ${userId}:`, error);
      throw error;
    }
  }
}

export const userContextManager = new UserContextManager();

