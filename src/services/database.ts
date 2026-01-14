import Dexie, { Table } from 'dexie';
import { Workout, WorkoutTemplate, PlannedWorkout, PlannedExercise } from '@/types/workout';
import { Exercise, ExerciseAdvancedDetails } from '@/types/exercise';
import { MuscleStatus } from '@/types/muscle';
import { MuscleImageCache } from './muscleImageCache';
import { SyncableTable } from '@/types/sync';
import { SleepLog, RecoveryLog } from '@/types/sleep';
import type { Notification } from '@/types/notification';
import type { ErrorLog } from '@/types/error';
import { logger } from '@/utils/logger';

export type InsightType = 'insights' | 'recommendations' | 'progress' | 'smart-coach';

export interface AICacheMetadata {
  id?: number;
  insightType: InsightType;
  lastFetchTimestamp: number;
  lastWorkoutId: string | null;
  fingerprint: string;
  userId?: string;
}

export interface ExerciseDetailsCache {
  id?: number;
  exerciseSlug: string;
  details: ExerciseAdvancedDetails;
  cachedAt: number; // timestamp
}

export interface LocalSyncMetadata {
  id?: number;
  tableName: SyncableTable;
  userId: string;
  lastSyncAt: number | null; // timestamp
  lastPushAt: number | null; // timestamp
  lastPullAt: number | null; // timestamp
  syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'conflict';
  conflictCount: number;
  errorMessage?: string;
  lastErrorAt?: number; // timestamp
  recordCount?: number;
  version?: number;
  lastSuccessfulSyncAt?: number | null; // timestamp
  syncToken?: string;
}

export interface PendingSyncItem {
  id?: number;
  tableName: SyncableTable;
  queuedAt: number; // timestamp when added to queue
  userId?: string; // optional user context
}

class FitTrackAIDB extends Dexie {
  workouts!: Table<Workout, string>;
  exercises!: Table<Exercise, string>;
  muscleStatuses!: Table<MuscleStatus, number>;
  settings!: Table<{ key: string; value: unknown }, string>;
  workoutTemplates!: Table<WorkoutTemplate, string>;
  aiCacheMetadata!: Table<AICacheMetadata, number>;
  plannedWorkouts!: Table<PlannedWorkout, string>;
  exerciseDetailsCache!: Table<ExerciseDetailsCache, number>;
  muscleImageCache!: Table<MuscleImageCache, number>;
  syncMetadata!: Table<LocalSyncMetadata, number>;
  sleepLogs!: Table<SleepLog, number>;
  recoveryLogs!: Table<RecoveryLog, number>;
  notifications!: Table<Notification, string>;
  errorLogs!: Table<ErrorLog, number>;
  pendingSyncQueue!: Table<PendingSyncItem, number>;

  constructor() {
    super('FitTrackAIDB');
    
    this.version(1).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
    });

    this.version(2).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, *musclesTargeted',
    });

    this.version(3).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, [userId+category], *musclesTargeted',
    });

    this.version(4).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, [userId+category], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
    });

    this.version(5).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, [userId+category], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, [userId+scheduledDate]',
    });

    this.version(6).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, [userId+category], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, [userId+scheduledDate]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
    });

    this.version(7).stores({
      workouts: '++id, userId, date, *musclesTargeted',
      exercises: 'id, name, category, *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, lastWorked',
      settings: 'key',
      workoutTemplates: 'id, userId, category, name, [userId+category], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, [userId+scheduledDate]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
    });

    // Version 8: Add version fields, sync metadata, and improved indexes
    this.version(8).stores({
      workouts: '++id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
    }).upgrade(async (tx) => {
      // Migration: Add version field to all existing records
      const tables = ['workouts', 'exercises', 'muscleStatuses', 'settings', 'workoutTemplates', 'plannedWorkouts'];
      
      for (const tableName of tables) {
        const table = tx.table(tableName);
        const records = await table.toArray();
        
        for (const record of records) {
          if (!record.version) {
            await table.update(record, { version: 1 });
          }
        }
      }

      // Migration: Add userId to muscleStatuses if missing
      const muscleStatuses = await tx.table('muscleStatuses').toArray();
      for (const status of muscleStatuses) {
        if (!status.userId) {
          // Try to infer from workouts or use default
          const workouts = await tx.table('workouts').toArray();
          const userId = workouts[0]?.userId || 'user-1';
          await tx.table('muscleStatuses').update(status, { userId });
        }
      }

      // Migration: Add userId to exercises if missing (for custom exercises)
      const exercises = await tx.table('exercises').toArray();
      for (const exercise of exercises) {
        if (exercise.isCustom && !exercise.userId) {
          const workouts = await tx.table('workouts').toArray();
          const userId = workouts[0]?.userId || 'user-1';
          await tx.table('exercises').update(exercise, { userId });
        }
      }
    });

    // Version 9: Add sleep and recovery tracking
    this.version(9).stores({
      workouts: '++id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
    });

    // Version 10: Add notifications table
    this.version(10).stores({
      workouts: '++id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
    });

    // Version 11: Schema update (migration completed)
    this.version(11).stores({
      workouts: '++id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
    });

    // Version 12: Add error logs table
    this.version(12).stores({
      workouts: '++id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
      errorLogs: '++id, userId, errorType, severity, resolved, [userId+resolved], [userId+createdAt], tableName',
    });

    // Version 13: Migrate exercise and workout IDs to alphanumeric/string format
    this.version(13).stores({
      workouts: 'id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, version, [userId+scheduledDate], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
      errorLogs: '++id, userId, errorType, severity, resolved, [userId+resolved], [userId+createdAt], tableName',
    }).upgrade(async (tx) => {
      // Migration functions imported but not used directly
      // const { exerciseIdMigration } = await import('./exerciseIdMigration');
      // const { workoutIdMigration } = await import('./workoutIdMigration');
      const { generateWorkoutId } = await import('@/utils/idGenerator');
      
      try {
        // Exercise ID Migration
        logger.info('Starting exercise ID migration in database upgrade...');
        
        const exercisesTable = tx.table('exercises');
        const allExercises = await exercisesTable.toArray() as Exercise[];
        
        // Find exercises with old numeric IDs
        const exercisesToMigrate = allExercises.filter(ex => 
          /^exercise-\d+$/.test(ex.id)
        );
        
        if (exercisesToMigrate.length > 0) {
          logger.info(`Found ${exercisesToMigrate.length} exercises to migrate`);
          
          // Create ID mapping
          const idMapping = new Map<string, string>();
          const existingIds = new Set(allExercises.map(ex => ex.id));
          
          for (const exercise of exercisesToMigrate) {
            const { generateAlphanumericId } = await import('@/utils/idGenerator');
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
          
          logger.info(`Generated ${idMapping.size} new exercise IDs`);
          
          // Update exercises: delete old and create new
          for (const [oldId, newId] of idMapping) {
            const exercise = exercisesToMigrate.find(ex => ex.id === oldId);
            if (!exercise) continue;
            
            // Delete old exercise
            await exercisesTable.delete(oldId);
            
            // Create new exercise with new ID
            const updatedExercise: Exercise = {
              ...exercise,
              id: newId,
            };
            await exercisesTable.add(updatedExercise);
          }
          
          logger.info(`Migrated ${idMapping.size} exercises`);
          
          // Update references in workouts
          const workoutsTable = tx.table('workouts');
          const allWorkouts = await workoutsTable.toArray() as Workout[];
          
          let workoutRefsUpdated = 0;
          for (const workout of allWorkouts) {
            let updated = false;
            const updatedExercises = workout.exercises.map(ex => {
              if (idMapping.has(ex.exerciseId)) {
                updated = true;
                return {
                  ...ex,
                  exerciseId: idMapping.get(ex.exerciseId)!,
                };
              }
              return ex;
            });
            
            if (updated) {
              await workoutsTable.update(workout.id!, {
                exercises: updatedExercises,
              });
              workoutRefsUpdated++;
            }
          }
          
          logger.info(`Updated ${workoutRefsUpdated} workout references`);
          
          // Update references in workout templates
          const templatesTable = tx.table('workoutTemplates');
          const allTemplates = await templatesTable.toArray() as WorkoutTemplate[];
          
          let templateRefsUpdated = 0;
          for (const template of allTemplates) {
            let updated = false;
            const updatedExercises = template.exercises.map((ex: WorkoutTemplate['exercises'][number]) => {
              if (idMapping.has(ex.exerciseId)) {
                updated = true;
                return {
                  ...ex,
                  exerciseId: idMapping.get(ex.exerciseId)!,
                };
              }
              return ex;
            });
            
            if (updated) {
              await templatesTable.update(template.id, {
                exercises: updatedExercises,
              });
              templateRefsUpdated++;
            }
          }
          
          logger.info(`Updated ${templateRefsUpdated} template references`);
          
          // Update references in planned workouts
          const plannedWorkoutsTable = tx.table('plannedWorkouts');
          const allPlannedWorkouts = await plannedWorkoutsTable.toArray() as PlannedWorkout[];
          
          let plannedRefsUpdated = 0;
          for (const plannedWorkout of allPlannedWorkouts) {
            let updated = false;
            const updatedExercises = plannedWorkout.exercises.map((ex: PlannedExercise) => {
              if (idMapping.has(ex.exerciseId)) {
                updated = true;
                return {
                  ...ex,
                  exerciseId: idMapping.get(ex.exerciseId)!,
                };
              }
              return ex;
            });
            
            if (updated) {
              await plannedWorkoutsTable.update(plannedWorkout.id, {
                exercises: updatedExercises,
              });
              plannedRefsUpdated++;
            }
          }
          
          logger.info(`Updated ${plannedRefsUpdated} planned workout references`);
          
          // Mark migration as completed
          const settingsTable = tx.table('settings');
          await settingsTable.put({
            key: 'exercise_id_migration_completed',
            value: {
              count: idMapping.size,
              refsUpdated: workoutRefsUpdated + templateRefsUpdated + plannedRefsUpdated,
              completedAt: Date.now(),
            },
            userId: '',
            version: 1,
          });
        } else {
          logger.info('No exercises to migrate');
          // Mark migration as completed even if no exercises to migrate
          const settingsTable = tx.table('settings');
          await settingsTable.put({
            key: 'exercise_id_migration_completed',
            value: {
              count: 0,
              refsUpdated: 0,
              completedAt: Date.now(),
            },
            userId: '',
            version: 1,
          });
        }
        
        logger.info('Exercise ID migration completed');

        // Workout ID Migration
        logger.info('Starting workout ID migration in database upgrade...');
        
        // Get all workouts from the transaction
        const workoutsTable = tx.table('workouts');
        const allWorkouts = await workoutsTable.toArray() as Workout[];
        
        // Filter workouts with numeric IDs
        const workoutsToMigrate = allWorkouts.filter(w => typeof w.id === 'number');
        
        if (workoutsToMigrate.length > 0) {
          logger.info(`Found ${workoutsToMigrate.length} workouts to migrate`);
          
          // Get existing string IDs to avoid collisions
          const existingStringIds = new Set(
            allWorkouts
              .filter(w => typeof w.id === 'string')
              .map(w => w.id as string)
          );
          
          // Create ID mapping
          const idMapping = new Map<number, string>();
          
          for (const workout of workoutsToMigrate) {
            if (typeof workout.id === 'number') {
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
          
          // Migrate workouts: delete old and create new
          for (const [oldId, newId] of idMapping) {
            const workout = workoutsToMigrate.find(w => typeof w.id === 'number' && w.id === oldId);
            if (!workout) continue;
            
            // Delete old workout
            await workoutsTable.delete(oldId);
            
            // Create new workout with string ID
            const updatedWorkout: Workout = {
              ...workout,
              id: newId,
            };
            await workoutsTable.add(updatedWorkout);
          }
          
          logger.info(`Migrated ${idMapping.size} workouts`);
          
          // Update planned workout references
          const plannedWorkoutsTable = tx.table('plannedWorkouts');
          const allPlannedWorkouts = await plannedWorkoutsTable.toArray() as PlannedWorkout[];
          
          let plannedRefsUpdated = 0;
          for (const plannedWorkout of allPlannedWorkouts) {
            if (plannedWorkout.completedWorkoutId && typeof plannedWorkout.completedWorkoutId === 'number') {
              const newWorkoutId = idMapping.get(plannedWorkout.completedWorkoutId);
              if (newWorkoutId) {
                await plannedWorkoutsTable.update(plannedWorkout.id, {
                  completedWorkoutId: newWorkoutId,
                });
                plannedRefsUpdated++;
              }
            }
          }
          
          logger.info(`Updated ${plannedRefsUpdated} planned workout references`);
          
          // Mark migration as completed
          const settingsTable = tx.table('settings');
          await settingsTable.put({
            key: 'workout_id_migration_completed',
            value: {
              count: idMapping.size,
              refsUpdated: plannedRefsUpdated,
              completedAt: Date.now(),
            },
            userId: '',
            version: 1,
          });
        } else {
          logger.info('No workouts to migrate');
          // Mark migration as completed even if no workouts to migrate
          const settingsTable = tx.table('settings');
          await settingsTable.put({
            key: 'workout_id_migration_completed',
            value: {
              count: 0,
              refsUpdated: 0,
              completedAt: Date.now(),
            },
            userId: '',
            version: 1,
          });
        }
        
        logger.info('Workout ID migration completed');
      } catch (error) {
        logger.error('Migration error in database upgrade:', error);
        // Don't throw - allow app to continue even if migration fails
        // The migration can be retried on next app start
      }
    });

    // Version 14: Optimize indexes for frequently queried fields
    // This version adds compound indexes for common query patterns to significantly improve performance
    this.version(14).stores({
      workouts: 'id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      // OPTIMIZED: Added indexes for name, [name+category], and *equipment for faster searches
      exercises: 'id, name, category, userId, version, [name+category], [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles, *equipment',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      // OPTIMIZED: Added [name+userId] for faster template lookups by name
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [name+userId], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      // OPTIMIZED: Added [userId+isCompleted] for faster filtering of incomplete workouts
      plannedWorkouts: 'id, userId, scheduledDate, isCompleted, version, [userId+scheduledDate], [userId+isCompleted], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
      errorLogs: '++id, userId, errorType, severity, resolved, [userId+resolved], [userId+createdAt], tableName',
    });

    // Version 15: Add pendingSyncQueue table for persistent sync queue
    // FIX: Prevents sync queue loss on page refresh
    this.version(15).stores({
      workouts: 'id, userId, date, version, [userId+date], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [name+category], [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles, *equipment',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [name+userId], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, isCompleted, version, [userId+scheduledDate], [userId+isCompleted], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
      errorLogs: '++id, userId, errorType, severity, resolved, [userId+resolved], [userId+createdAt], tableName',
      // NEW: Persistent sync queue indexed by queuedAt for FIFO processing
      pendingSyncQueue: '++id, tableName, queuedAt, userId',
    });

    // Version 16: Add deletedAt index to workouts for efficient trash queries
    // FIX: Optimize getDeletedWorkouts query performance
    this.version(16).stores({
      workouts: 'id, userId, date, deletedAt, version, [userId+date], [userId+deletedAt], [userId+updatedAt], *musclesTargeted',
      exercises: 'id, name, category, userId, version, [name+category], [userId+isCustom], [userId+updatedAt], *primaryMuscles, *secondaryMuscles, *equipment',
      muscleStatuses: '++id, muscle, userId, version, [userId+muscle], [userId+updatedAt], lastWorked',
      settings: 'key, userId, version, [userId+key]',
      workoutTemplates: 'id, userId, category, name, version, [userId+category], [name+userId], [userId+updatedAt], *musclesTargeted',
      aiCacheMetadata: '++id, insightType, userId, [insightType+userId], lastFetchTimestamp',
      plannedWorkouts: 'id, userId, scheduledDate, isCompleted, version, [userId+scheduledDate], [userId+isCompleted], [userId+updatedAt]',
      exerciseDetailsCache: '++id, exerciseSlug, cachedAt',
      muscleImageCache: '++id, muscle, cachedAt',
      syncMetadata: '++id, tableName, userId, [userId+tableName], syncStatus, lastSyncAt',
      sleepLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      recoveryLogs: '++id, userId, date, version, [userId+date], [userId+updatedAt]',
      notifications: 'id, userId, isRead, createdAt, [userId+isRead], [userId+createdAt], type',
      errorLogs: '++id, userId, errorType, severity, resolved, [userId+resolved], [userId+createdAt], tableName',
      pendingSyncQueue: '++id, tableName, queuedAt, userId',
    });
  }
}

export const db = new FitTrackAIDB();

// Database helper functions
export const dbHelpers = {
  // Workout operations
  async saveWorkout(workout: Omit<Workout, 'id'> | Workout): Promise<string> {
    const workoutWithId = workout as Workout;
    if (!workoutWithId.id) {
      throw new Error('Workout must have an id');
    }
    await db.workouts.put(workoutWithId);
    return workoutWithId.id;
  },

  async getWorkout(id: string): Promise<Workout | undefined> {
    return await db.workouts.get(id);
  },

  async getAllWorkouts(userId: string): Promise<Workout[]> {
    try {
      // Fetch all workouts for user first
      const workouts = await db.workouts
        .where('userId')
        .equals(userId)
        .toArray();

      // Filter and sort in memory (more reliable than chaining .filter().sortBy())
      return workouts
        .filter(w => !w.deletedAt)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      logger.error('[database] getAllWorkouts failed:', error);
      // Return empty array instead of throwing to prevent app crash
      return [];
    }
  },

  async getWorkoutsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Workout[]> {
    return await db.workouts
      .where('userId')
      .equals(userId)
      .filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= startDate && workoutDate <= endDate
          && !workout.deletedAt;
      })
      .toArray();
  },

  async getDeletedWorkouts(userId: string): Promise<Workout[]> {
    // Use compound index [userId+deletedAt] for efficient query
    // Query where deletedAt is not null by using the compound index
    const workouts = await db.workouts
      .where('[userId+deletedAt]')
      .between([userId, Dexie.minKey], [userId, Dexie.maxKey], true, true)
      .reverse() // Most recently deleted first
      .toArray();

    // Filter out null deletedAt values (though index should handle this)
    return workouts.filter(w => w.deletedAt !== null && w.deletedAt !== undefined);
  },

  async updateWorkout(id: string, updates: Partial<Workout>): Promise<string> {
    await db.workouts.update(id, updates);
    return id;
  },

  async deleteWorkout(id: string): Promise<void> {
    await db.workouts.delete(id);
  },

  // Exercise operations
  async findExerciseByName(normalizedName: string): Promise<Exercise | undefined> {
    return await db.exercises
      .filter(ex => ex.name.toLowerCase().trim() === normalizedName)
      .first();
  },

  async saveExercise(exercise: Exercise): Promise<string> {
    const normalizedName = exercise.name.toLowerCase().trim();
    const existingExercise = await this.findExerciseByName(normalizedName);
    
    if (existingExercise && existingExercise.id !== exercise.id) {
      // Duplicate found by name - update existing record instead of creating new one
      const updatedExercise: Exercise = {
        ...exercise,
        id: existingExercise.id, // Use existing ID
      };
      return await db.exercises.put(updatedExercise);
    }
    
    // No duplicate found, save normally
    return await db.exercises.put(exercise);
  },

  async getExercise(id: string): Promise<Exercise | undefined> {
    return await db.exercises.get(id);
  },

  async getAllExercises(): Promise<Exercise[]> {
    // Use reverse() to get exercises in reverse chronological order (newest first)
    // This ensures we keep the most recently added exercise when deduplicating
    const allExercises = await db.exercises.reverse().toArray();

    // Deduplicate by normalized name in a single pass
    // Using a Map ensures O(1) lookup and maintains insertion order
    const deduplicatedMap = new Map<string, Exercise>();

    for (const exercise of allExercises) {
      const normalizedName = exercise.name.toLowerCase().trim();
      // Only add if not already seen (keeps first occurrence, which is newest)
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, exercise);
      }
    }

    // Convert Map values to array
    return Array.from(deduplicatedMap.values());
  },

  /**
   * Get exercises with pagination support to avoid loading all exercises at once
   * @param limit Maximum number of exercises to return
   * @param offset Number of exercises to skip
   * @returns Paginated and deduplicated exercises
   */
  async getExercisesPaginated(limit: number = 100, offset: number = 0): Promise<Exercise[]> {
    // Fetch limited set with offset
    const exercises = await db.exercises
      .reverse()
      .offset(offset)
      .limit(limit * 2) // Fetch 2x limit to account for potential duplicates
      .toArray();

    // Deduplicate in memory
    const deduplicatedMap = new Map<string, Exercise>();
    for (const exercise of exercises) {
      const normalizedName = exercise.name.toLowerCase().trim();
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, exercise);
      }
    }

    // Return up to the requested limit
    return Array.from(deduplicatedMap.values()).slice(0, limit);
  },

  /**
   * Get total count of unique exercises (deduplicated by name)
   */
  async getExercisesCount(): Promise<number> {
    const allExercises = await db.exercises.toArray();
    const uniqueNames = new Set(
      allExercises.map(ex => ex.name.toLowerCase().trim())
    );
    return uniqueNames.size;
  },

  async searchExercises(query: string, limit: number = 50): Promise<Exercise[]> {
    const lowerQuery = query.toLowerCase();

    // Strategy: Use index-friendly queries when possible for better performance
    let results: Exercise[];

    // If query is short (likely searching by name prefix), use the name index
    if (lowerQuery.length <= 3) {
      // Use the name index for prefix matching (much faster)
      results = await db.exercises
        .where('name')
        .startsWithIgnoreCase(query)
        .limit(limit * 2)
        .toArray();
    } else {
      // For longer queries or non-prefix searches, use filter but with limit
      results = await db.exercises
        .filter(exercise =>
          exercise.name.toLowerCase().includes(lowerQuery) ||
          exercise.category.toLowerCase().includes(lowerQuery) ||
          exercise.equipment.some(eq => eq.toLowerCase().includes(lowerQuery))
        )
        .limit(limit * 2) // Fetch 2x limit to account for potential duplicates
        .toArray();
    }

    // Deduplicate by normalized name in a single pass with Map
    const deduplicatedMap = new Map<string, Exercise>();
    for (const exercise of results) {
      const normalizedName = exercise.name.toLowerCase().trim();
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, exercise);
      }
    }

    // Return up to the requested limit
    return Array.from(deduplicatedMap.values()).slice(0, limit);
  },

  async filterExercisesByEquipment(equipmentCategories: string[], limit: number = 200): Promise<Exercise[]> {
    const { getEquipmentCategories } = await import('./exerciseLibrary');

    let results: Exercise[];
    if (equipmentCategories.length === 0) {
      // If no filter, use pagination to avoid loading everything
      results = await db.exercises.limit(limit * 2).toArray();
    } else {
      results = await db.exercises
        .filter(exercise => {
          const exerciseCategories = getEquipmentCategories(exercise.equipment);
          const exerciseCategoryStrings = exerciseCategories.map(cat => String(cat));
          return equipmentCategories.some(category =>
            exerciseCategoryStrings.includes(category)
          );
        })
        .limit(limit * 2) // Fetch 2x limit to account for potential duplicates
        .toArray();
    }

    // Deduplicate by normalized name in a single pass with Map
    const deduplicatedMap = new Map<string, Exercise>();
    for (const exercise of results) {
      const normalizedName = exercise.name.toLowerCase().trim();
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, exercise);
      }
    }

    // Return up to the requested limit
    return Array.from(deduplicatedMap.values()).slice(0, limit);
  },

  async deleteExercise(id: string): Promise<void> {
    await db.exercises.delete(id);
  },

  // Muscle status operations
  async saveMuscleStatus(status: Omit<MuscleStatus, 'id'>): Promise<number> {
    return await db.muscleStatuses.add(status as MuscleStatus);
  },

  async getMuscleStatus(muscle: string): Promise<MuscleStatus | undefined> {
    return await db.muscleStatuses
      .where('muscle')
      .equals(muscle)
      .first();
  },

  async getAllMuscleStatuses(): Promise<MuscleStatus[]> {
    return await db.muscleStatuses.toArray();
  },

  async updateMuscleStatus(
    id: number,
    updates: Partial<MuscleStatus>
  ): Promise<number> {
    return await db.muscleStatuses.update(id, updates);
  },

  async upsertMuscleStatus(status: MuscleStatus): Promise<number> {
    if (status.id) {
      await db.muscleStatuses.update(status.id, status);
      return status.id;
    } else {
      const existing = await db.muscleStatuses
        .where('muscle')
        .equals(status.muscle)
        .first();
      
      if (existing) {
        await db.muscleStatuses.update(existing.id!, status);
        return existing.id!;
      } else {
        return await db.muscleStatuses.add(status);
      }
    }
  },

  // Settings operations
  async getSetting(key: string): Promise<unknown> {
    const setting = await db.settings.get(key);
    return setting?.value;
  },

  async setSetting(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },

  async deleteSetting(key: string): Promise<void> {
    await db.settings.delete(key);
  },

  // Workout template operations
  async saveTemplate(template: WorkoutTemplate): Promise<string> {
    return await db.workoutTemplates.put(template);
  },

  async getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
    return await db.workoutTemplates.get(id);
  },

  async getAllTemplates(userId: string): Promise<WorkoutTemplate[]> {
    return await db.workoutTemplates
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('createdAt');
  },

  async getTemplatesByCategory(
    userId: string,
    category: string
  ): Promise<WorkoutTemplate[]> {
    try {
      // Try using compound index first
      return await db.workoutTemplates
        .where('[userId+category]')
        .equals([userId, category])
        .reverse()
        .sortBy('createdAt');
    } catch (error) {
      // Fallback: filter manually if compound index not available
      const allTemplates = await db.workoutTemplates
        .where('userId')
        .equals(userId)
        .toArray();
      return allTemplates
        .filter(template => template.category === category)
        .sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA; // Reverse sort (newest first)
        });
    }
  },

  async searchTemplates(
    userId: string,
    query: string
  ): Promise<WorkoutTemplate[]> {
    const lowerQuery = query.toLowerCase();
    return await db.workoutTemplates
      .where('userId')
      .equals(userId)
      .filter(template =>
        template.name.toLowerCase().includes(lowerQuery) ||
        (template.description?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .toArray();
  },

  async getFeaturedTemplates(userId: string): Promise<WorkoutTemplate[]> {
    return await db.workoutTemplates
      .where('userId')
      .equals(userId)
      .filter(template => Boolean(template.isFeatured))
      .toArray();
  },

  async getTrendingTemplates(userId: string): Promise<WorkoutTemplate[]> {
    return await db.workoutTemplates
      .where('userId')
      .equals(userId)
      .filter(template => Boolean(template.isTrending))
      .toArray();
  },

  async updateTemplate(
    id: string,
    updates: Partial<WorkoutTemplate>
  ): Promise<string> {
    await db.workoutTemplates.update(id, updates);
    return id;
  },

  async deleteTemplate(id: string): Promise<void> {
    await db.workoutTemplates.delete(id);
  },

  // Planned workout operations
  async savePlannedWorkout(plannedWorkout: PlannedWorkout): Promise<string> {
    return await db.plannedWorkouts.put(plannedWorkout);
  },

  async getPlannedWorkout(id: string): Promise<PlannedWorkout | undefined> {
    return await db.plannedWorkouts.get(id);
  },

  async getAllPlannedWorkouts(userId: string): Promise<PlannedWorkout[]> {
    return await db.plannedWorkouts
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('scheduledDate');
  },

  async getPlannedWorkoutsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlannedWorkout[]> {
    return await db.plannedWorkouts
      .where('userId')
      .equals(userId)
      .filter(plannedWorkout => {
        const scheduledDate = new Date(plannedWorkout.scheduledDate);
        return scheduledDate >= startDate && scheduledDate <= endDate;
      })
      .toArray();
  },

  async getPlannedWorkoutsByDate(
    userId: string,
    date: Date
  ): Promise<PlannedWorkout[]> {
    try {
      // Try using compound index first
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await db.plannedWorkouts
        .where('userId')
        .equals(userId)
        .filter(plannedWorkout => {
          const scheduledDate = new Date(plannedWorkout.scheduledDate);
          return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
        })
        .toArray();
    } catch (error) {
      // Fallback: filter manually
      const allPlanned = await db.plannedWorkouts
        .where('userId')
        .equals(userId)
        .toArray();
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return allPlanned.filter(plannedWorkout => {
        const scheduledDate = new Date(plannedWorkout.scheduledDate);
        return scheduledDate >= startOfDay && scheduledDate <= endOfDay;
      });
    }
  },

  async updatePlannedWorkout(
    id: string,
    updates: Partial<PlannedWorkout>
  ): Promise<string> {
    await db.plannedWorkouts.update(id, updates);
    return id;
  },

  async deletePlannedWorkout(id: string): Promise<void> {
    await db.plannedWorkouts.delete(id);
  },

  async markPlannedWorkoutCompleted(
    id: string,
    completedWorkoutId: string
  ): Promise<string> {
    await db.plannedWorkouts.update(id, {
      isCompleted: true,
      completedWorkoutId,
      updatedAt: new Date(),
    });
    return id;
  },

  // Exercise details cache operations
  async saveExerciseDetails(
    exerciseSlug: string,
    details: ExerciseAdvancedDetails
  ): Promise<number> {
    // Check if entry exists
    const existing = await db.exerciseDetailsCache
      .where('exerciseSlug')
      .equals(exerciseSlug)
      .first();

    if (existing) {
      await db.exerciseDetailsCache.update(existing.id!, {
        details,
        cachedAt: Date.now(),
      });
      return existing.id!;
    } else {
      return await db.exerciseDetailsCache.add({
        exerciseSlug,
        details,
        cachedAt: Date.now(),
      });
    }
  },

  async getExerciseDetails(
    exerciseSlug: string
  ): Promise<ExerciseAdvancedDetails | null> {
    const cached = await db.exerciseDetailsCache
      .where('exerciseSlug')
      .equals(exerciseSlug)
      .first();

    return cached?.details || null;
  },

  async getExerciseDetailsWithTimestamp(
    exerciseSlug: string
  ): Promise<{ details: ExerciseAdvancedDetails; cachedAt: number } | null> {
    const cached = await db.exerciseDetailsCache
      .where('exerciseSlug')
      .equals(exerciseSlug)
      .first();

    if (!cached) return null;

    return {
      details: cached.details,
      cachedAt: cached.cachedAt,
    };
  },

  async clearExerciseDetailsCache(exerciseSlug?: string): Promise<void> {
    if (exerciseSlug) {
      await db.exerciseDetailsCache
        .where('exerciseSlug')
        .equals(exerciseSlug)
        .delete();
    } else {
      await db.exerciseDetailsCache.clear();
    }
  },

  // Sync metadata operations
  async getSyncMetadata(tableName: SyncableTable, userId: string): Promise<LocalSyncMetadata | undefined> {
    return await db.syncMetadata
      .where('[userId+tableName]')
      .equals([userId, tableName])
      .first();
  },

  async saveSyncMetadata(metadata: LocalSyncMetadata): Promise<number> {
    const existing = await db.syncMetadata
      .where('[userId+tableName]')
      .equals([metadata.userId, metadata.tableName])
      .first();

    if (existing) {
      await db.syncMetadata.update(existing.id!, metadata);
      return existing.id!;
    } else {
      return await db.syncMetadata.add(metadata);
    }
  },

  async getAllSyncMetadata(userId: string): Promise<LocalSyncMetadata[]> {
    return await db.syncMetadata
      .where('userId')
      .equals(userId)
      .toArray();
  },

  async deleteSyncMetadata(tableName: SyncableTable, userId: string): Promise<void> {
    const existing = await db.syncMetadata
      .where('[userId+tableName]')
      .equals([userId, tableName])
      .first();

    if (existing) {
      await db.syncMetadata.delete(existing.id!);
    }
  },

  // Notification operations
  async saveNotification(notification: Notification): Promise<string> {
    return await db.notifications.put(notification);
  },

  async getNotification(id: string): Promise<Notification | undefined> {
    return await db.notifications.get(id);
  },

  async getAllNotifications(userId: string, filters?: { isRead?: boolean; limit?: number }): Promise<Notification[]> {
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      return [];
    }
    let query = db.notifications.where('userId').equals(userId);

    if (filters?.isRead !== undefined) {
      query = query.filter(n => n.isRead === filters.isRead);
    }

    const notifications = await query
      .reverse()
      .sortBy('createdAt');

    if (filters?.limit) {
      return notifications.slice(0, filters.limit);
    }

    return notifications;
  },

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    if (!userId || typeof userId !== 'string' || userId.length === 0) {
      return 0;
    }
    const count = await db.notifications
      .where('userId')
      .equals(userId)
      .filter(n => n.isRead === false)
      .count();
    return count;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await db.notifications.update(id, {
      isRead: true,
      readAt: Date.now(),
    });
  },

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const unreadNotifications = await db.notifications
      .where('userId')
      .equals(userId)
      .filter(n => n.isRead === false)
      .toArray();

    const now = Date.now();
    await Promise.all(
      unreadNotifications.map(n => 
        db.notifications.update(n.id, {
          isRead: true,
          readAt: now,
        })
      )
    );

    return unreadNotifications.length;
  },

  async deleteNotification(id: string): Promise<void> {
    await db.notifications.update(id, {
      deletedAt: Date.now(),
    });
  },

  async deleteNotificationPermanently(id: string): Promise<void> {
    await db.notifications.delete(id);
  },

  // Sleep log operations
  async saveSleepLog(sleepLog: Omit<SleepLog, 'id'>): Promise<number> {
    return await db.sleepLogs.add(sleepLog as SleepLog);
  },

  async getSleepLog(id: number): Promise<SleepLog | undefined> {
    return await db.sleepLogs.get(id);
  },

  async updateSleepLog(id: number, updates: Partial<SleepLog>): Promise<number> {
    return await db.sleepLogs.update(id, updates);
  },

  async getAllSleepLogs(userId: string): Promise<SleepLog[]> {
    return await db.sleepLogs
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');
  },

  // Recovery log operations
  async saveRecoveryLog(recoveryLog: Omit<RecoveryLog, 'id'>): Promise<number> {
    return await db.recoveryLogs.add(recoveryLog as RecoveryLog);
  },

  async getRecoveryLog(id: number): Promise<RecoveryLog | undefined> {
    return await db.recoveryLogs.get(id);
  },

  async getRecoveryLogByDate(userId: string, date: Date | string): Promise<RecoveryLog | undefined> {
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    const logs = await db.recoveryLogs
      .where('userId')
      .equals(userId)
      .filter((log) => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === dateStr;
      })
      .toArray();
    return logs[0];
  },

  async updateRecoveryLog(id: number, updates: Partial<RecoveryLog>): Promise<number> {
    return await db.recoveryLogs.update(id, updates);
  },

  async getAllRecoveryLogs(userId: string): Promise<RecoveryLog[]> {
    return await db.recoveryLogs
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('date');
  },

  // Pending sync queue operations
  async addToPendingSyncQueue(tableName: SyncableTable, userId?: string): Promise<number> {
    // Check if this table is already in the queue for this user
    const existingItems = await db.pendingSyncQueue
      .where('tableName')
      .equals(tableName)
      .filter(item => !userId || item.userId === userId)
      .toArray();

    if (existingItems.length > 0) {
      // Already queued, update timestamp
      const item = existingItems[0];
      await db.pendingSyncQueue.update(item.id!, {
        queuedAt: Date.now(),
      });
      return item.id!;
    } else {
      // Add new queue item
      return await db.pendingSyncQueue.add({
        tableName,
        queuedAt: Date.now(),
        userId,
      });
    }
  },

  async getPendingSyncQueue(): Promise<PendingSyncItem[]> {
    return await db.pendingSyncQueue
      .orderBy('queuedAt')
      .toArray();
  },

  async clearPendingSyncQueue(tableName?: SyncableTable): Promise<void> {
    if (tableName) {
      // Clear specific table from queue
      await db.pendingSyncQueue
        .where('tableName')
        .equals(tableName)
        .delete();
    } else {
      // Clear entire queue
      await db.pendingSyncQueue.clear();
    }
  },

  // Error log operations
  async saveErrorLog(errorLog: Omit<ErrorLog, 'id'>): Promise<number> {
    const now = new Date();
    const fullErrorLog: ErrorLog = {
      ...errorLog,
      resolved: false,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    return await db.errorLogs.add(fullErrorLog);
  },

  async getErrorLog(id: number): Promise<ErrorLog | undefined> {
    return await db.errorLogs.get(id);
  },

  async getAllErrorLogs(
    userId: string,
    filters?: {
      errorType?: string;
      resolved?: boolean;
      severity?: string;
      tableName?: string;
      limit?: number;
    }
  ): Promise<ErrorLog[]> {
    const query = db.errorLogs.where('userId').equals(userId);

    let results = await query.reverse().sortBy('createdAt');

    // Apply filters
    if (filters) {
      if (filters.errorType) {
        results = results.filter((log) => log.errorType === filters.errorType);
      }
      if (filters.resolved !== undefined) {
        results = results.filter((log) => log.resolved === filters.resolved);
      }
      if (filters.severity) {
        results = results.filter((log) => log.severity === filters.severity);
      }
      if (filters.tableName) {
        results = results.filter((log) => log.tableName === filters.tableName);
      }
      if (filters.limit) {
        results = results.slice(0, filters.limit);
      }
    }

    return results;
  },

  async updateErrorLog(id: number, updates: Partial<ErrorLog>): Promise<number> {
    return await db.errorLogs.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async markErrorLogAsResolved(id: number, resolvedBy?: string): Promise<number> {
    return await db.errorLogs.update(id, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      updatedAt: new Date(),
    });
  },

  async deleteErrorLog(id: number): Promise<void> {
    await db.errorLogs.delete(id);
  },

  async clearOldErrorLogs(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldLogs = await db.errorLogs
      .where('userId')
      .equals(userId)
      .filter((log) => log.resolved && log.createdAt < cutoffDate)
      .toArray();

    await Promise.all(oldLogs.map((log) => db.errorLogs.delete(log.id!)));

    return oldLogs.length;
  },

  // Database health and repair operations
  async checkDatabaseHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    version: number;
  }> {
    const issues: string[] = [];

    try {
      // Check database version
      const currentVersion = db.verno;

      // Check if workouts table exists and is accessible
      const workoutCount = await db.workouts.count();
      logger.info(`[database] Health check: ${workoutCount} workouts found`);

      // Sample a workout to check ID type
      const sampleWorkout = await db.workouts.limit(1).first();
      if (sampleWorkout && typeof sampleWorkout.id !== 'string') {
        issues.push('Workout IDs are not strings (schema mismatch)');
        logger.warn('[database] Health check: Found workout with non-string ID');
      }

      // Check indexes
      const schema = db.tables.find(t => t.name === 'workouts')?.schema;
      if (!schema?.indexes.some(idx => idx.name === 'userId')) {
        issues.push('userId index missing');
        logger.warn('[database] Health check: userId index missing');
      }

      return {
        isHealthy: issues.length === 0,
        issues,
        version: currentVersion,
      };
    } catch (error) {
      logger.error('[database] Health check failed:', error);
      return {
        isHealthy: false,
        issues: [`Database check failed: ${error}`],
        version: -1,
      };
    }
  },

  async repairDatabase(): Promise<void> {
    logger.info('[database] Starting database repair...');

    try {
      // Get all workouts (may include corrupted records)
      const allWorkouts = await db.workouts.toArray();
      logger.info(`[database] Found ${allWorkouts.length} workouts to check`);

      // Fix workout IDs if needed
      const fixedWorkouts = allWorkouts.map(workout => {
        if (typeof workout.id !== 'string') {
          logger.warn(`[database] Converting workout ID from ${typeof workout.id} to string: ${workout.id}`);
          // Convert old integer IDs to strings
          return { ...workout, id: `workout_${workout.id}` };
        }
        return workout;
      });

      // Check if any fixes were needed
      const needsRepair = fixedWorkouts.some((w, i) => w.id !== allWorkouts[i].id);

      if (needsRepair) {
        logger.info('[database] Applying repairs...');
        // Clear and repopulate
        await db.workouts.clear();
        await db.workouts.bulkPut(fixedWorkouts);
        logger.info('[database] Repair complete');
      } else {
        logger.info('[database] No repairs needed');
      }
    } catch (error) {
      logger.error('[database] Repair failed:', error);
      throw new Error('Database repair failed. Please export your data and clear the database.');
    }
  },

  // Generic method to get records by userId for any syncable table
  async getRecordsByUserId(
    tableName: SyncableTable,
    userId: string
  ): Promise<Record<string, unknown>[]> {
    switch (tableName) {
      case 'workouts':
        return (await this.getAllWorkouts(userId)) as unknown as Record<string, unknown>[];
      case 'workout_templates':
        return (await this.getAllTemplates(userId)) as unknown as Record<string, unknown>[];
      case 'planned_workouts':
        return (await this.getAllPlannedWorkouts(userId)) as unknown as Record<string, unknown>[];
      case 'exercises':
        // Exercises are global, but filter by userId for custom exercises
        const allExercises = await this.getAllExercises();
        return allExercises.filter(ex => !ex.userId || ex.userId === userId) as unknown as Record<string, unknown>[];
      case 'user_profiles':
        // User profiles - single document per user
        return [];
      case 'muscle_statuses':
        // Muscle statuses are user-scoped
        const allStatuses = await this.getAllMuscleStatuses();
        return allStatuses.filter(status => status.userId === userId) as unknown as Record<string, unknown>[];
      case 'sleep_logs':
        return (await this.getAllSleepLogs(userId)) as unknown as Record<string, unknown>[];
      case 'recovery_logs':
        return (await this.getAllRecoveryLogs(userId)) as unknown as Record<string, unknown>[];
      case 'settings':
        // Settings - single document per user
        return [];
      case 'notifications':
        return (await this.getAllNotifications(userId)) as unknown as Record<string, unknown>[];
      case 'error_logs':
        return (await this.getAllErrorLogs(userId)) as unknown as Record<string, unknown>[];
      default:
        logger.error(`[database] Unknown table name: ${tableName}`);
        return [];
    }
  },

  // Generic method to get a single record by ID from any syncable table
  async getRecordById(
    tableName: SyncableTable,
    recordId: string | number
  ): Promise<Record<string, unknown> | undefined> {
    switch (tableName) {
      case 'workouts':
        return (await this.getWorkout(recordId as string)) as unknown as Record<string, unknown> | undefined;
      case 'workout_templates':
        return (await this.getTemplate(recordId as string)) as unknown as Record<string, unknown> | undefined;
      case 'planned_workouts':
        return (await this.getPlannedWorkout(recordId as string)) as unknown as Record<string, unknown> | undefined;
      case 'exercises':
        return (await this.getExercise(recordId as string)) as unknown as Record<string, unknown> | undefined;
      case 'user_profiles':
        // User profiles don't have separate IDs, they use userId
        return undefined;
      case 'muscle_statuses':
        const allStatuses = await this.getAllMuscleStatuses();
        return allStatuses.find(s => s.id === recordId) as unknown as Record<string, unknown> | undefined;
      case 'sleep_logs':
        return (await this.getSleepLog(recordId as number)) as unknown as Record<string, unknown> | undefined;
      case 'recovery_logs':
        return (await this.getRecoveryLog(recordId as number)) as unknown as Record<string, unknown> | undefined;
      case 'settings':
        const value = await this.getSetting(recordId as string);
        if (value !== undefined) {
          return { key: recordId as string, value };
        }
        return undefined;
      case 'notifications':
        return (await this.getNotification(recordId as string)) as unknown as Record<string, unknown> | undefined;
      case 'error_logs':
        return (await this.getErrorLog(recordId as number)) as unknown as Record<string, unknown> | undefined;
      default:
        logger.error(`[database] Unknown table name for getRecordById: ${tableName}`);
        return undefined;
    }
  },

  // Generic method to upsert (insert or update) a record in any syncable table
  async upsertRecord(
    tableName: SyncableTable,
    record: Record<string, unknown>
  ): Promise<string | number> {
    switch (tableName) {
      case 'workouts':
        return await this.saveWorkout(record as unknown as Workout);
      case 'workout_templates':
        return await this.saveTemplate(record as unknown as WorkoutTemplate);
      case 'planned_workouts':
        return await this.savePlannedWorkout(record as unknown as PlannedWorkout);
      case 'exercises':
        return await this.saveExercise(record as unknown as Exercise);
      case 'user_profiles':
        // User profiles are not stored in IndexedDB in this implementation
        // They are managed by Firebase Auth and settings
        logger.warn('[database] User profiles are not stored in IndexedDB');
        return record.id as string;
      case 'muscle_statuses':
        return await this.upsertMuscleStatus(record as unknown as MuscleStatus);
      case 'sleep_logs':
        if (record.id) {
          await this.updateSleepLog(record.id as number, record as unknown as Partial<SleepLog>);
          return record.id as number;
        } else {
          return await this.saveSleepLog(record as unknown as Omit<SleepLog, 'id'>);
        }
      case 'recovery_logs':
        if (record.id) {
          await this.updateRecoveryLog(record.id as number, record as unknown as Partial<RecoveryLog>);
          return record.id as number;
        } else {
          return await this.saveRecoveryLog(record as unknown as Omit<RecoveryLog, 'id'>);
        }
      case 'settings':
        await this.setSetting(record.key as string, record.value);
        return record.key as string;
      case 'notifications':
        return await this.saveNotification(record as unknown as Notification);
      case 'error_logs':
        if (record.id) {
          await this.updateErrorLog(record.id as number, record as unknown as Partial<ErrorLog>);
          return record.id as number;
        } else {
          return await this.saveErrorLog(record as unknown as Omit<ErrorLog, 'id'>);
        }
      default:
        logger.error(`[database] Unknown table name for upsertRecord: ${tableName}`);
        throw new Error(`Cannot upsert record for unknown table: ${tableName}`);
    }
  },
};

