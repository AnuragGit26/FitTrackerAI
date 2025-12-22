import { Workout } from '@/types/workout';
import { WorkoutSet } from '@/types/exercise';
import { ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';

const STORAGE_KEYS = {
  workoutState: 'fittrackai_current_workout_state',
  logWorkoutState: 'fittrackai_log_workout_state',
};

export interface LogWorkoutStateSnapshot {
  selectedExerciseId: string | null;
  sets: WorkoutSet[];
  restTimerEnabled: boolean;
  workoutDate: string; // ISO string
  notes: string;
  editingExerciseId: string | null;
  selectedCategory: ExerciseCategory | null;
  selectedMuscleGroups: MuscleGroupCategory[];
  restTimerVisible: boolean;
  restTimerRemaining: number;
  restTimerStartTime: string | null; // ISO string
  workoutTimerStartTime: string | null; // ISO string
}

export interface WorkoutStateSnapshot {
  currentWorkout: Workout | null;
  templateId: string | null;
  plannedWorkoutId: string | null;
}

/**
 * Serialize a Workout object for storage (convert Dates to ISO strings)
 */
function serializeWorkout(workout: Workout | null): any {
  if (!workout) return null;

  return {
    ...workout,
    date: workout.date instanceof Date ? workout.date.toISOString() : workout.date,
    startTime: workout.startTime instanceof Date ? workout.startTime.toISOString() : workout.startTime,
    endTime: workout.endTime instanceof Date ? workout.endTime.toISOString() : workout.endTime,
    exercises: workout.exercises.map((ex) => ({
      ...ex,
      timestamp: ex.timestamp instanceof Date ? ex.timestamp.toISOString() : ex.timestamp,
      sets: ex.sets.map((set) => ({
        ...set,
        setStartTime: set.setStartTime instanceof Date ? set.setStartTime.toISOString() : set.setStartTime,
        setEndTime: set.setEndTime instanceof Date ? set.setEndTime.toISOString() : set.setEndTime,
      })),
    })),
  };
}

/**
 * Deserialize a Workout object from storage (convert ISO strings to Dates)
 */
function deserializeWorkout(workoutData: any): Workout | null {
  if (!workoutData) return null;

  try {
    return {
      ...workoutData,
      date: workoutData.date ? new Date(workoutData.date) : new Date(),
      startTime: workoutData.startTime ? new Date(workoutData.startTime) : new Date(),
      endTime: workoutData.endTime ? new Date(workoutData.endTime) : undefined,
      exercises: workoutData.exercises?.map((ex: any) => ({
        ...ex,
        timestamp: ex.timestamp ? new Date(ex.timestamp) : new Date(),
        sets: ex.sets?.map((set: any) => ({
          ...set,
          setStartTime: set.setStartTime ? new Date(set.setStartTime) : undefined,
          setEndTime: set.setEndTime ? new Date(set.setEndTime) : undefined,
        })) || [],
      })) || [],
    };
  } catch (error) {
    console.error('Failed to deserialize workout:', error);
    return null;
  }
}

/**
 * Save workout store state to localStorage
 */
export function saveWorkoutState(state: WorkoutStateSnapshot): void {
  try {
    const serialized = {
      currentWorkout: serializeWorkout(state.currentWorkout),
      templateId: state.templateId,
      plannedWorkoutId: state.plannedWorkoutId,
    };
    localStorage.setItem(STORAGE_KEYS.workoutState, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save workout state:', error);
  }
}

/**
 * Load workout store state from localStorage
 */
export function loadWorkoutState(): WorkoutStateSnapshot | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.workoutState);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      currentWorkout: deserializeWorkout(parsed.currentWorkout),
      templateId: parsed.templateId || null,
      plannedWorkoutId: parsed.plannedWorkoutId || null,
    };
  } catch (error) {
    console.error('Failed to load workout state:', error);
    return null;
  }
}

/**
 * Save LogWorkout component state to localStorage
 */
export function saveLogWorkoutState(state: LogWorkoutStateSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEYS.logWorkoutState, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save log workout state:', error);
  }
}

/**
 * Load LogWorkout component state from localStorage
 */
export function loadLogWorkoutState(): LogWorkoutStateSnapshot | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.logWorkoutState);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Deserialize sets with Date objects
    const sets = parsed.sets?.map((set: any) => ({
      ...set,
      setStartTime: set.setStartTime ? new Date(set.setStartTime) : undefined,
      setEndTime: set.setEndTime ? new Date(set.setEndTime) : undefined,
    })) || [];

    return {
      selectedExerciseId: parsed.selectedExerciseId || null,
      sets,
      restTimerEnabled: parsed.restTimerEnabled || false,
      workoutDate: parsed.workoutDate || new Date().toISOString(),
      notes: parsed.notes || '',
      editingExerciseId: parsed.editingExerciseId || null,
      selectedCategory: parsed.selectedCategory || null,
      selectedMuscleGroups: parsed.selectedMuscleGroups || [],
      restTimerVisible: parsed.restTimerVisible || false,
      restTimerRemaining: parsed.restTimerRemaining || 60,
      restTimerStartTime: parsed.restTimerStartTime || null,
      workoutTimerStartTime: parsed.workoutTimerStartTime || null,
    };
  } catch (error) {
    console.error('Failed to load log workout state:', error);
    return null;
  }
}

/**
 * Clear all persisted workout state
 */
export function clearWorkoutState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.workoutState);
    localStorage.removeItem(STORAGE_KEYS.logWorkoutState);
  } catch (error) {
    console.error('Failed to clear workout state:', error);
  }
}

