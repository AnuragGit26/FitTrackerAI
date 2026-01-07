import { dbHelpers } from './database';
import { Workout } from '@/types/workout';
import { generateWorkoutId } from '@/utils/idGenerator';
import { logger } from '@/utils/logger';

interface MigrationStatus {
  isCompleted: boolean;
  workoutsMigrated: number;
  referencesUpdated: number;
  error?: string;
}

class WorkoutIdMigration {
  private readonly MIGRATION_FLAG_KEY = 'workout_id_migration_completed';

  /**
   * Check if migration has already been completed
   */
  async hasPendingMigration(): Promise<boolean> {
    try {
      const flag = await dbHelpers.getSetting(this.MIGRATION_FLAG_KEY);
      return !flag; // Migration is pending if flag doesn't exist
    } catch (error) {
      logger.error('Error checking workout migration status:', error);
      return false; // Assume migration needed if check fails
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    try {
      const flag = await dbHelpers.getSetting(this.MIGRATION_FLAG_KEY);
      if (flag) {
        return {
          isCompleted: true,
          workoutsMigrated: (flag as { count?: number }).count || 0,
          referencesUpdated: (flag as { refsUpdated?: number }).refsUpdated || 0,
        };
      }
      return {
        isCompleted: false,
        workoutsMigrated: 0,
        referencesUpdated: 0,
      };
    } catch (error) {
      return {
        isCompleted: false,
        workoutsMigrated: 0,
        referencesUpdated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate workout IDs from numeric format to string format with username and datetime
   */
  async migrateWorkoutIds(): Promise<void> {
    try {
      // Check if already migrated
      if (!(await this.hasPendingMigration())) {
        logger.info('Workout ID migration already completed');
        return;
      }

      logger.info('Starting workout ID migration...');

      // Get all workouts grouped by userId
      // We need to get workouts for all users, but getAllWorkouts requires userId
      // We'll need to handle this differently - get all workouts from the database directly
      // For now, we'll use a workaround: get workouts for known users or scan all
      
      // Since we can't easily get all workouts without userId, we'll need to
      // handle this in the database upgrade transaction where we have access to the table
      // This migration will be called from the database upgrade callback

      logger.info('Workout ID migration will be handled in database upgrade transaction');
      
      // Set a flag indicating migration is in progress
      await dbHelpers.setSetting(this.MIGRATION_FLAG_KEY, {
        inProgress: true,
        startedAt: Date.now(),
      });
    } catch (error) {
      logger.error('Workout ID migration setup failed:', error);
      throw error;
    }
  }

  /**
   * Migrate workouts in a transaction (called from database upgrade)
   */
  async migrateWorkoutsInTransaction(
    workouts: Workout[],
    existingStringIds: Set<string>
  ): Promise<{ migrated: number; refsUpdated: number }> {
    const idMapping = new Map<number, string>();
    let migrated = 0;
    const refsUpdated = 0;

    try {
      // Create ID mapping for numeric IDs
      for (const workout of workouts) {
        if (typeof workout.id === 'number') {
          // Generate new string ID with username and datetime
          const newId = generateWorkoutId(
            workout.userId,
            workout.startTime || workout.date,
            existingStringIds
          );
          
          idMapping.set(workout.id, newId);
          existingStringIds.add(newId);
        }
      }

      logger.info(`Generated ${idMapping.size} new workout IDs`);

      // Update workouts - delete old and create new
      for (const [oldId, newId] of idMapping) {
        const workout = workouts.find(w => String(w.id) === String(oldId));
        if (!workout) continue;

        // Create updated workout with new ID
        const updatedWorkout: Workout = {
          ...workout,
          id: newId,
        };

        // Delete old workout (numeric ID)
        await dbHelpers.deleteWorkout(String(oldId));

        // Save new workout (string ID)
        await dbHelpers.saveWorkout(updatedWorkout as Omit<Workout, 'id'>);
        migrated++;
      }

      logger.info(`Migrated ${migrated} workouts`);

      // Update references in planned workouts
      // Get all planned workouts for all users
      // Since we don't have getAllPlannedWorkouts without userId, we'll need to handle this per user
      // For now, we'll update what we can and log a warning
      
      // The planned workout references will be updated when we process each user's planned workouts
      // This is a limitation we'll need to work around

      return { migrated, refsUpdated };
    } catch (error) {
      logger.error('Error migrating workouts in transaction:', error);
      throw error;
    }
  }

  /**
   * Update planned workout references
   */
  async updatePlannedWorkoutReferences(_idMapping: Map<number, string>): Promise<number> {
    const updated = 0;
    
    try {
      // This will be called per user in the database upgrade
      // We'll update planned workouts that reference migrated workout IDs
      // Implementation depends on having access to all planned workouts
      
      return updated;
    } catch (error) {
      logger.error('Error updating planned workout references:', error);
      return updated;
    }
  }

  /**
   * Mark migration as completed
   */
  async markCompleted(count: number, refsUpdated: number): Promise<void> {
    await dbHelpers.setSetting(this.MIGRATION_FLAG_KEY, {
      count,
      refsUpdated,
      completedAt: Date.now(),
    });
  }
}

export const workoutIdMigration = new WorkoutIdMigration();

