/**
 * Workout data sanitization utilities
 * Auto-fixes invalid data instead of throwing errors for better UX
 */

import { WorkoutSet, WorkoutExercise } from '@/types/exercise';
import { Workout } from '@/types/workout';
import { MuscleGroup } from '@/types/muscle';
import { logger } from '@/utils/logger';
import { normalizeWorkoutStartTime, normalizeWorkoutTimes } from '@/utils/validators';
import { sanitizeRPE } from '@/utils/rpeHelpers';

// Use sanitizeRPE from rpeHelpers

/**
 * Sanitizes reps value
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - <= 0 for completed sets → 1 (minimum valid)
 * - > 500 → 500 (clamp to maximum)
 * - Valid number → keep as-is
 */
export function sanitizeReps(reps: unknown, isCompleted: boolean): number | undefined {
  if (reps === null || reps === undefined) {
    return undefined;
  }

  if (typeof reps !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(reps)) {
    return undefined;
  }

  // For completed sets, ensure at least 1 rep
  if (isCompleted && reps <= 0) {
    return 1;
  }

  // Clamp to maximum
  if (reps > 500) {
    return 500;
  }

  return reps;
}

/**
 * Sanitizes weight value
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 0 → 0 (allow bodyweight)
 * - > 1000kg or > 2200lbs → clamp to maximum
 * - Valid number → keep as-is
 */
export function sanitizeWeight(weight: unknown, unit: 'kg' | 'lbs' = 'kg'): number | undefined {
  if (weight === null || weight === undefined) {
    return undefined;
  }

  if (typeof weight !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(weight)) {
    return undefined;
  }

  // Allow 0 for bodyweight exercises
  if (weight < 0) {
    return 0;
  }

  // Clamp to maximum based on unit
  const maxWeight = unit === 'kg' ? 1000 : 2200;
  if (weight > maxWeight) {
    return maxWeight;
  }

  return weight;
}

/**
 * Sanitizes duration value (in seconds)
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 0 → 0
 * - > 86400 (24 hours) → 86400
 * - Valid number → keep as-is
 */
export function sanitizeDuration(duration: unknown): number | undefined {
  if (duration === null || duration === undefined) {
    return undefined;
  }

  if (typeof duration !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(duration)) {
    return undefined;
  }

  if (duration < 0) {
    return 0;
  }

  // Max 24 hours
  const maxDuration = 24 * 60 * 60;
  if (duration > maxDuration) {
    return maxDuration;
  }

  return duration;
}

/**
 * Sanitizes rest time value (in seconds)
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 0 → 0
 * - > 3600 (1 hour) → 3600
 * - Valid number → keep as-is
 */
export function sanitizeRestTime(restTime: unknown): number | undefined {
  if (restTime === null || restTime === undefined) {
    return undefined;
  }

  if (typeof restTime !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(restTime)) {
    return undefined;
  }

  if (restTime < 0) {
    return 0;
  }

  // Max 1 hour
  if (restTime > 3600) {
    return 3600;
  }

  return restTime;
}

/**
 * Sanitizes calories value
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 0 → 0
 * - > 10000 → 10000 (clamp to maximum)
 * - Valid number → keep as-is
 */
export function sanitizeCalories(calories: unknown): number | undefined {
  if (calories === null || calories === undefined) {
    return undefined;
  }

  if (typeof calories !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(calories)) {
    return undefined;
  }

  if (calories < 0) {
    return 0;
  }

  // Max 10000 calories
  if (calories > 10000) {
    return 10000;
  }

  return calories;
}

/**
 * Sanitizes distance value
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 0 → 0
 * - Valid number → keep as-is
 */
export function sanitizeDistance(distance: unknown): number | undefined {
  if (distance === null || distance === undefined) {
    return undefined;
  }

  if (typeof distance !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(distance)) {
    return undefined;
  }

  if (distance < 0) {
    return 0;
  }

  return distance;
}

/**
 * Sanitizes heart rate value (BPM)
 * - null/undefined → undefined
 * - NaN/non-number → undefined
 * - < 30 → 30 (clamp to minimum)
 * - > 220 → 220 (clamp to maximum)
 * - Valid number → keep as-is
 */
export function sanitizeHeartRate(heartRate: unknown): number | undefined {
  if (heartRate === null || heartRate === undefined) {
    return undefined;
  }

  if (typeof heartRate !== 'number') {
    return undefined;
  }

  if (!Number.isFinite(heartRate)) {
    return undefined;
  }

  // Clamp to valid range
  if (heartRate < 30) {
    return 30;
  }
  if (heartRate > 220) {
    return 220;
  }

  return heartRate;
}

/**
 * Sanitizes a workout set
 */
export function sanitizeWorkoutSet(set: WorkoutSet): WorkoutSet {
  const sanitized: WorkoutSet = {
    ...set,
    setNumber: typeof set.setNumber === 'number' && set.setNumber > 0 ? set.setNumber : 1,
    completed: typeof set.completed === 'boolean' ? set.completed : false,
  };

  // Sanitize RPE
  if (set.rpe !== undefined) {
    const sanitizedRPE = sanitizeRPE(set.rpe);
    sanitized.rpe = sanitizedRPE;
  }

  // Sanitize reps
  if (set.reps !== undefined) {
    sanitized.reps = sanitizeReps(set.reps, sanitized.completed);
  }

  // Sanitize left/right reps
  if (set.leftReps !== undefined) {
    sanitized.leftReps = sanitizeReps(set.leftReps, sanitized.completed);
  }
  if (set.rightReps !== undefined) {
    sanitized.rightReps = sanitizeReps(set.rightReps, sanitized.completed);
  }

  // Sanitize weight
  if (set.weight !== undefined) {
    sanitized.weight = sanitizeWeight(set.weight, set.unit || 'kg');
  }

  // Sanitize left/right weight
  if (set.leftWeight !== undefined) {
    sanitized.leftWeight = sanitizeWeight(set.leftWeight, set.unit || 'kg');
  }
  if (set.rightWeight !== undefined) {
    sanitized.rightWeight = sanitizeWeight(set.rightWeight, set.unit || 'kg');
  }

  // Sanitize distance
  if (set.distance !== undefined) {
    sanitized.distance = sanitizeDistance(set.distance);
  }

  // Sanitize left/right distance
  if (set.leftDistance !== undefined) {
    sanitized.leftDistance = sanitizeDistance(set.leftDistance);
  }
  if (set.rightDistance !== undefined) {
    sanitized.rightDistance = sanitizeDistance(set.rightDistance);
  }

  // Sanitize duration
  if (set.duration !== undefined) {
    sanitized.duration = sanitizeDuration(set.duration);
  }

  // Sanitize left/right duration
  if (set.leftDuration !== undefined) {
    sanitized.leftDuration = sanitizeDuration(set.leftDuration);
  }
  if (set.rightDuration !== undefined) {
    sanitized.rightDuration = sanitizeDuration(set.rightDuration);
  }

  // Sanitize rest time
  if (set.restTime !== undefined) {
    sanitized.restTime = sanitizeRestTime(set.restTime);
  }

  // Sanitize calories
  if (set.calories !== undefined) {
    sanitized.calories = sanitizeCalories(set.calories);
  }

  // Sanitize heart rate
  if (set.heartRate !== undefined) {
    sanitized.heartRate = sanitizeHeartRate(set.heartRate);
  }

  // Sanitize time (in seconds)
  if (set.time !== undefined) {
    sanitized.time = sanitizeDuration(set.time);
  }

  // Sanitize steps
  if (set.steps !== undefined) {
    const steps = typeof set.steps === 'number' && Number.isFinite(set.steps) && set.steps >= 0
      ? Math.min(set.steps, 100000) // Max 100k steps
      : undefined;
    sanitized.steps = steps;
  }

  // Preserve valid optional fields
  if (set.unit && (set.unit === 'kg' || set.unit === 'lbs')) {
    sanitized.unit = set.unit;
  }

  if (set.distanceUnit && (set.distanceUnit === 'km' || set.distanceUnit === 'miles')) {
    sanitized.distanceUnit = set.distanceUnit;
  }

  if (set.sides && ['left', 'right', 'both'].includes(set.sides)) {
    sanitized.sides = set.sides;
  }

  // Preserve date fields (they should be validated separately)
  if (set.setStartTime instanceof Date && !isNaN(set.setStartTime.getTime())) {
    sanitized.setStartTime = set.setStartTime;
  }

  if (set.setEndTime instanceof Date && !isNaN(set.setEndTime.getTime())) {
    sanitized.setEndTime = set.setEndTime;
  }

  // Preserve notes (will be sanitized separately for XSS)
  sanitized.notes = set.notes;

  return sanitized;
}

/**
 * Sanitizes a workout exercise
 */
export function sanitizeWorkoutExercise(exercise: WorkoutExercise, index: number): WorkoutExercise {
  // Ensure required fields exist
  const sanitized: WorkoutExercise = {
    id: exercise.id || `temp-${Date.now()}-${index}`,
    exerciseId: exercise.exerciseId || `temp-exercise-${Date.now()}-${index}`,
    exerciseName: exercise.exerciseName?.trim() || 'Unknown Exercise',
    sets: [],
    totalVolume: typeof exercise.totalVolume === 'number' && Number.isFinite(exercise.totalVolume) && exercise.totalVolume >= 0
      ? exercise.totalVolume
      : 0,
    musclesWorked: Array.isArray(exercise.musclesWorked)
      ? exercise.musclesWorked.filter((m): m is MuscleGroup => Object.values(MuscleGroup).includes(m))
      : [],
    timestamp: exercise.timestamp instanceof Date && !isNaN(exercise.timestamp.getTime())
      ? exercise.timestamp
      : new Date(),
    notes: exercise.notes,
  };

  // Sanitize sets
  if (Array.isArray(exercise.sets)) {
    sanitized.sets = exercise.sets
      .map((set, setIndex) => ({
        ...sanitizeWorkoutSet(set),
        setNumber: setIndex + 1, // Ensure sequential numbering
      }))
      .filter(set => {
        // Keep all sets, even incomplete ones
        return true;
      });
  } else {
    // If no sets array, create an empty one (will be handled by validation)
    sanitized.sets = [];
  }

  // Ensure at least one set exists
  if (sanitized.sets.length === 0) {
    sanitized.sets = [{
      setNumber: 1,
      completed: false,
    }];
  }

  // Preserve optional fields
  if (exercise.trackingType && ['weight_reps', 'reps_only', 'cardio', 'duration'].includes(exercise.trackingType)) {
    sanitized.trackingType = exercise.trackingType;
  }

  if (exercise.groupType && ['single', 'superset', 'circuit'].includes(exercise.groupType)) {
    sanitized.groupType = exercise.groupType;
  }

  if (exercise.groupId) {
    sanitized.groupId = exercise.groupId;
  }

  if (typeof exercise.groupOrder === 'number' && exercise.groupOrder >= 0) {
    sanitized.groupOrder = exercise.groupOrder;
  }

  return sanitized;
}

/**
 * Sanitizes a workout
 * Returns sanitized workout and any warnings
 */
export function sanitizeWorkout(workout: Omit<Workout, 'id'>): {
  sanitizedWorkout: Omit<Workout, 'id'>;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Ensure required fields
  if (!workout.userId) {
    warnings.push('Workout missing userId - this should not happen');
  }

  if (!workout.date) {
    warnings.push('Workout missing date - using current date');
  }

  const now = new Date();
  const toleranceMs = 5000; // 5 seconds tolerance for clock skew
  const tenYearsAgo = new Date();
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  // Sanitize date
  let workoutDate: Date;
  if (workout.date instanceof Date && !isNaN(workout.date.getTime())) {
    workoutDate = workout.date;
  } else if (typeof workout.date === 'string') {
    workoutDate = new Date(workout.date);
    if (isNaN(workoutDate.getTime())) {
      warnings.push('Invalid workout date - using current date');
      workoutDate = now;
    }
  } else {
    warnings.push('Missing workout date - using current date');
    workoutDate = now;
  }

  // Normalize date if in future or too far in past
  if (workoutDate.getTime() > now.getTime() + toleranceMs) {
    warnings.push('Workout date was in the future - adjusted to current date');
    workoutDate = now;
  }
  if (workoutDate < tenYearsAgo) {
    warnings.push('Workout date was too far in the past - adjusted to current date');
    workoutDate = now;
  }

  // Sanitize start time
  let startTime: Date;
  if (workout.startTime) {
    const normalized = normalizeWorkoutStartTime(workoutDate, workout.startTime);
    startTime = normalized;
  } else {
    warnings.push('Workout missing startTime - using workout date');
    startTime = workoutDate;
  }

  // Sanitize end time
  let endTime: Date | undefined;
  if (workout.endTime) {
    const normalized = normalizeWorkoutTimes(workoutDate, startTime, workout.endTime);
    endTime = normalized.endTime;

    // Ensure end time is after start time
    if (endTime <= startTime) {
      warnings.push('End time was before start time - adjusted to current time');
      endTime = now;
    }
  }

  // Sanitize exercises
  let exercises: WorkoutExercise[];
  if (Array.isArray(workout.exercises)) {
    exercises = workout.exercises
      .map((exercise, index) => sanitizeWorkoutExercise(exercise, index))
      .map((exercise, index) => {
        // Log warning if exercise has invalid ID
        if (!exercise.exerciseId || exercise.exerciseId.startsWith('temp-')) {
          warnings.push(`Exercise "${exercise.exerciseName}" at index ${index} has invalid exerciseId`);
        }
        return exercise;
      });
  } else {
    warnings.push('Workout exercises is not an array - creating empty array');
    exercises = [];
  }

  // Ensure at least one exercise exists
  if (exercises.length === 0) {
    warnings.push('Workout has no exercises - this may cause issues');
    // Don't add a dummy exercise, let validation handle it
  }

  // Sanitize total duration
  let totalDuration: number;
  if (typeof workout.totalDuration === 'number' && Number.isFinite(workout.totalDuration)) {
    totalDuration = Math.max(0, Math.min(1440, Math.round(workout.totalDuration)));
  } else {
    // Calculate from start/end times if available
    if (endTime) {
      const durationMs = endTime.getTime() - startTime.getTime();
      totalDuration = Math.max(0, Math.min(1440, Math.floor(durationMs / 60000)));
    } else {
      totalDuration = 0;
    }
  }

  // Sanitize total volume
  let totalVolume: number;
  if (typeof workout.totalVolume === 'number' && Number.isFinite(workout.totalVolume) && workout.totalVolume >= 0) {
    totalVolume = workout.totalVolume;
  } else {
    totalVolume = 0;
  }

  // Sanitize calories
  const calories = workout.calories !== undefined ? sanitizeCalories(workout.calories) : undefined;

  // Sanitize muscles targeted
  const musclesTargeted = Array.isArray(workout.musclesTargeted)
    ? workout.musclesTargeted.filter((m): m is MuscleGroup => Object.values(MuscleGroup).includes(m))
    : [];

  // Ensure workout type exists
  const workoutType = workout.workoutType?.trim() || 'custom';

  const sanitizedWorkout: Omit<Workout, 'id'> = {
    userId: workout.userId || 'unknown',
    date: workoutDate,
    startTime,
    endTime,
    exercises,
    totalDuration,
    totalVolume,
    calories,
    notes: workout.notes,
    musclesTargeted,
    workoutType,
    mood: workout.mood && ['great', 'good', 'okay', 'tired', 'exhausted'].includes(workout.mood)
      ? workout.mood
      : undefined,
    version: typeof workout.version === 'number' ? workout.version : undefined,
    deletedAt: workout.deletedAt || undefined,
  };

  return {
    sanitizedWorkout,
    warnings,
  };
}
