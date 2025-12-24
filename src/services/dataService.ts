import { dbHelpers } from './database';
import { Workout } from '@/types/workout';
import { Exercise } from '@/types/exercise';
import { MuscleStatus } from '@/types/muscle';
import { SyncableTable } from '@/types/sync';
import { transactionManager } from './transactionManager';
import { versionManager } from './versionManager';
import { userContextManager } from './userContextManager';
import { errorRecovery } from './errorRecovery';
import { sanitizeString } from '@/utils/sanitize';

interface UserProfile {
  id: string;
  name: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  goals: string[];
  equipment: string[];
  workoutFrequency: number;
  preferredUnit: 'kg' | 'lbs';
  defaultRestTime: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  weight?: number;
  height?: number;
  profilePicture?: string;
  version?: number;
  deletedAt?: Date | null;
}

type EventType = 'workout' | 'user' | 'settings' | 'muscle' | 'exercise';
type EventCallback = () => void;

class DataService {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private syncQueue: Set<SyncableTable> = new Set();
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncEnabled = false;

  // Event system for data synchronization
  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: EventType): void {
    this.listeners.get(event)?.forEach(callback => callback());
    this.queueSyncForEvent(event);
  }

  private queueSyncForEvent(event: EventType): void {
    if (!this.syncEnabled) return;

    const tableMap: Record<EventType, SyncableTable> = {
      workout: 'workouts',
      exercise: 'exercises',
      user: 'user_profiles',
      settings: 'settings',
      muscle: 'muscle_statuses',
    };

    const table = tableMap[event];
    if (table) {
      this.syncQueue.add(table);
      this.debounceSync();
    }
  }

  private debounceSync(): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 5000);
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) return;

    const tables = Array.from(this.syncQueue);
    this.syncQueue.clear();

    try {
      const { supabaseSyncService } = await import('./supabaseSyncService');
      const { useUserStore } = await import('@/store/userStore');
      const userStore = useUserStore.getState();
      
      if (userStore.profile?.id) {
        await supabaseSyncService.sync(userStore.profile.id, {
          tables: tables as SyncableTable[],
          direction: 'push',
        });
      }
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  enableSync(enabled: boolean = true): void {
    this.syncEnabled = enabled;
    if (!enabled && this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }
  }

  async triggerManualSync(userId: string, tables?: SyncableTable[]): Promise<void> {
    try {
      const { supabaseSyncService } = await import('./supabaseSyncService');
      await supabaseSyncService.sync(userId, {
        tables,
        direction: 'bidirectional',
      });
    } catch (error) {
      console.error('Failed to trigger manual sync:', error);
      throw error;
    }
  }

  // Validation helpers
  private validateWorkout(workout: Omit<Workout, 'id'>): void {
    if (!workout.userId) {
      throw new Error('Workout must have a userId');
    }
    if (!workout.date) {
      throw new Error('Workout must have a date');
    }
    
    // Validate date is not in the future
    const workoutDate = new Date(workout.date);
    const now = new Date();
    if (workoutDate > now) {
      throw new Error('Workout date cannot be in the future');
    }
    
    // Validate date is not too far in the past (more than 10 years)
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    if (workoutDate < tenYearsAgo) {
      throw new Error('Workout date is too far in the past');
    }
    
    if (!workout.startTime) {
      throw new Error('Workout must have a startTime');
    }
    
    // Validate startTime is not in the future
    const startTime = new Date(workout.startTime);
    if (startTime > now) {
      throw new Error('Workout startTime cannot be in the future');
    }
    
    // Validate endTime if present
    if (workout.endTime) {
      const endTime = new Date(workout.endTime);
      if (endTime < startTime) {
        throw new Error('Workout endTime must be after startTime');
      }
      if (endTime > now) {
        throw new Error('Workout endTime cannot be in the future');
      }
    }
    
    if (!Array.isArray(workout.exercises)) {
      throw new Error('Workout exercises must be an array');
    }
    
    if (workout.exercises.length === 0) {
      throw new Error('Workout must have at least one exercise');
    }
    
    // Validate each exercise
    workout.exercises.forEach((exercise, index) => {
      if (!exercise.exerciseId) {
        throw new Error(`Exercise at index ${index} must have an exerciseId`);
      }
      if (!exercise.exerciseName || exercise.exerciseName.trim() === '') {
        throw new Error(`Exercise at index ${index} must have a name`);
      }
      if (!Array.isArray(exercise.sets)) {
        throw new Error(`Exercise at index ${index} must have a sets array`);
      }
      if (exercise.sets.length === 0) {
        throw new Error(`Exercise at index ${index} must have at least one set`);
      }
      
      // Validate each set
      exercise.sets.forEach((set, setIndex) => {
        // Validate reps (if present)
        if (set.reps !== undefined) {
          if (!Number.isInteger(set.reps) || set.reps < 0 || set.reps > 1000) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: reps must be between 0 and 1000`
            );
          }
        }
        
        // Validate weight (if present)
        if (set.weight !== undefined) {
          if (typeof set.weight !== 'number' || set.weight < 0 || set.weight > 1000) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: weight must be between 0 and 1000 kg`
            );
          }
        }
        
        // Validate RPE (if present)
        if (set.rpe !== undefined) {
          if (typeof set.rpe !== 'number' || set.rpe < 1 || set.rpe > 10) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: RPE must be between 1 and 10`
            );
          }
        }
        
        // Validate duration (if present)
        if (set.duration !== undefined) {
          if (typeof set.duration !== 'number' || set.duration < 0 || set.duration > 3600) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: duration must be between 0 and 3600 seconds`
            );
          }
        }
        
        // Validate restTime (if present)
        if (set.restTime !== undefined) {
          if (typeof set.restTime !== 'number' || set.restTime < 0 || set.restTime > 3600) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: restTime must be between 0 and 3600 seconds`
            );
          }
        }
      });
    });
    
    // Validate totalDuration if present
    if (workout.totalDuration !== undefined) {
      if (typeof workout.totalDuration !== 'number' || workout.totalDuration < 0 || workout.totalDuration > 1440) {
        throw new Error('Workout totalDuration must be between 0 and 1440 minutes (24 hours)');
      }
    }
    
    // Validate totalVolume if present
    if (workout.totalVolume !== undefined) {
      if (typeof workout.totalVolume !== 'number' || workout.totalVolume < 0) {
        throw new Error('Workout totalVolume must be a non-negative number');
      }
    }
    
    // Validate calories if present
    if (workout.calories !== undefined) {
      if (typeof workout.calories !== 'number' || workout.calories < 0 || workout.calories > 10000) {
        throw new Error('Workout calories must be between 0 and 10000');
      }
    }
  }

  private validateExercise(exercise: Exercise): void {
    if (!exercise.id) {
      throw new Error('Exercise must have an id');
    }
    
    if (!exercise.name || exercise.name.trim() === '') {
      throw new Error('Exercise must have a name');
    }
    
    // Validate name length
    if (exercise.name.trim().length < 2) {
      throw new Error('Exercise name must be at least 2 characters');
    }
    
    if (exercise.name.trim().length > 100) {
      throw new Error('Exercise name must be less than 100 characters');
    }
    
    if (!exercise.category) {
      throw new Error('Exercise must have a category');
    }
    
    // Validate category is valid
    const validCategories = ['strength', 'cardio', 'flexibility', 'olympic', 'plyometric'];
    if (!validCategories.includes(exercise.category)) {
      throw new Error(`Exercise category must be one of: ${validCategories.join(', ')}`);
    }
    
    // Validate primaryMuscles is an array
    if (!Array.isArray(exercise.primaryMuscles)) {
      throw new Error('Exercise primaryMuscles must be an array');
    }
    
    // Validate secondaryMuscles is an array
    if (!Array.isArray(exercise.secondaryMuscles)) {
      throw new Error('Exercise secondaryMuscles must be an array');
    }
    
    // Validate equipment is an array
    if (!Array.isArray(exercise.equipment)) {
      throw new Error('Exercise equipment must be an array');
    }
    
    // Validate instructions is an array
    if (!Array.isArray(exercise.instructions)) {
      throw new Error('Exercise instructions must be an array');
    }
    
    // Validate trackingType
    const validTrackingTypes = ['weight_reps', 'reps_only', 'cardio', 'duration'];
    if (!validTrackingTypes.includes(exercise.trackingType)) {
      throw new Error(`Exercise trackingType must be one of: ${validTrackingTypes.join(', ')}`);
    }
  }

  // Workout operations with ACID transactions and versioning
  async createWorkout(workout: Omit<Workout, 'id'>): Promise<number> {
    this.validateWorkout(workout);
    
    // Sanitize user inputs to prevent XSS
    const sanitizedWorkout: Omit<Workout, 'id'> = {
      ...workout,
      notes: workout.notes ? sanitizeString(workout.notes) : undefined,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        notes: ex.notes ? sanitizeString(ex.notes) : undefined,
        sets: ex.sets.map(set => ({
          ...set,
          notes: set.notes ? sanitizeString(set.notes) : undefined,
        })),
      })),
    };
    
    // Ensure user context
    userContextManager.requireUserId();
    const workoutWithUser = userContextManager.ensureUserId(sanitizedWorkout as Workout);
    
    // Initialize version
    const versionedWorkout = versionManager.initializeVersion(workoutWithUser as Workout);
    
    return await errorRecovery.withRetry(async () => {
      return await transactionManager.execute(['workouts'], async () => {
        const id = await dbHelpers.saveWorkout(versionedWorkout as Omit<Workout, 'id'>);
        this.emit('workout');
        return id;
      });
    });
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    try {
      return await dbHelpers.getWorkout(id);
    } catch (error) {
      throw new Error(`Failed to get workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllWorkouts(userId: string): Promise<Workout[]> {
    try {
      return await dbHelpers.getAllWorkouts(userId);
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkoutsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Workout[]> {
    try {
      return await dbHelpers.getWorkoutsByDateRange(userId, startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to get workouts by date range: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateWorkout(id: number, updates: Partial<Workout>): Promise<void> {
    userContextManager.requireUserId();
    
    // Get current workout to check version
    const current = await dbHelpers.getWorkout(id);
    if (!current) {
      throw new Error(`Workout with id ${id} not found`);
    }
    
    userContextManager.validateUserId(current.userId);
    
    // Increment version
    const versionedUpdates = versionManager.incrementVersion({
      ...current,
      ...updates,
    } as Workout);
    
    return await errorRecovery.withRetry(async () => {
      await transactionManager.execute(['workouts'], async () => {
        await dbHelpers.updateWorkout(id, versionedUpdates);
        this.emit('workout');
      });
    });
  }

  async deleteWorkout(id: number): Promise<void> {
    userContextManager.requireUserId();
    
    // Get current workout for soft delete
    const current = await dbHelpers.getWorkout(id);
    if (!current) {
      throw new Error(`Workout with id ${id} not found`);
    }
    
    userContextManager.validateUserId(current.userId);
    
    // Soft delete with version increment
    const softDeleted = versionManager.softDelete(current);
    
    return await errorRecovery.withRetry(async () => {
      await transactionManager.execute(['workouts'], async () => {
        await dbHelpers.updateWorkout(id, softDeleted);
        this.emit('workout');
      });
    });
  }

  // Exercise operations
  async createExercise(exercise: Exercise): Promise<string> {
    this.validateExercise(exercise);
    
    // Sanitize exercise name and other string fields
    const sanitizedExercise: Exercise = {
      ...exercise,
      name: sanitizeString(exercise.name),
      instructions: exercise.instructions.map(inst => sanitizeString(inst)),
    };
    
    // Ensure user context for custom exercises
    if (sanitizedExercise.isCustom) {
      const userId = userContextManager.requireUserId();
      sanitizedExercise.userId = userId;
    }
    
    // Initialize version
    const versionedExercise = versionManager.initializeVersion(sanitizedExercise);
    
    return await errorRecovery.withRetry(async () => {
      return await transactionManager.execute(['exercises'], async () => {
        return await dbHelpers.saveExercise(versionedExercise);
      });
    });
  }

  async getExercise(id: string): Promise<Exercise | undefined> {
    try {
      return await dbHelpers.getExercise(id);
    } catch (error) {
      throw new Error(`Failed to get exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllExercises(): Promise<Exercise[]> {
    try {
      return await dbHelpers.getAllExercises();
    } catch (error) {
      throw new Error(`Failed to get exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchExercises(query: string): Promise<Exercise[]> {
    try {
      return await dbHelpers.searchExercises(query);
    } catch (error) {
      throw new Error(`Failed to search exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async filterExercisesByEquipment(equipmentCategories: string[]): Promise<Exercise[]> {
    try {
      return await dbHelpers.filterExercisesByEquipment(equipmentCategories);
    } catch (error) {
      throw new Error(`Failed to filter exercises: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteExercise(id: string): Promise<void> {
    const exercise = await dbHelpers.getExercise(id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    
    // Validate user for custom exercises
    if (exercise.isCustom) {
      userContextManager.requireUserId();
      userContextManager.validateUserId(exercise.userId);
      
      // Soft delete
      const softDeleted = versionManager.softDelete(exercise);
      return await errorRecovery.withRetry(async () => {
        await transactionManager.execute(['exercises'], async () => {
          await dbHelpers.saveExercise(softDeleted);
          this.emit('exercise');
        });
      });
    } else {
      // Library exercises cannot be deleted
      throw new Error('Cannot delete library exercise');
    }
  }

  // User profile operations
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      return await dbHelpers.getSetting('userProfile') as UserProfile | null;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.setSetting('userProfile', profile);
        this.emit('user');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Settings operations
  async getSetting(key: string): Promise<unknown> {
    try {
      return await dbHelpers.getSetting(key);
    } catch (error) {
      throw new Error(`Failed to get setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSetting(key: string, value: unknown): Promise<void> {
    let retries = 3;
    while (retries > 0) {
      try {
        await dbHelpers.setSetting(key, value);
        this.emit('settings');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Muscle status operations
  async createMuscleStatus(status: Omit<MuscleStatus, 'id'>): Promise<number> {
    const userId = userContextManager.requireUserId();
    const statusWithUser = { ...status, userId } as MuscleStatus;
    const versionedStatus = versionManager.initializeVersion(statusWithUser);
    
    return await errorRecovery.withRetry(async () => {
      return await transactionManager.execute(['muscleStatuses'], async () => {
        const id = await dbHelpers.saveMuscleStatus(versionedStatus as Omit<MuscleStatus, 'id'>);
        this.emit('muscle');
        return id;
      });
    });
  }

  async getMuscleStatus(muscle: string): Promise<MuscleStatus | undefined> {
    try {
      return await dbHelpers.getMuscleStatus(muscle);
    } catch (error) {
      throw new Error(`Failed to get muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllMuscleStatuses(): Promise<MuscleStatus[]> {
    try {
      return await dbHelpers.getAllMuscleStatuses();
    } catch (error) {
      throw new Error(`Failed to get muscle statuses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateMuscleStatus(id: number, updates: Partial<MuscleStatus>): Promise<void> {
    userContextManager.requireUserId();
    
    const current = await dbHelpers.getMuscleStatus(id.toString());
    if (!current) {
      throw new Error(`Muscle status with id ${id} not found`);
    }
    
    userContextManager.validateUserId(current.userId);
    
    const versionedUpdates = versionManager.incrementVersion({
      ...current,
      ...updates,
    } as MuscleStatus);
    
    return await errorRecovery.withRetry(async () => {
      await transactionManager.execute(['muscleStatuses'], async () => {
        await dbHelpers.updateMuscleStatus(id, versionedUpdates);
        this.emit('muscle');
      });
    });
  }

  async upsertMuscleStatus(status: MuscleStatus): Promise<number> {
    const userId = userContextManager.requireUserId();
    const statusWithUser = { ...status, userId };
    
    const existing = await dbHelpers.getMuscleStatus(status.muscle);
    if (existing) {
      userContextManager.validateUserId(existing.userId);
      const versioned = versionManager.incrementVersion({
        ...existing,
        ...statusWithUser,
      } as MuscleStatus);
      
      return await errorRecovery.withRetry(async () => {
        return await transactionManager.execute(['muscleStatuses'], async () => {
          await dbHelpers.updateMuscleStatus(existing.id!, versioned);
          this.emit('muscle');
          return existing.id!;
        });
      });
    } else {
      const versioned = versionManager.initializeVersion(statusWithUser);
      return await errorRecovery.withRetry(async () => {
        return await transactionManager.execute(['muscleStatuses'], async () => {
          const id = await dbHelpers.saveMuscleStatus(versioned as Omit<MuscleStatus, 'id'>);
          this.emit('muscle');
          return id;
        });
      });
    }
  }

  // Transaction support using transaction manager
  async transaction<T>(
    storeNames: string[],
    operations: (tx: unknown) => Promise<T>
  ): Promise<T> {
    userContextManager.requireUserId();
    return await transactionManager.execute(storeNames, operations);
  }

  // Batch operations
  async batch<T>(
    storeName: string,
    items: T[],
    operation: (item: T) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    userContextManager.requireUserId();
    return await transactionManager.batch(storeName, items, operation, batchSize);
  }
}

export const dataService = new DataService();

