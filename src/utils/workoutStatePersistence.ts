import { Workout } from '@/types/workout';
import { WorkoutSet } from '@/types/exercise';
import { ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';

const STORAGE_KEYS = {
  workoutState: 'fittrackai_current_workout_state',
  logWorkoutState: 'fittrackai_log_workout_state',
  logExerciseState: 'fittrackai_log_exercise_state',
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
  restTimerPaused: boolean;
  restTimerOriginalDuration: number | null; // Original duration when timer started
  workoutTimerStartTime: string | null; // ISO string
  showAdditionalDetails: boolean;
  setDurationStartTime: string | null; // ISO string
  setDurationElapsed: number; // seconds
}

const WORKOUT_STATE_VERSION = 1;

export interface WorkoutStateSnapshot {
  version: number;
  currentWorkout: Workout | null;
  templateId: string | null;
  plannedWorkoutId: string | null;
}

export interface LogExerciseStateSnapshot {
  selectedExerciseId: string | null;
  sets: WorkoutSet[];
  notes: string;
  workoutDate: string; // ISO string
  exerciseId: string | null; // For editing existing exercise
}

/**
 * Serialize a Workout object for storage (convert Dates to ISO strings)
 */
function serializeWorkout(workout: Workout | null): Record<string, unknown> | null {
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
function deserializeWorkout(workoutData: Record<string, unknown>): Workout | null {
  if (!workoutData) return null;

  try {
    return {
      ...workoutData,
      date: workoutData.date ? new Date(workoutData.date as string) : new Date(),
      startTime: workoutData.startTime ? new Date(workoutData.startTime as string) : new Date(),
      endTime: workoutData.endTime ? new Date(workoutData.endTime as string) : undefined,
      exercises: (workoutData.exercises as Array<Record<string, unknown>>)?.map((ex) => ({
        ...ex,
        timestamp: ex.timestamp ? new Date(ex.timestamp as string) : new Date(),
        sets: (ex.sets as Array<Record<string, unknown>>)?.map((set) => ({
          ...set,
          setStartTime: set.setStartTime ? new Date(set.setStartTime as string) : undefined,
          setEndTime: set.setEndTime ? new Date(set.setEndTime as string) : undefined,
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
      version: WORKOUT_STATE_VERSION,
      currentWorkout: serializeWorkout(state.currentWorkout),
      templateId: state.templateId,
      plannedWorkoutId: state.plannedWorkoutId,
    };
    
    const serializedString = JSON.stringify(serialized);
    
    // Check size (localStorage typically has 5-10MB limit, use 4MB threshold)
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (serializedString.length > MAX_SIZE) {
      console.warn('Workout state too large, clearing old state and retrying');
      // Clear old state and retry
      clearWorkoutState();
      // If still too large, truncate exercises (last resort)
      if (serializedString.length > MAX_SIZE) {
        console.error('Workout state still too large after clearing, cannot save');
        return;
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.workoutState, serializedString);
  } catch (error) {
    if (error instanceof DOMException && (error.code === 22 || error.name === 'QuotaExceededError')) {
      // Quota exceeded - try to clear old state and retry once
      console.warn('localStorage quota exceeded, attempting cleanup');
      try {
        clearWorkoutState();
        // Retry once after cleanup
        const serialized = {
          currentWorkout: serializeWorkout(state.currentWorkout),
          templateId: state.templateId,
          plannedWorkoutId: state.plannedWorkoutId,
        };
        localStorage.setItem(STORAGE_KEYS.workoutState, JSON.stringify(serialized));
      } catch (retryError) {
        console.error('Failed to save workout state after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save workout state:', error);
    }
  }
}

/**
 * Load workout store state from localStorage
 */
/**
 * Migrate workout state from older versions to current version
 */
function migrateWorkoutState(parsed: Record<string, unknown>): WorkoutStateSnapshot | null {
  const version = parsed.version as number | undefined;
  
  // Version 1 is current, no migration needed if version is 1
  if (version === WORKOUT_STATE_VERSION) {
    return {
      version: WORKOUT_STATE_VERSION,
      currentWorkout: deserializeWorkout(parsed.currentWorkout as Record<string, unknown> | null),
      templateId: (parsed.templateId as string | undefined) || null,
      plannedWorkoutId: (parsed.plannedWorkoutId as string | undefined) || null,
    };
  }
  
  // Version 0 (no version field) - migrate to version 1
  if (!version || version === 0) {
    return {
      version: WORKOUT_STATE_VERSION,
      currentWorkout: deserializeWorkout(parsed.currentWorkout as Record<string, unknown> | null),
      templateId: (parsed.templateId as string | undefined) || null,
      plannedWorkoutId: (parsed.plannedWorkoutId as string | undefined) || null,
    };
  }
  
  // Unknown version - clear state for safety
  console.warn(`Unknown workout state version ${version}, clearing state`);
  return null;
}

export function loadWorkoutState(): WorkoutStateSnapshot | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.workoutState);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Check version and migrate if needed
    const version = parsed.version as number | undefined;
    if (version !== WORKOUT_STATE_VERSION) {
      return migrateWorkoutState(parsed);
    }
    
    return {
      version: WORKOUT_STATE_VERSION,
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
    const serializedString = JSON.stringify(state);
    
    // Check size (localStorage typically has 5-10MB limit, use 4MB threshold)
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (serializedString.length > MAX_SIZE) {
      console.warn('Log workout state too large, clearing old state and retrying');
      // Clear old state and retry
      localStorage.removeItem(STORAGE_KEYS.logWorkoutState);
      // If still too large, cannot save
      if (serializedString.length > MAX_SIZE) {
        console.error('Log workout state still too large after clearing, cannot save');
        return;
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.logWorkoutState, serializedString);
  } catch (error) {
    if (error instanceof DOMException && (error.code === 22 || error.name === 'QuotaExceededError')) {
      // Quota exceeded - try to clear old state and retry once
      console.warn('localStorage quota exceeded, attempting cleanup');
      try {
        localStorage.removeItem(STORAGE_KEYS.logWorkoutState);
        // Retry once after cleanup
        localStorage.setItem(STORAGE_KEYS.logWorkoutState, JSON.stringify(state));
      } catch (retryError) {
        console.error('Failed to save log workout state after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save log workout state:', error);
    }
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
    const sets = (parsed.sets as Array<Record<string, unknown>>)?.map((set) => ({
      ...set,
      setStartTime: set.setStartTime ? new Date(set.setStartTime as string) : undefined,
      setEndTime: set.setEndTime ? new Date(set.setEndTime as string) : undefined,
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
      restTimerPaused: parsed.restTimerPaused || false,
      restTimerOriginalDuration: parsed.restTimerOriginalDuration || null,
      workoutTimerStartTime: parsed.workoutTimerStartTime || null,
      showAdditionalDetails: parsed.showAdditionalDetails || false,
      setDurationStartTime: parsed.setDurationStartTime || null,
      setDurationElapsed: parsed.setDurationElapsed || 0,
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

/**
 * Save LogExercise component state to sessionStorage
 */
export function saveLogExerciseState(state: LogExerciseStateSnapshot): void {
  try {
    const serializedString = JSON.stringify(state);
    
    // Check size (sessionStorage typically has 5-10MB limit, use 4MB threshold)
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (serializedString.length > MAX_SIZE) {
      console.warn('Log exercise state too large, clearing old state and retrying');
      sessionStorage.removeItem(STORAGE_KEYS.logExerciseState);
      if (serializedString.length > MAX_SIZE) {
        console.error('Log exercise state still too large after clearing, cannot save');
        return;
      }
    }
    
    sessionStorage.setItem(STORAGE_KEYS.logExerciseState, serializedString);
  } catch (error) {
    if (error instanceof DOMException && (error.code === 22 || error.name === 'QuotaExceededError')) {
      console.warn('sessionStorage quota exceeded, attempting cleanup');
      try {
        sessionStorage.removeItem(STORAGE_KEYS.logExerciseState);
        sessionStorage.setItem(STORAGE_KEYS.logExerciseState, JSON.stringify(state));
      } catch (retryError) {
        console.error('Failed to save log exercise state after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save log exercise state:', error);
    }
  }
}

/**
 * Load LogExercise component state from sessionStorage
 */
export function loadLogExerciseState(): LogExerciseStateSnapshot | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.logExerciseState);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    // Deserialize sets with Date objects
    const sets = (parsed.sets as Array<Record<string, unknown>>)?.map((set) => ({
      ...set,
      setStartTime: set.setStartTime ? new Date(set.setStartTime as string) : undefined,
      setEndTime: set.setEndTime ? new Date(set.setEndTime as string) : undefined,
    })) || [];

    return {
      selectedExerciseId: parsed.selectedExerciseId || null,
      sets,
      notes: parsed.notes || '',
      workoutDate: parsed.workoutDate || new Date().toISOString(),
      exerciseId: parsed.exerciseId || null,
    };
  } catch (error) {
    console.error('Failed to load log exercise state:', error);
    return null;
  }
}

/**
 * Clear persisted LogExercise state from sessionStorage
 */
export function clearLogExerciseState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.logExerciseState);
  } catch (error) {
    console.error('Failed to clear log exercise state:', error);
  }
}

