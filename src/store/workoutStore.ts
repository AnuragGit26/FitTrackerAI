import { create } from 'zustand';
import { Workout } from '@/types/workout';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { dataService } from '@/services/dataService';
import { templateService } from '@/services/templateService';
import { muscleRecoveryService } from '@/services/muscleRecoveryService';
import { plannedWorkoutService } from '@/services/plannedWorkoutService';
import { saveWorkoutState, loadWorkoutState, clearWorkoutState } from '@/utils/workoutStatePersistence';
import { saveFailedWorkout } from '@/utils/workoutErrorRecovery';
import { calculateVolume } from '@/utils/calculations';
import { userContextManager } from '@/services/userContextManager';

interface WorkoutState {
  currentWorkout: Workout | null;
  workouts: Workout[];
  isLoading: boolean;
  error: string | null;
  templateId: string | null; // Track if workout started from template
  plannedWorkoutId: string | null; // Track if workout started from planned workout
  workoutTimerStartTime: Date | null; // Workout timer start time

  // Actions
  startWorkout: (userId: string) => Promise<void>;
  startWorkoutFromTemplate: (templateId: string) => Promise<void>;
  startWorkoutFromPlanned: (plannedWorkoutId: string) => Promise<void>;
  addExercise: (exercise: WorkoutExercise) => void;
  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setNumber: number, updates: Partial<WorkoutSet>) => void;
  finishWorkout: (calories?: number, currentDurationSeconds?: number) => Promise<void>;
  cancelWorkout: () => void;
  loadWorkouts: (userId: string) => Promise<void>;
  getWorkout: (id: number) => Promise<Workout | undefined>;
  setWorkoutTimerStartTime: (startTime: Date | null) => void;
}

// Load persisted state on initialization
const persistedState = loadWorkoutState();

// Selectors for optimized re-renders
export const useCurrentWorkout = () => useWorkoutStore((state) => state.currentWorkout);
export const useWorkouts = () => useWorkoutStore((state) => state.workouts);
export const useWorkoutLoading = () => useWorkoutStore((state) => state.isLoading);
export const useWorkoutError = () => useWorkoutStore((state) => state.error);

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentWorkout: persistedState?.currentWorkout || null,
  workouts: [],
  isLoading: false,
  error: null,
  templateId: persistedState?.templateId || null,
  plannedWorkoutId: persistedState?.plannedWorkoutId || null,
  workoutTimerStartTime: null,

  startWorkout: async (userId: string) => {
    const now = new Date();
    const workout: Workout = {
      userId,
      date: now,
      startTime: now,
      exercises: [],
      totalDuration: 0,
      totalVolume: 0,
      musclesTargeted: [],
      workoutType: 'custom',
    };
    set({ currentWorkout: workout, error: null, templateId: null });
    saveWorkoutState({ currentWorkout: workout, templateId: null, plannedWorkoutId: null });
  },

  startWorkoutFromTemplate: async (templateId: string) => {
    try {
      const template = await templateService.getTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      const now = new Date();
      const exercises = templateService.convertTemplateToWorkoutExercises(template);
      const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0);

      const workout: Workout = {
        userId: template.userId,
        date: now,
        startTime: now,
        exercises,
        totalDuration: template.estimatedDuration ?? 0,
        totalVolume,
        musclesTargeted: template.musclesTargeted ?? [],
        workoutType: template.category,
      };

      set({ currentWorkout: workout, error: null, templateId: templateId, plannedWorkoutId: null });
      saveWorkoutState({ currentWorkout: workout, templateId: templateId, plannedWorkoutId: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start workout from template',
      });
      throw error;
    }
  },

  startWorkoutFromPlanned: async (plannedWorkoutId: string) => {
    try {
      const plannedWorkout = await plannedWorkoutService.getPlannedWorkout(plannedWorkoutId);
      if (!plannedWorkout) {
        throw new Error('Planned workout not found');
      }

      if (plannedWorkout.templateId) {
        // Start from template
        await get().startWorkoutFromTemplate(plannedWorkout.templateId);
        set({ plannedWorkoutId: plannedWorkoutId });
      } else {
        // Create workout from planned workout exercises
        const now = new Date();
        const { exerciseLibrary } = await import('@/services/exerciseLibrary');
        
        const exercises: WorkoutExercise[] = await Promise.all(
          (plannedWorkout.exercises ?? []).map(async (ex, index) => {
            // Try to get exercise details from library to get muscle groups
            let musclesWorked = plannedWorkout.musclesTargeted ?? [];
            try {
              const exerciseDetails = await exerciseLibrary.getExerciseById(ex.exerciseId);
              if (exerciseDetails) {
                musclesWorked = [
                  ...(exerciseDetails.primaryMuscles ?? []),
                  ...(exerciseDetails.secondaryMuscles ?? []),
                ];
              }
            } catch (error) {
              // Use planned workout muscles if exercise not found
              console.warn('Exercise not found in library, using planned workout muscles');
            }

            const sets: WorkoutSet[] = Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              reps: ex.reps,
              weight: ex.weight,
              unit: 'kg' as const,
              completed: false,
            }));

            const totalVolume = sets.reduce(
              (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
              0
            );

            return {
              id: `exercise-${Date.now()}-${index}`,
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              sets,
              totalVolume,
              musclesWorked,
              timestamp: now,
            };
          })
        );

        const totalVolume = exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0);
        const allMuscles = Array.from(
          new Set(exercises.flatMap((ex) => ex.musclesWorked ?? []))
        );

        const workout: Workout = {
          userId: plannedWorkout.userId,
          date: now,
          startTime: now,
          exercises,
          totalDuration: plannedWorkout.estimatedDuration ?? 0,
          totalVolume,
          musclesTargeted: allMuscles,
          workoutType: plannedWorkout.category ?? 'custom',
        };

        set({ currentWorkout: workout, error: null, templateId: null, plannedWorkoutId: plannedWorkoutId });
        saveWorkoutState({ currentWorkout: workout, templateId: null, plannedWorkoutId: plannedWorkoutId });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start workout from planned workout',
      });
      throw error;
    }
  },

  addExercise: (exercise: WorkoutExercise) => {
    const { currentWorkout } = get();
    if (!currentWorkout) {
      return;
    }

    const updatedWorkout = {
      ...currentWorkout,
      exercises: [...(currentWorkout.exercises ?? []), exercise],
      musclesTargeted: [
        ...new Set([...(currentWorkout.musclesTargeted ?? []), ...(exercise.musclesWorked ?? [])]),
      ],
      totalVolume: (currentWorkout.totalVolume ?? 0) + (exercise.totalVolume ?? 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => {
    const { currentWorkout } = get();
    if (!currentWorkout || !currentWorkout.exercises) return;

    const exercises = (currentWorkout.exercises ?? []).map((ex) =>
      ex.id === exerciseId ? { ...ex, ...updates } : ex
    );

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      totalVolume: exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0),
    };

    set({ currentWorkout: updatedWorkout });
  },

  removeExercise: (exerciseId: string) => {
    const { currentWorkout } = get();
    if (!currentWorkout || !currentWorkout.exercises) return;

    const exercises = (currentWorkout.exercises ?? []).filter((ex) => ex.id !== exerciseId);

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      musclesTargeted: exercises.reduce<typeof currentWorkout.musclesTargeted>(
        (acc, ex) => {
          const muscles = new Set([...acc, ...(ex.musclesWorked ?? [])]);
          return Array.from(muscles);
        },
        []
      ),
      totalVolume: exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  addSet: (exerciseId: string, workoutSet: WorkoutSet) => {
    const { currentWorkout } = get();
    if (!currentWorkout || !currentWorkout.exercises) return;

    const exercises = (currentWorkout.exercises ?? []).map((ex) => {
      if (ex.id === exerciseId) {
        const newSets = [...(ex.sets ?? []), workoutSet];
        // Use centralized volume calculation utility
        // Infer tracking type from sets if not available
        const totalVolume = calculateVolume(newSets);
        return {
          ...ex,
          sets: newSets,
          totalVolume,
        };
      }
      return ex;
    });

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      totalVolume: exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  updateSet: (exerciseId: string, setNumber: number, updates: Partial<WorkoutSet>) => {
    const { currentWorkout } = get();
    if (!currentWorkout || !currentWorkout.exercises) return;

    const exercises = (currentWorkout.exercises ?? []).map((ex) => {
      if (ex.id === exerciseId) {
        const sets = (ex.sets ?? []).map((s) =>
          s.setNumber === setNumber ? { ...s, ...updates } : s
        );
        // Use centralized volume calculation utility
        // Infer tracking type from sets if not available
        const totalVolume = calculateVolume(sets);
        return {
          ...ex,
          sets,
          totalVolume,
        };
      }
      return ex;
    });

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      totalVolume: exercises.reduce((sum, ex) => sum + (ex.totalVolume ?? 0), 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  finishWorkout: async (calories?: number, currentDurationSeconds?: number) => {
    const { currentWorkout } = get();
    if (!currentWorkout) {
      throw new Error('No active workout to finish');
    }

    set({ isLoading: true, error: null });

    try {
      // Use manual endTime if set in workout, otherwise use current time
      const endTime = currentWorkout.endTime instanceof Date 
        ? currentWorkout.endTime 
        : currentWorkout.endTime 
        ? new Date(currentWorkout.endTime)
        : new Date();
      let startTime: Date;
      let totalDurationMinutes: number;
      
      // PRIORITY 1: Use manual startTime if set in workout (for template workouts)
      if (currentWorkout.startTime instanceof Date || (typeof currentWorkout.startTime === 'string' && currentWorkout.startTime)) {
        startTime = currentWorkout.startTime instanceof Date 
          ? currentWorkout.startTime 
          : new Date(currentWorkout.startTime);
        
        // If we have both manual start and end times, calculate duration from them
        if (currentWorkout.endTime) {
          const durationMs = endTime.getTime() - startTime.getTime();
          totalDurationMinutes = Math.max(0, Math.min(1440, Math.round(durationMs / 60000)));
        } else if (currentDurationSeconds !== undefined && currentDurationSeconds > 0) {
          // Use provided duration seconds
          totalDurationMinutes = Math.round(currentDurationSeconds / 60);
          // Ensure duration is within valid range
          if (totalDurationMinutes < 0) {
            totalDurationMinutes = 0;
          }
          if (totalDurationMinutes > 1440) {
            console.warn(`Duration ${totalDurationMinutes} minutes exceeds 24 hours, capping at 1440 minutes`);
            totalDurationMinutes = 1440;
          }
        } else {
          // Calculate from startTime to endTime
          const durationMs = endTime.getTime() - startTime.getTime();
          totalDurationMinutes = Math.max(0, Math.min(1440, Math.round(durationMs / 60000)));
        }
      } else if (currentDurationSeconds !== undefined && currentDurationSeconds > 0) {
        // PRIORITY 2: Use currentDurationSeconds from timer if available (most reliable)
        // Convert seconds to minutes
        totalDurationMinutes = Math.round(currentDurationSeconds / 60);
        
        // Ensure duration is within valid range
        if (totalDurationMinutes < 0) {
          totalDurationMinutes = 0;
        }
        if (totalDurationMinutes > 1440) {
          console.warn(`Duration ${totalDurationMinutes} minutes exceeds 24 hours, capping at 1440 minutes`);
          totalDurationMinutes = 1440;
        }
        
        // Calculate startTime from endTime - duration to ensure consistency
        const durationMs = totalDurationMinutes * 60000;
        startTime = new Date(endTime.getTime() - durationMs);
      } else {
        // PRIORITY 3: Calculate from startTime to endTime (fallback)
        // Ensure startTime is a valid Date object
        try {
          if (currentWorkout.startTime && typeof currentWorkout.startTime === 'object' && 'getTime' in currentWorkout.startTime) {
            startTime = currentWorkout.startTime as Date;
          } else if (currentWorkout.startTime && typeof currentWorkout.startTime === 'string') {
            startTime = new Date(currentWorkout.startTime);
          } else {
            throw new Error('Invalid startTime');
          }
        } catch {
          // Fallback: use current time if startTime is invalid
          console.warn('Invalid startTime, using current time as fallback');
          startTime = endTime;
        }
        
        // Validate startTime is a valid date
        if (isNaN(startTime.getTime())) {
          console.warn('Corrupted startTime detected, using current time as fallback');
          startTime = endTime;
        }
        
        const durationMs = endTime.getTime() - startTime.getTime();
        
        // Ensure duration is non-negative
        if (durationMs < 0) {
          console.warn('Negative duration detected, using current time as both start and end');
          startTime = endTime;
          totalDurationMinutes = 0;
        } else {
          // Convert milliseconds to minutes
          totalDurationMinutes = Math.round(durationMs / 60000);
        }
        
        // Ensure duration is within valid range
        if (totalDurationMinutes < 0) {
          totalDurationMinutes = 0;
        }
        if (totalDurationMinutes > 1440) {
          console.warn(`Duration ${totalDurationMinutes} minutes exceeds 24 hours, capping at 1440 minutes`);
          totalDurationMinutes = 1440;
          // Recalculate startTime to match capped duration
          const durationMs = totalDurationMinutes * 60000;
          startTime = new Date(endTime.getTime() - durationMs);
        }
      }

      // Final validation - ensure we have valid values
      if (isNaN(startTime.getTime())) {
        console.warn('StartTime is still invalid, using current time');
        startTime = endTime;
      }
      
      if (totalDurationMinutes < 0 || totalDurationMinutes > 1440) {
        console.warn('Duration out of range, using safe defaults');
        totalDurationMinutes = Math.max(0, Math.min(1440, totalDurationMinutes));
        const durationMs = totalDurationMinutes * 60000;
        startTime = new Date(endTime.getTime() - durationMs);
      }

      // Get current user ID from context manager to ensure we use the correct user
      // This prevents errors if user context changed (e.g., logout/login with different account)
      const currentUserId = userContextManager.requireUserId();
      
      // Warn if workout was started with a different user ID (shouldn't happen normally)
      if (currentWorkout.userId && currentWorkout.userId !== currentUserId) {
        console.warn(
          `Workout user ID mismatch: workout started with ${currentWorkout.userId}, ` +
          `but finishing with ${currentUserId}. Using current user ID.`
        );
      }

      const completedWorkout: Workout = {
        ...currentWorkout,
        userId: currentUserId, // Use current user ID from context manager
        startTime, // Use calculated/corrected startTime
        endTime,
        totalDuration: totalDurationMinutes,
        calories: calories !== undefined ? calories : currentWorkout.calories,
      };

      // Save to IndexedDB - this will verify the save was successful
      const workoutId = await dataService.createWorkout(completedWorkout);
      const savedWorkout = { ...completedWorkout, id: workoutId };

      // Only clear state after successful IndexedDB save (verified by createWorkout)
      const currentWorkouts = get().workouts ?? [];
      set({
        currentWorkout: null, // Clear current workout only after successful save
        workouts: [savedWorkout, ...currentWorkouts],
        isLoading: false,
        templateId: null,
        plannedWorkoutId: null,
        error: null, // Clear any previous errors
      });
      
      // Clear persisted state after successful IndexedDB save
      clearWorkoutState();

      // Trigger Supabase sync non-blocking (fire-and-forget)
      // The sync is already queued via dataService.emit('workout'), but we ensure it doesn't block
      // If sync fails, it will be retried later via the sync service
      (async () => {
        try {
          const { supabaseSyncService } = await import('@/services/supabaseSyncService');
          await supabaseSyncService.sync(currentUserId, {
            tables: ['workouts'],
            direction: 'push',
          });
        } catch (syncError) {
          // Log sync failure but don't affect workout save
          console.warn('Supabase sync failed for workout (will retry later):', syncError);
          // Sync will be retried on next sync cycle
        }
      })();

      // Update muscle statuses from the completed workout
      // Don't block workout save if this fails
      try {
        await muscleRecoveryService.updateMuscleStatusesFromWorkout(
          savedWorkout,
          currentUserId // Use current user ID from context manager
        );
      } catch (muscleError) {
        console.error('Failed to update muscle statuses:', muscleError);
        // Continue even if muscle status update fails
      }

      // Mark planned workout as completed if it was started from a planned workout
      const { plannedWorkoutId } = get();
      if (plannedWorkoutId) {
        try {
          await plannedWorkoutService.markAsCompleted(plannedWorkoutId, workoutId);
        } catch (plannedError) {
          console.error('Failed to mark planned workout as completed:', plannedError);
          // Continue even if marking as completed fails
        }
      }
    } catch (error) {
      // On error, keep workout in state so user can retry
      // Don't clear state - this allows recovery
      const errorMessage = error instanceof Error ? error.message : 'Failed to save workout';
      set({
        error: errorMessage,
        isLoading: false,
        // Keep currentWorkout, templateId, plannedWorkoutId so user can retry
      });
      // Keep persisted state so workout can be recovered
      // Don't clear persisted state on error - this is the safety mechanism
      
      // Save failed workout for recovery
      try {
        const { currentWorkout } = get();
        if (currentWorkout) {
          const errorForRecovery = error instanceof Error ? error : new Error(String(error));
          saveFailedWorkout(currentWorkout, errorForRecovery);
        }
      } catch (recoveryError) {
        console.error('Failed to save failed workout for recovery:', recoveryError);
      }
      
      throw error;
    }
  },

  cancelWorkout: () => {
    set({ currentWorkout: null, error: null, templateId: null, plannedWorkoutId: null, workoutTimerStartTime: null });
    // Clear persisted state when cancelled
    clearWorkoutState();
  },

  setWorkoutTimerStartTime: (startTime: Date | null) => {
    set({ workoutTimerStartTime: startTime });
  },

  loadWorkouts: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const workouts = await dataService.getAllWorkouts(userId);
      set({ workouts: workouts ?? [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load workouts',
        isLoading: false,
      });
    }
  },

  getWorkout: async (id: number) => {
    try {
      return await dataService.getWorkout(id);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load workout',
      });
      return undefined;
    }
  },
}));

