import { Workout } from '@/types/workout';

export interface FailedWorkout {
  id: string;
  workout: Workout;
  error: string;
  errorDetails?: string;
  timestamp: Date;
  retryCount: number;
}

const STORAGE_KEY = 'fittrackai_failed_workouts';
const MAX_FAILED_WORKOUT_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FAILED_WORKOUTS = 50; // Maximum number of failed workouts to keep

/**
 * Save a failed workout to localStorage for recovery
 */
export function saveFailedWorkout(workout: Workout, error: Error | string): string {
  const failedWorkout: FailedWorkout = {
    id: `failed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workout: {
      ...workout,
      // Ensure dates are serializable
      date: workout.date instanceof Date ? workout.date : new Date(workout.date),
      startTime: workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime),
      endTime: workout.endTime instanceof Date ? workout.endTime : workout.endTime ? new Date(workout.endTime) : undefined,
      exercises: workout.exercises.map(ex => ({
        ...ex,
        timestamp: ex.timestamp instanceof Date ? ex.timestamp : new Date(ex.timestamp),
        sets: ex.sets.map(set => ({
          ...set,
          setStartTime: set.setStartTime instanceof Date ? set.setStartTime : set.setStartTime ? new Date(set.setStartTime) : undefined,
          setEndTime: set.setEndTime instanceof Date ? set.setEndTime : set.setEndTime ? new Date(set.setEndTime) : undefined,
        })),
      })),
    },
    error: error instanceof Error ? error.message : error,
    errorDetails: error instanceof Error ? error.stack : undefined,
    timestamp: new Date(),
    retryCount: 0,
  };

  const existing = getFailedWorkouts();
  existing.push(failedWorkout);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return failedWorkout.id;
  } catch (e) {
    console.error('Failed to save failed workout to localStorage:', e);
    throw new Error('Failed to save workout for recovery. Please try again.');
  }
}

/**
 * Get all failed workouts from localStorage
 * Automatically filters out expired workouts and limits total count
 */
export function getFailedWorkouts(): FailedWorkout[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as FailedWorkout[];
    const now = new Date();
    
    // Convert date strings back to Date objects and filter expired workouts
    const validWorkouts = parsed
      .map(fw => ({
        ...fw,
        timestamp: new Date(fw.timestamp),
        workout: {
          ...fw.workout,
          date: new Date(fw.workout.date),
          startTime: new Date(fw.workout.startTime),
          endTime: fw.workout.endTime ? new Date(fw.workout.endTime) : undefined,
          exercises: fw.workout.exercises.map(ex => ({
            ...ex,
            timestamp: new Date(ex.timestamp),
            sets: ex.sets.map(set => ({
              ...set,
              setStartTime: set.setStartTime ? new Date(set.setStartTime) : undefined,
              setEndTime: set.setEndTime ? new Date(set.setEndTime) : undefined,
            })),
          })),
        },
      }))
      .filter(fw => {
        const age = now.getTime() - fw.timestamp.getTime();
        return age < MAX_FAILED_WORKOUT_AGE_MS;
      })
      // Sort by timestamp (newest first) and limit count
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, MAX_FAILED_WORKOUTS);
    
    // If we filtered out any workouts, save the cleaned list
    if (validWorkouts.length < parsed.length) {
      try {
        if (validWorkouts.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(validWorkouts));
        }
      } catch (e) {
        console.warn('Failed to save cleaned failed workouts list:', e);
      }
    }
    
    return validWorkouts;
  } catch (e) {
    console.error('Failed to load failed workouts from localStorage:', e);
    return [];
  }
}

/**
 * Remove a failed workout from localStorage
 */
export function removeFailedWorkout(id: string): void {
  const existing = getFailedWorkouts();
  const filtered = existing.filter(fw => fw.id !== id);
  
  try {
    if (filtered.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to remove failed workout from localStorage:', e);
  }
}

/**
 * Increment retry count for a failed workout
 */
export function incrementRetryCount(id: string): void {
  const existing = getFailedWorkouts();
  const updated = existing.map(fw => 
    fw.id === id ? { ...fw, retryCount: fw.retryCount + 1 } : fw
  );
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update retry count:', e);
  }
}

/**
 * Update a failed workout with new data (e.g., after user fixes errors)
 */
export function updateFailedWorkout(id: string, workout: Workout, error?: string): void {
  const existing = getFailedWorkouts();
  const updated = existing.map(fw => {
    if (fw.id === id) {
      return {
        ...fw,
        workout: {
          ...workout,
          date: workout.date instanceof Date ? workout.date : new Date(workout.date),
          startTime: workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime),
          endTime: workout.endTime instanceof Date ? workout.endTime : workout.endTime ? new Date(workout.endTime) : undefined,
          exercises: workout.exercises.map(ex => ({
            ...ex,
            timestamp: ex.timestamp instanceof Date ? ex.timestamp : new Date(ex.timestamp),
            sets: ex.sets.map(set => ({
              ...set,
              setStartTime: set.setStartTime instanceof Date ? set.setStartTime : set.setStartTime ? new Date(set.setStartTime) : undefined,
              setEndTime: set.setEndTime instanceof Date ? set.setEndTime : set.setEndTime ? new Date(set.setEndTime) : undefined,
            })),
          })),
        },
        error: error || fw.error,
        timestamp: new Date(),
      };
    }
    return fw;
  });
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update failed workout:', e);
  }
}

/**
 * Clear all failed workouts
 */
export function clearAllFailedWorkouts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear failed workouts:', e);
  }
}

