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
  if (reps <= 0) {
    return { valid: false, error: 'Reps must be greater than 0' };
  }
  if (reps > 1000) {
    return { valid: false, error: 'Reps cannot exceed 1000' };
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

