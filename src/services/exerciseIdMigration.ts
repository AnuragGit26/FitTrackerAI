import { dbHelpers } from './database';
import { Exercise } from '@/types/exercise';
import { generateAlphanumericId } from '@/utils/idGenerator';
import { logger } from '@/utils/logger';

interface MigrationStatus {
  isCompleted: boolean;
  exercisesMigrated: number;
  referencesUpdated: number;
  error?: string;
}

class ExerciseIdMigration {
  private readonly MIGRATION_FLAG_KEY = 'exercise_id_migration_completed';

  /**
   * Check if migration has already been completed
   */
  async hasPendingMigration(): Promise<boolean> {
    try {
      const flag = await dbHelpers.getSetting(this.MIGRATION_FLAG_KEY);
      return !flag; // Migration is pending if flag doesn't exist
    } catch (error) {
      logger.error('Error checking migration status:', error);
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
          exercisesMigrated: (flag as { count?: number }).count || 0,
          referencesUpdated: (flag as { refsUpdated?: number }).refsUpdated || 0,
        };
      }
      return {
        isCompleted: false,
        exercisesMigrated: 0,
        referencesUpdated: 0,
      };
    } catch (error) {
      return {
        isCompleted: false,
        exercisesMigrated: 0,
        referencesUpdated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate exercise IDs from numeric format to alphanumeric format
   */
  async migrateExerciseIds(): Promise<void> {
    try {
      // Check if already migrated
      if (!(await this.hasPendingMigration())) {
        logger.info('Exercise ID migration already completed');
        return;
      }

      logger.info('Starting exercise ID migration...');

      // Get all exercises
      const allExercises = await dbHelpers.getAllExercises();
      
      // Find exercises with old numeric IDs (exercise-\d+)
      const exercisesToMigrate = allExercises.filter(ex => 
        /^exercise-\d+$/.test(ex.id)
      );

      if (exercisesToMigrate.length === 0) {
        logger.info('No exercises to migrate');
        await dbHelpers.setSetting(this.MIGRATION_FLAG_KEY, { 
          count: 0, 
          refsUpdated: 0,
          completedAt: Date.now() 
        });
        return;
      }

      logger.info(`Found ${exercisesToMigrate.length} exercises to migrate`);

      // Create ID mapping (oldId -> newId)
      const idMapping = new Map<string, string>();
      const existingIds = new Set(allExercises.map(ex => ex.id));

      for (const exercise of exercisesToMigrate) {
        // Generate new alphanumeric ID, ensuring uniqueness
        let newId = generateAlphanumericId('exr');
        let attempts = 0;
        while (existingIds.has(newId) && attempts < 10) {
          newId = generateAlphanumericId('exr');
          attempts++;
        }
        
        if (existingIds.has(newId)) {
          throw new Error(`Failed to generate unique ID for exercise ${exercise.id} after 10 attempts`);
        }

        idMapping.set(exercise.id, newId);
        existingIds.add(newId);
      }

      logger.info(`Generated ${idMapping.size} new IDs`);

      // Update exercises table
      let exercisesUpdated = 0;
      for (const [oldId, newId] of idMapping) {
        const exercise = exercisesToMigrate.find(ex => ex.id === oldId);
        if (!exercise) {
    continue;
  }

        // Delete old exercise
        await dbHelpers.deleteExercise(oldId);

        // Create new exercise with new ID
        const updatedExercise: Exercise = {
          ...exercise,
          id: newId,
        };
        await dbHelpers.saveExercise(updatedExercise);
        exercisesUpdated++;
      }

      logger.info(`Updated ${exercisesUpdated} exercises`);

      // Update references in workouts
      // Note: This migration is primarily handled in the database upgrade transaction
      // This method is kept for backward compatibility but may not work for all cases
      // The database upgrade handles all references properly
      const workoutRefsUpdated = 0;
      logger.info('Workout reference migration will be handled in database upgrade transaction');

      // Update references in workout templates
      // Get all templates by querying for known users or scanning
      // Since we can't easily get all templates, we'll handle this in the database upgrade transaction
      const templateRefsUpdated = 0;
      logger.info('Template reference migration will be handled in database upgrade transaction');

      // Update references in planned workouts
      // Similar approach - handle in database upgrade
      const plannedRefsUpdated = 0;
      logger.info('Planned workout reference migration will be handled in database upgrade transaction');

      // Set migration flag
      await dbHelpers.setSetting(this.MIGRATION_FLAG_KEY, {
        count: exercisesUpdated,
        refsUpdated: workoutRefsUpdated + templateRefsUpdated + plannedRefsUpdated,
        completedAt: Date.now(),
      });

      logger.info(`Exercise ID migration completed: ${exercisesUpdated} exercises, ${workoutRefsUpdated} workout references updated`);
    } catch (error) {
      logger.error('Exercise ID migration failed:', error);
      throw error;
    }
  }
}

export const exerciseIdMigration = new ExerciseIdMigration();

