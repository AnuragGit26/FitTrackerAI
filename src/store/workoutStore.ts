import { create } from 'zustand';
import { Workout } from '@/types/workout';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { dataService } from '@/services/dataService';
import { templateService } from '@/services/templateService';
import { muscleRecoveryService } from '@/services/muscleRecoveryService';
import { plannedWorkoutService } from '@/services/plannedWorkoutService';
import { saveWorkoutState, loadWorkoutState, clearWorkoutState } from '@/utils/workoutStatePersistence';

interface WorkoutState {
  currentWorkout: Workout | null;
  workouts: Workout[];
  isLoading: boolean;
  error: string | null;
  templateId: string | null; // Track if workout started from template
  plannedWorkoutId: string | null; // Track if workout started from planned workout

  // Actions
  startWorkout: (userId: string) => Promise<void>;
  startWorkoutFromTemplate: (templateId: string) => Promise<void>;
  startWorkoutFromPlanned: (plannedWorkoutId: string) => Promise<void>;
  addExercise: (exercise: WorkoutExercise) => void;
  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setNumber: number, updates: Partial<WorkoutSet>) => void;
  finishWorkout: () => Promise<void>;
  cancelWorkout: () => void;
  loadWorkouts: (userId: string) => Promise<void>;
  getWorkout: (id: number) => Promise<Workout | undefined>;
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
      const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);

      const workout: Workout = {
        userId: template.userId,
        date: now,
        startTime: now,
        exercises,
        totalDuration: template.estimatedDuration,
        totalVolume,
        musclesTargeted: template.musclesTargeted,
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
          plannedWorkout.exercises.map(async (ex, index) => {
            // Try to get exercise details from library to get muscle groups
            let musclesWorked = plannedWorkout.musclesTargeted;
            try {
              const exerciseDetails = await exerciseLibrary.getExercise(ex.exerciseId);
              if (exerciseDetails) {
                musclesWorked = [
                  ...exerciseDetails.primaryMuscles,
                  ...exerciseDetails.secondaryMuscles,
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

        const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0);
        const allMuscles = Array.from(
          new Set(exercises.flatMap((ex) => ex.musclesWorked))
        );

        const workout: Workout = {
          userId: plannedWorkout.userId,
          date: now,
          startTime: now,
          exercises,
          totalDuration: plannedWorkout.estimatedDuration,
          totalVolume,
          musclesTargeted: allMuscles,
          workoutType: plannedWorkout.category,
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
      exercises: [...currentWorkout.exercises, exercise],
      musclesTargeted: [
        ...new Set([...currentWorkout.musclesTargeted, ...exercise.musclesWorked]),
      ],
      totalVolume: currentWorkout.totalVolume + exercise.totalVolume,
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    const exercises = currentWorkout.exercises.map((ex) =>
      ex.id === exerciseId ? { ...ex, ...updates } : ex
    );

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      totalVolume: exercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    };

    set({ currentWorkout: updatedWorkout });
  },

  removeExercise: (exerciseId: string) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    const exercises = currentWorkout.exercises.filter((ex) => ex.id !== exerciseId);

    const updatedWorkout = {
      ...currentWorkout,
      exercises,
      musclesTargeted: exercises.reduce<typeof currentWorkout.musclesTargeted>(
        (acc, ex) => {
          const muscles = new Set([...acc, ...ex.musclesWorked]);
          return Array.from(muscles);
        },
        []
      ),
      totalVolume: exercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  addSet: (exerciseId: string, workoutSet: WorkoutSet) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    const exercises = currentWorkout.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const newSets = [...ex.sets, workoutSet];
        // Volume is calculated in LogWorkout before saving, so we preserve it
        // or recalculate if needed (though this is a fallback)
        const totalVolume = newSets.reduce((sum, s) => {
          if (!s.completed) return sum;
          // Handle different tracking types
          if (s.weight !== undefined && s.reps !== undefined) {
            return sum + s.reps * s.weight;
          }
          if (s.reps !== undefined) {
            return sum + s.reps; // reps_only
          }
          if (s.distance !== undefined) {
            const distanceKm = s.distanceUnit === 'miles' ? s.distance * 1.60934 : s.distance;
            return sum + distanceKm; // cardio
          }
          if (s.duration !== undefined) {
            return sum + s.duration; // duration
          }
          return sum;
        }, 0);
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
      totalVolume: exercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  updateSet: (exerciseId: string, setNumber: number, updates: Partial<WorkoutSet>) => {
    const { currentWorkout } = get();
    if (!currentWorkout) return;

    const exercises = currentWorkout.exercises.map((ex) => {
      if (ex.id === exerciseId) {
        const sets = ex.sets.map((s) =>
          s.setNumber === setNumber ? { ...s, ...updates } : s
        );
        // Volume is calculated in LogWorkout before saving, so we preserve it
        // or recalculate if needed (though this is a fallback)
        const totalVolume = sets.reduce((sum, s) => {
          if (!s.completed) return sum;
          // Handle different tracking types
          if (s.weight !== undefined && s.reps !== undefined) {
            return sum + s.reps * s.weight;
          }
          if (s.reps !== undefined) {
            return sum + s.reps; // reps_only
          }
          if (s.distance !== undefined) {
            const distanceKm = s.distanceUnit === 'miles' ? s.distance * 1.60934 : s.distance;
            return sum + distanceKm; // cardio
          }
          if (s.duration !== undefined) {
            return sum + s.duration; // duration
          }
          return sum;
        }, 0);
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
      totalVolume: exercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    };

    set({ currentWorkout: updatedWorkout });
    saveWorkoutState({ currentWorkout: updatedWorkout, templateId: get().templateId, plannedWorkoutId: get().plannedWorkoutId });
  },

  finishWorkout: async () => {
    const { currentWorkout } = get();
    if (!currentWorkout) {
      throw new Error('No active workout to finish');
    }

    set({ isLoading: true, error: null });

    try {
      // Calculate total duration from startTime to endTime
      const endTime = new Date();
      const startTime = currentWorkout.startTime instanceof Date
        ? currentWorkout.startTime
        : new Date(currentWorkout.startTime);
      
      const durationMs = endTime.getTime() - startTime.getTime();
      const totalDurationMinutes = Math.floor(durationMs / (1000 * 60));

      const completedWorkout: Workout = {
        ...currentWorkout,
        endTime,
        totalDuration: totalDurationMinutes,
      };

      const workoutId = await dataService.createWorkout(completedWorkout);
      const savedWorkout = { ...completedWorkout, id: workoutId };

      // Update muscle statuses from the completed workout
      // Don't block workout save if this fails
      try {
        await muscleRecoveryService.updateMuscleStatusesFromWorkout(
          savedWorkout,
          currentWorkout.userId
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

      const currentWorkouts = get().workouts;
      set({
        currentWorkout: null,
        workouts: [savedWorkout, ...currentWorkouts],
        isLoading: false,
        templateId: null,
        plannedWorkoutId: null,
      });
      // Clear persisted state after successful save
      clearWorkoutState();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to save workout',
        isLoading: false,
      });
      throw error;
    }
  },

  cancelWorkout: () => {
    set({ currentWorkout: null, error: null, templateId: null, plannedWorkoutId: null });
    // Clear persisted state when cancelled
    clearWorkoutState();
  },

  loadWorkouts: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const workouts = await dataService.getAllWorkouts(userId);
      set({ workouts, isLoading: false });
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

