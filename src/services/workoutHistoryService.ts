import { WorkoutSet } from '@/types/exercise';
import { dataService } from './dataService';

export interface PreviousWorkoutData {
  workoutId: string;
  date: Date;
  sets: WorkoutSet[];
  totalVolume: number;
  exerciseName: string;
}

export interface SetComparison {
  setNumber: number;
  previous?: {
    weight?: number;
    reps?: number;
    rpe?: number;
  };
  current?: {
    weight?: number;
    reps?: number;
    rpe?: number;
  };
  change?: {
    weight?: number;
    reps?: number;
  };
}

export const workoutHistoryService = {
  /**
   * Get last workout for a specific exercise
   */
  async getLastWorkoutForExercise(
    userId: string,
    exerciseId: string
  ): Promise<PreviousWorkoutData | null> {
    const workouts = await dataService.getAllWorkouts(userId);
    
    // Find most recent workout containing this exercise
    for (const workout of workouts) {
      const exercise = workout.exercises.find(
        (ex) => ex.exerciseId === exerciseId
      );
      if (exercise && exercise.sets.length > 0) {
        return {
          workoutId: String(workout.id || ''),
          date: workout.date,
          sets: exercise.sets,
          totalVolume: exercise.totalVolume,
          exerciseName: exercise.exerciseName,
        };
      }
    }

    return null;
  },

  /**
   * Get best performance for an exercise
   */
  async getBestPerformance(
    userId: string,
    exerciseId: string
  ): Promise<{
    maxWeight?: number;
    maxReps?: number;
    maxVolume?: number;
    date?: Date;
  } | null> {
    const workouts = await dataService.getAllWorkouts(userId);
    let best: {
      maxWeight?: number;
      maxReps?: number;
      maxVolume?: number;
      date?: Date;
    } | null = null;

    workouts.forEach((workout) => {
      const exercise = workout.exercises.find(
        (ex) => ex.exerciseId === exerciseId
      );
      if (exercise) {
        exercise.sets.forEach((set) => {
          if (set.completed) {
            if (set.weight && (!best?.maxWeight || set.weight > best.maxWeight)) {
              best = { ...best, maxWeight: set.weight, date: workout.date };
            }
            if (set.reps && (!best?.maxReps || set.reps > best.maxReps)) {
              best = { ...best, maxReps: set.reps, date: workout.date };
            }
            const volume = (set.weight || 0) * (set.reps || 0);
            if (!best?.maxVolume || volume > best.maxVolume) {
              best = { ...best, maxVolume: volume, date: workout.date };
            }
          }
        });
      }
    });

    return best;
  },

  /**
   * Get set-specific previous data (matching by set number)
   */
  getSetSpecificData(
    previousWorkout: PreviousWorkoutData | null,
    setNumber: number
  ): {
    weight?: number;
    reps?: number;
    rpe?: number;
  } | null {
    if (!previousWorkout) return null;

    const set = previousWorkout.sets.find((s) => s.setNumber === setNumber);
    if (!set || !set.completed) return null;

    return {
      weight: set.weight,
      reps: set.reps,
      rpe: set.rpe,
    };
  },

  /**
   * Calculate weight change from previous set
   */
  calculateWeightChange(
    currentWeight: number,
    previousWeight?: number
  ): number | null {
    if (previousWeight === undefined) return null;
    return currentWeight - previousWeight;
  },

  /**
   * Generate "Beat Last" suggestions
   */
  generateBeatLastSuggestions(
    previousSet: { weight?: number; reps?: number } | null
  ): {
    suggestedWeight: number;
    suggestedReps: number;
  } | null {
    if (!previousSet || previousSet.weight === undefined) return null;

    // Suggest 2.5kg increase or same weight with +1 rep
    const suggestedWeight = previousSet.weight + 2.5;
    const suggestedReps = (previousSet.reps || 0) + 1;

    return {
      suggestedWeight,
      suggestedReps,
    };
  },

  /**
   * Compare current set with previous
   */
  compareSets(
    currentSet: { weight?: number; reps?: number; rpe?: number },
    previousSet: { weight?: number; reps?: number; rpe?: number } | null
  ): SetComparison {
    if (!previousSet) {
      return {
        setNumber: 0,
        current: currentSet,
      };
    }

    return {
      setNumber: 0,
      previous: previousSet,
      current: currentSet,
      change: {
        weight:
          currentSet.weight && previousSet.weight
            ? currentSet.weight - previousSet.weight
            : undefined,
        reps:
          currentSet.reps && previousSet.reps
            ? currentSet.reps - previousSet.reps
            : undefined,
      },
    };
  },
};

