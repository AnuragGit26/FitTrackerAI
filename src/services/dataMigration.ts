import { dbHelpers } from './database';
import { versionManager } from './versionManager';
import { userContextManager } from './userContextManager';
import { transactionManager } from './transactionManager';
import { SyncableTable } from '@/types/sync';
import { logger } from '@/utils/logger';

/**
 * Migration script to migrate existing data to new ACID-compliant structure
 * This should be run once after deploying the new database schema
 */
class DataMigration {
  /**
   * Run all migrations
   */
  async migrateAll(userId: string): Promise<void> {
    userContextManager.setUserId(userId);

    try {
      await this.migrateVersions(userId);
      await this.migrateSyncMetadata(userId);
      await this.migrateUserIds(userId);
      await this.migrateSoftDeletes(userId);
    } catch (error) {
      logger.error('Data migration failed:', error);
      throw error;
    }
  }

  /**
   * Add version fields to all existing records
   */
  private async migrateVersions(userId: string): Promise<void> {
    const tables: Array<{ name: SyncableTable; store: string }> = [
      { name: 'workouts', store: 'workouts' },
      { name: 'workout_templates', store: 'workoutTemplates' },
      { name: 'planned_workouts', store: 'plannedWorkouts' },
      { name: 'muscle_statuses', store: 'muscleStatuses' },
    ];

    for (const { name, store } of tables) {
      try {
        await transactionManager.execute([store], async () => {
          let records: Array<Record<string, unknown>> = [];

          switch (name) {
            case 'workouts':
              records = (await dbHelpers.getAllWorkouts(userId)) as unknown as Array<Record<string, unknown>>;
              break;
            case 'workout_templates':
              records = (await dbHelpers.getAllTemplates(userId)) as unknown as Array<Record<string, unknown>>;
              break;
            case 'planned_workouts':
              records = (await dbHelpers.getAllPlannedWorkouts(userId)) as unknown as Array<Record<string, unknown>>;
              break;
            case 'muscle_statuses':
              records = (await dbHelpers.getAllMuscleStatuses()) as unknown as Array<Record<string, unknown>>;
              break;
          }

          for (const record of records) {
            if (!record.version) {
              const versioned = versionManager.initializeVersion(record);
              
              switch (name) {
                case 'workouts':
                  if (record.id && typeof record.id === 'string') {
                    await dbHelpers.updateWorkout(record.id, versioned);
                  }
                  break;
                case 'workout_templates':
                  if (record.id && typeof record.id === 'string') {
                    await dbHelpers.updateTemplate(record.id, versioned);
                  }
                  break;
                case 'planned_workouts':
                  if (record.id && typeof record.id === 'string') {
                    await dbHelpers.updatePlannedWorkout(record.id, versioned);
                  }
                  break;
                case 'muscle_statuses':
                  if (record.id) {
                    const id = typeof record.id === 'number' ? record.id : parseInt(String(record.id), 10);
                    if (!isNaN(id)) {
                      await dbHelpers.updateMuscleStatus(id, versioned);
                    }
                  }
                  break;
              }
            }
          }
        });
      } catch (error) {
        logger.error(`Failed to migrate versions for ${name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Migrate sync metadata from settings to dedicated store
   */
  private async migrateSyncMetadata(userId: string): Promise<void> {
    const tables: SyncableTable[] = [
      'workouts',
      'exercises',
      'workout_templates',
      'planned_workouts',
      'muscle_statuses',
      'user_profiles',
      'settings',
    ];

    for (const tableName of tables) {
      try {
        const key = `sync_metadata_${tableName}_${userId}`;
        const oldMetadata = await dbHelpers.getSetting(key);

        if (oldMetadata) {
          const metadata = oldMetadata as Record<string, unknown>;
          await dbHelpers.saveSyncMetadata({
            tableName,
            userId,
            lastSyncAt: metadata.lastSyncAt && typeof metadata.lastSyncAt === 'string' ? new Date(metadata.lastSyncAt).getTime() : null,
            lastPushAt: metadata.lastPushAt && typeof metadata.lastPushAt === 'string' ? new Date(metadata.lastPushAt).getTime() : null,
            lastPullAt: metadata.lastPullAt && typeof metadata.lastPullAt === 'string' ? new Date(metadata.lastPullAt).getTime() : null,
            syncStatus: (metadata.syncStatus as 'idle' | 'syncing' | 'success' | 'error' | 'conflict') || 'idle',
            conflictCount: (typeof metadata.conflictCount === 'number' ? metadata.conflictCount : 0),
            errorMessage: typeof metadata.errorMessage === 'string' ? metadata.errorMessage : undefined,
            lastErrorAt: metadata.lastErrorAt && typeof metadata.lastErrorAt === 'string' ? new Date(metadata.lastErrorAt).getTime() : undefined,
            recordCount: typeof metadata.recordCount === 'number' ? metadata.recordCount : undefined,
            version: (typeof metadata.version === 'number' ? metadata.version : 1),
          });

          // Optionally delete old setting
          // await dbHelpers.deleteSetting(key);
        }
      } catch (error) {
        logger.error(`Failed to migrate sync metadata for ${tableName}:`, error);
        // Don't throw - continue with other tables
      }
    }
  }

  /**
   * Ensure all records have userId
   */
  private async migrateUserIds(_userId: string): Promise<void> {
    try {
      // Migrate muscle statuses
      const muscleStatuses = await dbHelpers.getAllMuscleStatuses();
      for (const status of muscleStatuses) {
        if (!status.userId && status.id) {
          await dbHelpers.updateMuscleStatus(status.id, { userId: _userId });
        }
      }

      // Migrate custom exercises
      const exercises = await dbHelpers.getAllExercises();
      for (const exercise of exercises) {
        if (exercise.isCustom && !exercise.userId) {
          await dbHelpers.saveExercise({ ...exercise, userId: _userId });
        }
      }
    } catch (error) {
      logger.error('Failed to migrate user IDs:', error);
      throw error;
    }
  }

  /**
   * Initialize soft delete fields
   */
  private async migrateSoftDeletes(userId: string): Promise<void> {
    // Soft delete fields are initialized as null by default
    // This migration ensures consistency
    try {
      const workouts = await dbHelpers.getAllWorkouts(userId);
      for (const workout of workouts) {
        if (workout.id && workout.deletedAt === undefined) {
          await dbHelpers.updateWorkout(workout.id, { deletedAt: null });
        }
      }
    } catch (error) {
      logger.error('Failed to migrate soft deletes:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(userId: string): Promise<boolean> {
    try {
      // Check if any workout lacks version
      const workouts = await dbHelpers.getAllWorkouts(userId);
      const needsVersionMigration = workouts.some(w => !w.version);

      // Check if sync metadata exists in old format
      const key = `sync_metadata_workouts_${userId}`;
      const oldMetadata = await dbHelpers.getSetting(key);
      const needsMetadataMigration = !!oldMetadata;

      return needsVersionMigration || needsMetadataMigration;
    } catch (error) {
      logger.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Rollback migration (if needed)
   */
  async rollback(_userId: string): Promise<void> {
    // Implementation would restore old structure if needed
    // For now, this is a placeholder
  }
}

export const dataMigration = new DataMigration();

