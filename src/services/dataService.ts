import { dbHelpers } from './database';
import { Workout } from '@/types/workout';
import { Exercise, ExerciseTrackingType } from '@/types/exercise';
import { MuscleStatus, MuscleGroup } from '@/types/muscle';
import { SyncableTable } from '@/types/sync';
import { transactionManager } from './transactionManager';
import { versionManager } from './versionManager';
import { userContextManager } from './userContextManager';
import { errorRecovery } from './errorRecovery';
import { sanitizeString } from '@/utils/sanitize';
import { Transaction } from 'dexie';
import { validateReps, validateWeight, validateDuration, validateCalories, validateRPE } from '@/utils/validators';
import { calculateVolume } from '@/utils/calculations';
import { exerciseLibrary } from '@/services/exerciseLibrary';

// UserProfile type - matches userStore definition
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
type Goal = 'build_muscle' | 'gain_strength' | 'lose_fat' | 'improve_endurance' | 'general_fitness';
type Gender = 'male' | 'female' | 'other';

interface UserProfile {
  id: string;
  name: string;
  experienceLevel: ExperienceLevel;
  goals: Goal[];
  equipment: string[];
  workoutFrequency: number;
  preferredUnit: 'kg' | 'lbs';
  defaultRestTime: number;
  age?: number;
  gender?: Gender;
  weight?: number;
  height?: number;
  profilePicture?: string;
  version?: number;
  deletedAt?: Date | null;
}

type EventType = 'workout' | 'user' | 'settings' | 'muscle' | 'exercise' | 'sleep' | 'recovery';
type EventCallback = () => void;

class DataService {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();
  private syncQueue: Set<SyncableTable> = new Set();
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private syncEnabled = false;

  // LocalStorage helpers for profile pictures
  private getProfilePictureStorageKey(userId: string): string {
    return `fitTrackAI_profilePicture_${userId}`;
  }

  getProfilePictureFromLocalStorage(userId: string): string | null {
    try {
      const key = this.getProfilePictureStorageKey(userId);
      const value = localStorage.getItem(key);
      return value || null;
    } catch (error) {
      console.warn('Failed to read profile picture from LocalStorage:', error);
      return null;
    }
  }

  private setProfilePictureToLocalStorage(userId: string, pictureUrl: string | undefined): void {
    try {
      const key = this.getProfilePictureStorageKey(userId);
      if (pictureUrl) {
        localStorage.setItem(key, pictureUrl);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to write profile picture to LocalStorage:', error);
    }
  }

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

  notifySleepUpdate(): void {
    this.emit('sleep');
  }

  public notifyRecoveryUpdate(): void {
    this.emit('recovery');
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
      sleep: 'sleep_logs',
      recovery: 'recovery_logs',
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
      const { mongodbSyncService } = await import('./mongodbSyncService');
      const { useUserStore } = await import('@/store/userStore');
      const userStore = useUserStore.getState();
      
      if (userStore.profile?.id) {
        await mongodbSyncService.sync(userStore.profile.id, {
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
      const { mongodbSyncService } = await import('./mongodbSyncService');
      await mongodbSyncService.sync(userId, {
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
    
    // Validate date is not in the future (with tolerance for clock skew)
    const workoutDate = new Date(workout.date);
    const now = new Date();
    const toleranceMs = 5000; // 5 seconds tolerance for clock skew
    
    if (workoutDate.getTime() > now.getTime() + toleranceMs) {
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
    
    // Validate startTime is not in the future (with tolerance)
    const startTime = new Date(workout.startTime);
    if (startTime.getTime() > now.getTime() + toleranceMs) {
      throw new Error('Workout startTime cannot be in the future');
    }
    
    // Validate endTime if present
    if (workout.endTime) {
      const endTime = new Date(workout.endTime);
      if (endTime < startTime) {
        throw new Error('Workout endTime must be after startTime');
      }
      if (endTime.getTime() > now.getTime() + toleranceMs) {
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
    (workout.exercises ?? []).forEach((exercise, index) => {
      if (!exercise?.exerciseId) {
        throw new Error(`Exercise at index ${index} must have an exerciseId`);
      }
      if (!exercise.exerciseName || exercise.exerciseName.trim() === '') {
        throw new Error(`Exercise at index ${index} must have a name`);
      }
      if (!Array.isArray(exercise.sets)) {
        throw new Error(`Exercise at index ${index} must have a sets array`);
      }
      if ((exercise.sets ?? []).length === 0) {
        throw new Error(`Exercise at index ${index} must have at least one set`);
      }
      
      // Validate musclesWorked is set and is an array
      if (!Array.isArray(exercise.musclesWorked)) {
        throw new Error(`Exercise at index ${index} must have a musclesWorked array`);
      }
      if ((exercise.musclesWorked ?? []).length === 0) {
        // Allow empty array but log a warning - this might cause issues with muscle distribution
        console.warn(`Exercise "${exercise.exerciseName}" at index ${index} has no musclesWorked. This may cause issues with muscle distribution calculations.`);
      }
      
      // Validate each set using centralized validators
      // Get exercise tracking type from exercise library if available
      (exercise.sets ?? []).forEach((set, setIndex) => {
        // Validate reps (if present) - allow 0 for incomplete sets
        if (set.reps !== undefined) {
          if (set.reps === 0 && !set.completed) {
            // Allow 0 reps for incomplete sets
          } else if (set.reps > 0) {
            const repsValidation = validateReps(set.reps);
            if (!repsValidation.valid) {
              throw new Error(
                `Exercise at index ${index}, set ${setIndex + 1}: ${repsValidation.error}`
              );
            }
          } else if (set.completed && set.reps <= 0) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: completed sets must have reps > 0`
            );
          }
        }
        
        // Validate weight (if present) - use exercise unit or default to kg
        if (set.weight !== undefined && set.weight > 0) {
          const unit = set.unit || 'kg';
          const weightValidation = validateWeight(set.weight, unit);
          if (!weightValidation.valid) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: ${weightValidation.error}`
            );
          }
        }
        
        // Validate RPE (if present)
        if (set.rpe !== undefined) {
          if (!validateRPE(set.rpe)) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: RPE must be between 1 and 10`
            );
          }
        }
        
        // Validate duration (if present)
        if (set.duration !== undefined && set.duration > 0) {
          const durationValidation = validateDuration(set.duration);
          if (!durationValidation.valid) {
            throw new Error(
              `Exercise at index ${index}, set ${setIndex + 1}: ${durationValidation.error}`
            );
          }
        }
        
        // Validate restTime (if present) - allow up to 1 hour
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
      // Check if it's a valid number
      if (typeof workout.totalDuration !== 'number' || !Number.isFinite(workout.totalDuration)) {
        throw new Error('Workout totalDuration must be a valid number');
      }
      
      // Round to nearest integer to handle any floating point precision issues
      const durationMinutes = Math.round(workout.totalDuration);
      
      // Validate range: 0 to 1440 minutes (24 hours)
      if (durationMinutes < 0 || durationMinutes > 1440) {
        throw new Error(`Workout duration (${durationMinutes} minutes) must be between 0 and 1440 minutes (24 hours)`);
      }
    }
    
    // Validate totalVolume if present
    if (workout.totalVolume !== undefined) {
      if (typeof workout.totalVolume !== 'number' || workout.totalVolume < 0) {
        throw new Error('Workout totalVolume must be a non-negative number');
      }
    }
    
    // Validate calories if present using centralized validator
    if (workout.calories !== undefined) {
      const caloriesValidation = validateCalories(workout.calories);
      if (!caloriesValidation.valid) {
        throw new Error(`Workout calories: ${caloriesValidation.error}`);
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
    
    // Sanitize user inputs to prevent XSS and normalize duration
    const sanitizedWorkout: Omit<Workout, 'id'> = {
      ...workout,
      // Normalize totalDuration to integer minutes to handle floating point precision
      totalDuration: workout.totalDuration !== undefined 
        ? Math.round(workout.totalDuration) 
        : workout.totalDuration,
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
        
        // Verify workout was actually saved by reading it back
        const savedWorkout = await dbHelpers.getWorkout(id);
        if (!savedWorkout) {
          throw new Error(`Failed to verify workout save: workout with id ${id} not found after save operation`);
        }
        
        // Verify critical fields match
        if (savedWorkout.userId !== versionedWorkout.userId) {
          throw new Error(`Workout save verification failed: userId mismatch`);
        }
        if (savedWorkout.date.getTime() !== new Date(versionedWorkout.date).getTime()) {
          throw new Error(`Workout save verification failed: date mismatch`);
        }
        if (savedWorkout.exercises.length !== versionedWorkout.exercises.length) {
          throw new Error(`Workout save verification failed: exercise count mismatch (expected ${versionedWorkout.exercises.length}, got ${savedWorkout.exercises.length})`);
        }
        
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
    // eslint-disable-next-line no-console
    console.debug('[DataService.getAllWorkouts] Called with userId:', userId);
    try {
      const workouts = await dbHelpers.getAllWorkouts(userId);
      // eslint-disable-next-line no-console
      console.debug(`[DataService.getAllWorkouts] Returning ${workouts.length} workouts for userId: ${userId}`);
      return workouts;
    } catch (error) {
      console.error('[DataService.getAllWorkouts] Error:', error);
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
    
    // Merge updates with current workout
    const mergedWorkout = {
      ...current,
      ...updates,
    } as Workout;
    
    // Recalculate metrics if exercises, sets, or times changed
    const recalculatedWorkout = this.recalculateWorkoutMetrics(mergedWorkout);
    
    // Increment version
    const versionedUpdates = versionManager.incrementVersion(recalculatedWorkout);
    
    return await errorRecovery.withRetry(async () => {
      await transactionManager.execute(['workouts'], async () => {
        await dbHelpers.updateWorkout(id, versionedUpdates);
        this.emit('workout');
      });
    });
  }

  /**
   * Recalculate workout metrics (volume, duration, muscles targeted)
   */
  private recalculateWorkoutMetrics(workout: Workout): Workout {
    // Recalculate exercise volumes and total volume
    let totalVolume = 0;
    const allMuscles = new Set<string>();
    
    const finalExercises = workout.exercises.map((exercise) => {
      // Infer tracking type from sets if not available
      let trackingType: string | undefined;
      const firstSet = exercise.sets[0];
      if (firstSet) {
        if (firstSet.weight !== undefined || (firstSet.reps !== undefined && firstSet.weight !== undefined)) {
          trackingType = 'weight_reps';
        } else if (firstSet.distance !== undefined) {
          trackingType = 'cardio';
        } else if (firstSet.duration !== undefined) {
          trackingType = 'duration';
        } else if (firstSet.reps !== undefined) {
          trackingType = 'reps_only';
        }
      }
      
      // Recalculate exercise volume
      const exerciseVolume = calculateVolume(exercise.sets, trackingType as ExerciseTrackingType);
      
      // Collect muscles from exercise
      exercise.musclesWorked?.forEach(muscle => allMuscles.add(muscle));
      
      return {
        ...exercise,
        totalVolume: exerciseVolume,
      };
    });
    
    // Calculate total volume
    totalVolume = finalExercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0);
    
    // Recalculate duration if start/end times are present
    let totalDuration = workout.totalDuration;
    if (workout.startTime && workout.endTime) {
      const startTime = new Date(workout.startTime);
      const endTime = new Date(workout.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      totalDuration = Math.max(0, Math.round(durationMs / 60000)); // Convert to minutes
      // Cap at 24 hours (1440 minutes)
      if (totalDuration > 1440) {
        totalDuration = 1440;
      }
    } else if (workout.startTime && !workout.endTime && workout.totalDuration > 0) {
      // If only startTime is present, keep existing duration
      totalDuration = workout.totalDuration;
    }
    
    return {
      ...workout,
      exercises: finalExercises,
      totalVolume,
      totalDuration,
      musclesTargeted: Array.from(allMuscles) as MuscleGroup[],
    };
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

  // User profile operations - STRICTLY user-ID specific
  /**
   * Get user profile for a specific user ID
   * @param userId - REQUIRED: The user ID to get the profile for
   * @returns UserProfile or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) {
      throw new Error('User ID is required to get user profile');
    }

    try {
      // Use user-specific storage key
      const storageKey = `userProfile_${userId}`;
      let profile = await dbHelpers.getSetting(storageKey) as UserProfile | null;
      
      // Migration: Check for old global profile if no user-specific profile exists
      if (!profile) {
        const oldProfile = await dbHelpers.getSetting('userProfile') as UserProfile | null;
        // Only migrate if the old profile belongs to this user
        if (oldProfile && oldProfile.id === userId) {
          // Migrate to user-specific storage
          await dbHelpers.setSetting(storageKey, oldProfile);
          // Delete old global profile after migration
          await dbHelpers.deleteSetting('userProfile').catch(() => {
            // Ignore errors if old profile doesn't exist
          });
          profile = oldProfile;
        }
      }
      
      if (!profile) return null;
      
      // Double-check: ensure profile belongs to requested user
      if (profile.id !== userId) {
        console.warn(`Profile ID mismatch: requested ${userId}, got ${profile.id}`);
        return null;
      }
      
      // Check LocalStorage for profile picture if IndexedDB doesn't have it (backward compatibility)
      if (!profile.profilePicture && profile.id) {
        const localPicture = this.getProfilePictureFromLocalStorage(profile.id);
        if (localPicture) {
          profile.profilePicture = localPicture;
        }
      }
      
      // Ensure goals is properly typed
      return {
        ...profile,
        goals: Array.isArray(profile.goals) ? profile.goals as Goal[] : [],
      } as UserProfile;
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user profile for a specific user ID
   * @param userId - REQUIRED: The user ID to delete the profile for
   */
  async deleteUserProfile(userId: string): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required to delete user profile');
    }

    try {
      // Delete user-specific profile
      const storageKey = `userProfile_${userId}`;
      await dbHelpers.deleteSetting(storageKey);
      
      // Also try to delete old global profile if it exists (migration cleanup)
      await dbHelpers.deleteSetting('userProfile').catch(() => {
        // Ignore errors if old profile doesn't exist
      });
      
      this.emit('user');
    } catch (error) {
      throw new Error(`Failed to delete user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user profile - STRICTLY user-ID specific
   * @param profile - Profile data to update (must include id field)
   */
  async updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
    if (!profile.id) {
      throw new Error('Profile ID is required to update user profile');
    }

    const userId = profile.id;
    let retries = 3;
    while (retries > 0) {
      try {
        // Use user-specific storage key
        const storageKey = `userProfile_${userId}`;
        
        // Get existing profile for this user
        const existingProfile = await dbHelpers.getSetting(storageKey) as UserProfile | null;
        
        // Migration: Check old global profile if no user-specific profile exists
        let profileToMerge = existingProfile;
        if (!profileToMerge) {
          const oldProfile = await dbHelpers.getSetting('userProfile') as UserProfile | null;
          // Only use old profile if it belongs to this user
          if (oldProfile && oldProfile.id === userId) {
            profileToMerge = oldProfile;
          }
        }
        
        // Merge with existing profile (same user or no existing profile)
        const mergedProfile = profileToMerge ? { ...profileToMerge, ...profile } : profile as UserProfile;
        
        // Ensure the merged profile has the correct user ID
        if (mergedProfile.id !== userId) {
          throw new Error(`Profile ID mismatch: cannot update profile for user ${userId} with profile ID ${mergedProfile.id}`);
        }
        
        // Save to user-specific storage
        await dbHelpers.setSetting(storageKey, mergedProfile);
        
        // Delete old global profile if it exists (migration cleanup)
        if (existingProfile === null) {
          await dbHelpers.deleteSetting('userProfile').catch(() => {
            // Ignore errors if old profile doesn't exist
          });
        }
        
        // Also write profile picture to LocalStorage if it's being updated
        if (profile.profilePicture !== undefined && mergedProfile.id) {
          this.setProfilePictureToLocalStorage(mergedProfile.id, profile.profilePicture);
        }
        
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
    operation: (tx: Transaction, item: T) => Promise<void>,
    batchSize: number = 100
  ): Promise<void> {
    userContextManager.requireUserId();
    return await transactionManager.batch(storeName, items, operation, batchSize);
  }
}

export const dataService = new DataService();

