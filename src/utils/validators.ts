import { ExerciseTrackingType, WorkoutSet, DistanceUnit } from '@/types/exercise';

export function validateWeight(weight: number, unit: 'kg' | 'lbs'): { valid: boolean; error?: string } {
  if (weight <= 0) {
    return { valid: false, error: 'Weight must be greater than 0' };
  }
  if (unit === 'kg' && weight > 1000) {
    return { valid: false, error: 'Weight cannot exceed 1000 kg' };
  }
  if (unit === 'lbs' && weight > 2200) {
    return { valid: false, error: 'Weight cannot exceed 2200 lbs' };
  }
  return { valid: true };
}

export function validateReps(reps: number): { valid: boolean; error?: string } {
  if (reps < 0) {
    return { valid: false, error: 'Reps cannot be negative' };
  }
  if (reps === 0) {
    return { valid: false, error: 'Reps must be greater than 0' };
  }
  if (reps > 50) {
    return { valid: false, error: 'Reps cannot exceed 50' };
  }
  return { valid: true };
}

export function validateDistance(distance: number, unit: DistanceUnit): { valid: boolean; error?: string } {
  if (distance < 0) {
    return { valid: false, error: 'Distance cannot be negative' };
  }
  if (unit === 'km' && distance > 1000) {
    return { valid: false, error: 'Distance cannot exceed 1000 km' };
  }
  if (unit === 'miles' && distance > 621) {
    return { valid: false, error: 'Distance cannot exceed 621 miles' };
  }
  return { valid: true };
}

export function validateDuration(duration: number): { valid: boolean; error?: string } {
  if (duration < 0) {
    return { valid: false, error: 'Duration cannot be negative' };
  }
  if (duration > 86400) {
    return { valid: false, error: 'Duration cannot exceed 24 hours' };
  }
  return { valid: true };
}

export function validateCalories(calories?: number): { valid: boolean; error?: string } {
  if (calories === undefined) return { valid: true }; // Optional field
  if (calories < 0) {
    return { valid: false, error: 'Calories cannot be negative' };
  }
  if (calories > 10000) {
    return { valid: false, error: 'Calories cannot exceed 10000' };
  }
  return { valid: true };
}

export function validateSteps(steps?: number): { valid: boolean; error?: string } {
  if (steps === undefined) return { valid: true }; // Optional field
  if (steps < 0) {
    return { valid: false, error: 'Steps cannot be negative' };
  }
  if (steps > 100000) {
    return { valid: false, error: 'Steps cannot exceed 100000' };
  }
  return { valid: true };
}

export function validateRPE(rpe?: number): boolean {
  if (rpe === undefined) return true;
  return rpe >= 1 && rpe <= 10;
}

export function validateWorkoutName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 100;
}

export function validateExerciseName(name: string): boolean {
  return name.trim().length > 0 && name.trim().length <= 100;
}

export function validateNotes(notes: string): boolean {
  return notes.length <= 1000;
}

export function validateSet(set: WorkoutSet, trackingType: ExerciseTrackingType, unit: 'kg' | 'lbs' = 'kg', distanceUnit: DistanceUnit = 'km'): { valid: boolean; error?: string } {
  if (!set.completed) return { valid: true };

  switch (trackingType) {
    case 'weight_reps': {
      if (set.weight === undefined || set.reps === undefined) {
        return { valid: false, error: 'Weight and reps are required for completed sets' };
      }
      const weightValidation = validateWeight(set.weight, unit);
      if (!weightValidation.valid) return weightValidation;
      const repsValidation = validateReps(set.reps);
      if (!repsValidation.valid) return repsValidation;
      return { valid: true };
    }

    case 'reps_only':
      if (set.reps === undefined) {
        return { valid: false, error: 'Reps are required for completed sets' };
      }
      return validateReps(set.reps);

    case 'cardio': {
      if (set.distance === undefined) {
        return { valid: false, error: 'Distance is required for cardio exercises' };
      }
      const distanceValidation = validateDistance(set.distance, set.distanceUnit || distanceUnit);
      if (!distanceValidation.valid) return distanceValidation;
      const timeValidation = set.time === undefined ? { valid: true } : validateDuration(set.time);
      if (!timeValidation.valid) return { valid: false, error: 'Time must be between 0 and 24 hours' };
      const caloriesValidation = validateCalories(set.calories);
      if (!caloriesValidation.valid) return { valid: false, error: 'Calories must be between 0 and 10000' };
      const stepsValidation = validateSteps(set.steps);
      if (!stepsValidation.valid) return { valid: false, error: 'Steps must be between 0 and 100000' };
      return { valid: true };
    }

    case 'duration': {
      if (set.duration === undefined) {
        return { valid: false, error: 'Duration is required' };
      }
      const durationValidation = validateDuration(set.duration);
      if (!durationValidation.valid) {
        return { valid: false, error: 'Duration must be between 0 and 24 hours' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, error: 'Invalid tracking type' };
  }
}

export function validateExerciseSets(
  sets: WorkoutSet[],
  trackingType: ExerciseTrackingType,
  unit: 'kg' | 'lbs' = 'kg',
  distanceUnit: DistanceUnit = 'km'
): { valid: boolean; error?: string } {
  if (sets.length === 0) {
    return { valid: false, error: 'At least one set is required' };
  }

  const completedSets = sets.filter(s => s.completed);
  if (completedSets.length === 0) {
    return { valid: false, error: 'At least one set must be completed' };
  }

  for (const set of completedSets) {
    if (!validateSet(set, trackingType, unit, distanceUnit)) {
      switch (trackingType) {
        case 'weight_reps':
          return { valid: false, error: 'Completed sets must have valid weight (> 0) and reps (> 0)' };
        case 'reps_only':
          return { valid: false, error: 'Completed sets must have valid reps (> 0)' };
        case 'cardio':
          return { valid: false, error: 'Completed sets must have valid distance (>= 0)' };
        case 'duration':
          return { valid: false, error: 'Completed sets must have valid duration (>= 0)' };
        default:
          return { valid: false, error: 'Invalid set data' };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates that startTime is on the same calendar day as workout date
 */
export function validateWorkoutDateAndTime(
  workoutDate: Date,
  startTime: Date
): { valid: boolean; error?: string; adjustedStartTime?: Date } {
  const dateStr = workoutDate.toISOString().split('T')[0];
  const startTimeStr = startTime.toISOString().split('T')[0];
  
  if (dateStr !== startTimeStr) {
    // Auto-adjust startTime to match workout date
    const adjusted = new Date(workoutDate);
    adjusted.setHours(startTime.getHours());
    adjusted.setMinutes(startTime.getMinutes());
    adjusted.setSeconds(startTime.getSeconds());
    adjusted.setMilliseconds(startTime.getMilliseconds());
    
    return {
      valid: false,
      error: 'Start time must be on the same day as workout date',
      adjustedStartTime: adjusted,
    };
  }
  
  return { valid: true };
}

/**
 * Validates workout endTime is after startTime and on same or next day
 */
export function validateWorkoutEndTime(
  startTime: Date,
  endTime: Date
): { valid: boolean; error?: string } {
  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be after start time' };
  }
  
  // Allow endTime to be on next day (for late-night workouts)
  const startDate = startTime.toISOString().split('T')[0];
  const endDate = endTime.toISOString().split('T')[0];
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const daysDiff = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 1) {
    return { valid: false, error: 'End time cannot be more than 1 day after start time' };
  }
  
  return { valid: true };
}

/**
 * Adjusts startTime to match workout date while preserving time
 */
export function adjustStartTimeToMatchDate(workoutDate: Date, startTime: Date): Date {
  const adjusted = new Date(workoutDate);
  adjusted.setHours(startTime.getHours());
  adjusted.setMinutes(startTime.getMinutes());
  adjusted.setSeconds(startTime.getSeconds());
  adjusted.setMilliseconds(startTime.getMilliseconds());
  return adjusted;
}

/**
 * Normalizes workout start time to ensure it's valid:
 * - Ensures start time is on the same day as workout date (preserving time of day)
 * - Caps start time to current time (not in the future, with 5s tolerance for clock skew)
 * - Handles missing or invalid dates gracefully
 * 
 * @param workoutDate - The workout date
 * @param startTime - The start time to normalize (can be undefined)
 * @returns Normalized start time, or workoutDate if startTime is missing/invalid
 */
export function normalizeWorkoutStartTime(
  workoutDate: Date,
  startTime?: Date | string | null
): Date {
  const now = new Date();
  const toleranceMs = 5000; // 5 seconds tolerance for clock skew
  
  // Ensure workoutDate is valid
  const validWorkoutDate = workoutDate instanceof Date && !isNaN(workoutDate.getTime())
    ? workoutDate
    : new Date();
  
  // Default to workoutDate if startTime is missing
  if (!startTime) {
    return validWorkoutDate;
  }
  
  // Convert startTime to Date if needed
  let startTimeDate: Date;
  if (startTime instanceof Date) {
    startTimeDate = startTime;
  } else if (typeof startTime === 'string') {
    startTimeDate = new Date(startTime);
  } else {
    return validWorkoutDate;
  }
  
  // Check if startTime is valid
  if (isNaN(startTimeDate.getTime())) {
    console.warn('Invalid startTime detected, using workout date');
    return validWorkoutDate;
  }
  
  // Step 1: Ensure startTime is on the same day as workout date (preserve time)
  // Use local date comparison instead of UTC to handle timezone correctly
  const workoutDateLocal = new Date(
    validWorkoutDate.getFullYear(),
    validWorkoutDate.getMonth(),
    validWorkoutDate.getDate()
  );
  const startTimeLocal = new Date(
    startTimeDate.getFullYear(),
    startTimeDate.getMonth(),
    startTimeDate.getDate()
  );
  
  let normalized = startTimeDate;
  if (workoutDateLocal.getTime() !== startTimeLocal.getTime()) {
    normalized = adjustStartTimeToMatchDate(validWorkoutDate, startTimeDate);
    console.warn('Start time adjusted to match workout date', {
      original: startTimeDate.toISOString(),
      adjusted: normalized.toISOString(),
    });
  }
  
  // Step 2: Cap startTime to current time (not in the future, with tolerance)
  const maxAllowedTime = now.getTime() + toleranceMs;
  if (normalized.getTime() > maxAllowedTime) {
    const capped = new Date(Math.min(normalized.getTime(), maxAllowedTime));
    console.warn('Start time capped to current time (was in the future)', {
      original: normalized.toISOString(),
      capped: capped.toISOString(),
    });
    normalized = capped;
  }
  
  return normalized;
}

/**
 * Normalizes both workout start and end times together to ensure they're valid:
 * - Ensures start time is on the same day as workout date (preserving time of day)
 * - Adjusts end time proportionally when start time is adjusted
 * - Ensures end time is within 1 day of start time (validation requirement)
 * - Caps times to current time (not in the future)
 * 
 * @param workoutDate - The workout date
 * @param startTime - The start time to normalize (can be undefined)
 * @param endTime - The end time to normalize (can be undefined)
 * @returns Object with normalized startTime and endTime
 */
export function normalizeWorkoutTimes(
  workoutDate: Date,
  startTime?: Date | string | null,
  endTime?: Date | string | null
): { startTime: Date; endTime: Date } {
  const now = new Date();
  const toleranceMs = 5000; // 5 seconds tolerance for clock skew
  const MAX_WORKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  
  // Ensure workoutDate is valid
  const validWorkoutDate = workoutDate instanceof Date && !isNaN(workoutDate.getTime())
    ? workoutDate
    : new Date();
  
  // Normalize start time first
  const normalizedStartTime = normalizeWorkoutStartTime(validWorkoutDate, startTime);
  
  // Handle end time
  let endTimeDate: Date;
  if (!endTime) {
    // If no end time provided, use current time
    endTimeDate = now;
  } else if (endTime instanceof Date) {
    endTimeDate = endTime;
  } else if (typeof endTime === 'string') {
    endTimeDate = new Date(endTime);
  } else {
    endTimeDate = now;
  }
  
  // Check if endTime is valid
  if (isNaN(endTimeDate.getTime())) {
    console.warn('Invalid endTime detected, using current time');
    endTimeDate = now;
  }
  
  // Calculate the original duration if both times were provided
  let originalDuration = 0;
  let originalStart: Date | null = null;
  if (startTime) {
    originalStart = startTime instanceof Date ? startTime : new Date(startTime);
    if (!isNaN(originalStart.getTime()) && endTime) {
      originalDuration = endTimeDate.getTime() - originalStart.getTime();
      // Only use original duration if it's reasonable (within 1 day and positive)
      if (originalDuration < 0 || originalDuration > MAX_WORKOUT_DURATION_MS) {
        originalDuration = 0; // Ignore unreasonable durations
      }
    }
  }
  
  // If start time was adjusted, adjust end time appropriately
  let normalizedEndTime = endTimeDate;
  if (originalStart && !isNaN(originalStart.getTime()) && originalStart.getTime() !== normalizedStartTime.getTime()) {
    // Start time was adjusted
    const adjustment = normalizedStartTime.getTime() - originalStart.getTime();
    
    // If we have a reasonable original duration, preserve it
    if (originalDuration > 0 && originalDuration <= MAX_WORKOUT_DURATION_MS) {
      // Preserve the original workout duration
      normalizedEndTime = new Date(normalizedStartTime.getTime() + originalDuration);
    } else {
      // Otherwise, adjust end time by the same amount as start time
      normalizedEndTime = new Date(endTimeDate.getTime() + adjustment);
    }
    
    // Ensure end time doesn't exceed current time
    if (normalizedEndTime.getTime() > now.getTime() + toleranceMs) {
      normalizedEndTime = new Date(Math.min(normalizedEndTime.getTime(), now.getTime() + toleranceMs));
    }
    
    // Ensure end time is after start time
    if (normalizedEndTime.getTime() <= normalizedStartTime.getTime()) {
      // If adjusted end time is before or equal to start time, use a reasonable duration
      // Use original duration if available and reasonable, otherwise use 1 hour as default
      const fallbackDuration = originalDuration > 0 
        ? Math.min(originalDuration, MAX_WORKOUT_DURATION_MS)
        : 60 * 60 * 1000; // 1 hour default
      normalizedEndTime = new Date(normalizedStartTime.getTime() + fallbackDuration);
    }
    
    console.warn('End time adjusted to match start time adjustment', {
      original: endTimeDate.toISOString(),
      adjusted: normalizedEndTime.toISOString(),
      originalDuration: originalDuration > 0 ? `${Math.round(originalDuration / 60000)} minutes` : 'N/A',
    });
  }
  
  // Cap end time to current time if it's in the future
  if (normalizedEndTime.getTime() > now.getTime() + toleranceMs) {
    normalizedEndTime = new Date(Math.min(normalizedEndTime.getTime(), now.getTime() + toleranceMs));
  }
  
  // Ensure end time is after start time
  if (normalizedEndTime.getTime() <= normalizedStartTime.getTime()) {
    normalizedEndTime = new Date(normalizedStartTime.getTime() + 60000); // At least 1 minute after start
  }
  
  // Ensure end time is within 1 day of start time (validation requirement)
  const timeDiff = normalizedEndTime.getTime() - normalizedStartTime.getTime();
  if (timeDiff > MAX_WORKOUT_DURATION_MS) {
    // Cap end time to 1 day after start time
    normalizedEndTime = new Date(normalizedStartTime.getTime() + MAX_WORKOUT_DURATION_MS);
    console.warn('End time capped to 1 day after start time', {
      original: normalizedEndTime.toISOString(),
      capped: normalizedEndTime.toISOString(),
    });
  }
  
  return {
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
  };
}

