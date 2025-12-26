import Dexie, { Table } from 'dexie';
import { Workout, WorkoutTemplate, PlannedWorkout } from '@/types/workout';
import { Exercise, ExerciseAdvancedDetails } from '@/types/exercise';
import { MuscleStatus } from '@/types/muscle';
import { MuscleImageCache } from './muscleImageCache';
import { SyncableTable } from '@/types/sync';
import { SleepLog, RecoveryLog } from '@/types/sleep';

export type InsightType = 'insights' | 'recommendations' | 'progress' | 'smart-coach';

export interface AICacheMetadata {
  id?: number;
  insightType: InsightType;
  lastFetchTimestamp: number;
  lastWorkoutId: number | null;
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

class FitTrackAIDB extends Dexie {
  workouts!: Table<Workout, number>;
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
  }
}

export const db = new FitTrackAIDB();

// Database helper functions
export const dbHelpers = {
  // Workout operations
  async saveWorkout(workout: Omit<Workout, 'id'>): Promise<number> {
    return await db.workouts.add(workout as Workout);
  },

  async getWorkout(id: number): Promise<Workout | undefined> {
    return await db.workouts.get(id);
  },

  async getAllWorkouts(userId: string): Promise<Workout[]> {
    const workouts = await db.workouts
      .where('userId')
      .equals(userId)
      .sortBy('date');
    // Sort descending (most recent first) by reversing the array
    return workouts.reverse();
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
        return workoutDate >= startDate && workoutDate <= endDate;
      })
      .toArray();
  },

  async updateWorkout(id: number, updates: Partial<Workout>): Promise<number> {
    return await db.workouts.update(id, updates);
  },

  async deleteWorkout(id: number): Promise<void> {
    await db.workouts.delete(id);
  },

  // Exercise operations
  async saveExercise(exercise: Exercise): Promise<string> {
    return await db.exercises.put(exercise);
  },

  async getExercise(id: string): Promise<Exercise | undefined> {
    return await db.exercises.get(id);
  },

  async getAllExercises(): Promise<Exercise[]> {
    return await db.exercises.toArray();
  },

  async searchExercises(query: string): Promise<Exercise[]> {
    const lowerQuery = query.toLowerCase();
    return await db.exercises
      .filter(exercise => 
        exercise.name.toLowerCase().includes(lowerQuery) ||
        exercise.category.toLowerCase().includes(lowerQuery) ||
        exercise.equipment.some(eq => eq.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  },

  async filterExercisesByEquipment(equipmentCategories: string[]): Promise<Exercise[]> {
    if (equipmentCategories.length === 0) {
      return await db.exercises.toArray();
    }

    const { getEquipmentCategories } = await import('./exerciseLibrary');
    
    return await db.exercises
      .filter(exercise => {
        const exerciseCategories = getEquipmentCategories(exercise.equipment);
        const exerciseCategoryStrings = exerciseCategories.map(cat => String(cat));
        return equipmentCategories.some(category => 
          exerciseCategoryStrings.includes(category)
        );
      })
      .toArray();
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
    completedWorkoutId: number
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
};

