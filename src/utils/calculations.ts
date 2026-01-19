import { WorkoutSet, ExerciseTrackingType } from '@/types/exercise';
import { calculateEffectiveBodyweight } from './bodyweightMultipliers';

/**
 * Infer tracking type from set data
 * Priority order: cardio (distance) > weight_reps (weight+reps) > duration > reps_only
 */
function inferTrackingType(set: WorkoutSet): ExerciseTrackingType {
  // Check for cardio first (most specific)
  if (set.distance !== undefined || set.leftDistance !== undefined || set.rightDistance !== undefined) {
    return 'cardio';
  }
  // Check for weight training (weight with or without reps)
  if ((set.weight !== undefined && set.weight > 0) || (set.leftWeight !== undefined && set.leftWeight > 0) || (set.rightWeight !== undefined && set.rightWeight > 0)) {
    return 'weight_reps';
  }
  // Check for duration exercises (yoga, stretching, planks)
  if ((set.duration !== undefined && set.duration > 0) || (set.leftDuration !== undefined && set.leftDuration > 0) || (set.rightDuration !== undefined && set.rightDuration > 0)) {
    return 'duration';
  }
  // Check for reps-only exercises (bodyweight exercises like push-ups)
  if ((set.reps !== undefined && set.reps > 0) || (set.leftReps !== undefined && set.leftReps > 0) || (set.rightReps !== undefined && set.rightReps > 0)) {
    return 'reps_only';
  }
  // Default fallback
  return 'weight_reps';
}

/**
 * Calculate volume by side (left/right)
 * Returns { left, right } volume
 */
export function calculateVolumeBySide(
  sets: WorkoutSet[],
  trackingType?: ExerciseTrackingType,
  options?: {
    userBodyweight?: number;
    exerciseName?: string;
  }
): { left: number; right: number } {
  return sets.reduce((acc, set) => {
    if (!set.completed) {
      return acc;
    }

    const type = trackingType || inferTrackingType(set);
    let leftVol = 0;
    let rightVol = 0;

    // Check if side tracking is used
    const hasLeft = set.leftReps !== undefined || set.leftWeight !== undefined || set.leftDistance !== undefined || set.leftDuration !== undefined;
    const hasRight = set.rightReps !== undefined || set.rightWeight !== undefined || set.rightDistance !== undefined || set.rightDuration !== undefined;
    const isUnilateralTracked = set.sides || hasLeft || hasRight;

    if (isUnilateralTracked) {
      switch (type) {
        case 'weight_reps': {
          if (set.sides === 'left' || set.sides === 'both') {
            const reps = set.leftReps ?? set.reps ?? 0;
            const weight = set.leftWeight ?? set.weight ?? 0;
            leftVol += reps * weight;
          }
          if (set.sides === 'right' || set.sides === 'both') {
            const reps = set.rightReps ?? set.reps ?? 0;
            const weight = set.rightWeight ?? set.weight ?? 0;
            rightVol += reps * weight;
          }
          break;
        }
        
        case 'reps_only': {
          // For bodyweight unilateral exercises
          let effectiveWeight = 1; // Default multiplier 1 (just reps) if no weight info
          
          if (options?.userBodyweight && options?.exerciseName) {
            effectiveWeight = calculateEffectiveBodyweight(
              options.userBodyweight,
              options.exerciseName
            );
          }

          if (set.sides === 'left' || set.sides === 'both') {
            const reps = set.leftReps ?? set.reps ?? 0;
            leftVol += reps * effectiveWeight;
          }
          if (set.sides === 'right' || set.sides === 'both') {
            const reps = set.rightReps ?? set.reps ?? 0;
            rightVol += reps * effectiveWeight;
          }
          break;
        }

        case 'cardio': {
          if (set.sides === 'left' || set.sides === 'both') {
            const dist = set.leftDistance ?? set.distance ?? 0;
            const unit = set.distanceUnit || 'km'; // Assuming single unit for set
            const distanceKm = unit === 'miles' ? dist * 1.60934 : dist;
            leftVol += distanceKm;
          }
          if (set.sides === 'right' || set.sides === 'both') {
            const dist = set.rightDistance ?? set.distance ?? 0;
            const unit = set.distanceUnit || 'km';
            const distanceKm = unit === 'miles' ? dist * 1.60934 : dist;
            rightVol += distanceKm;
          }
          break;
        }

        case 'duration': {
          if (set.sides === 'left' || set.sides === 'both') {
            leftVol += set.leftDuration ?? set.duration ?? 0;
          }
          if (set.sides === 'right' || set.sides === 'both') {
            rightVol += set.rightDuration ?? set.duration ?? 0;
          }
          break;
        }
      }
    } else {
      // Standard bilateral calculation
      const setVol = calculateSetVolume(set, type, options);
      leftVol += setVol * 0.5;
      rightVol += setVol * 0.5;
    }

    return {
      left: acc.left + leftVol,
      right: acc.right + rightVol
    };
  }, { left: 0, right: 0 });
}

/**
 * Helper to calculate volume for a single set (legacy/bilateral)
 */
function calculateSetVolume(
  set: WorkoutSet,
  trackingType: ExerciseTrackingType,
  options?: {
    userBodyweight?: number;
    exerciseName?: string;
  }
): number {
  switch (trackingType) {
    case 'weight_reps': {
      if (set.weight !== undefined && set.reps !== undefined) {
        return set.reps * set.weight;
      }
      return 0;
    }

    case 'reps_only': {
      if (set.reps !== undefined) {
        if (options?.userBodyweight && options?.exerciseName) {
          const effectiveWeight = calculateEffectiveBodyweight(
            options.userBodyweight,
            options.exerciseName
          );
          return set.reps * effectiveWeight;
        }
        return set.reps;
      }
      return 0;
    }

    case 'cardio': {
      if (set.distance !== undefined) {
        return set.distanceUnit === 'miles' ? set.distance * 1.60934 : set.distance;
      }
      if (set.duration !== undefined) {
        return set.duration;
      }
      return 0;
    }

    case 'duration': {
      if (set.duration !== undefined) {
        return set.duration;
      }
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Calculate total volume for workout sets
 */
export function calculateVolume(
  sets: WorkoutSet[],
  trackingType?: ExerciseTrackingType,
  options?: {
    userBodyweight?: number;
    exerciseName?: string;
  }
): number {
  return sets.reduce((total, set) => {
    if (!set.completed) {
      return total;
    }

    // If tracking type not provided, infer from set data
    const type = trackingType || inferTrackingType(set);

    // Check if unilateral tracking is active for this set
    const hasLeft = set.leftReps !== undefined || set.leftWeight !== undefined || set.leftDistance !== undefined || set.leftDuration !== undefined;
    const hasRight = set.rightReps !== undefined || set.rightWeight !== undefined || set.rightDistance !== undefined || set.rightDuration !== undefined;
    
    if (set.sides || hasLeft || hasRight) {
      // For unilateral sets, sum up left and right volumes
      const sideVols = calculateVolumeBySide([set], type, options);
      return total + sideVols.left + sideVols.right;
    }

    return total + calculateSetVolume(set, type, options);
  }, 0);
}

export function convertWeight(weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) {
    return weight;
  }

  if (from === 'kg' && to === 'lbs') {
    return weight * 2.20462;
  } else {
    return weight / 2.20462;
  }
}

export function roundToNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

export function calculateOneRepMax(weight: number, reps: number): number {
  // Epley formula: 1RM = weight × (1 + reps/30)
  return weight * (1 + reps / 30);
}

export function calculateEstimatedOneRepMax(weight: number, reps: number): number {
  // Brzycki formula (more conservative)
  if (reps === 1) {
    return weight;
  }
  return weight / (1.0278 - 0.0278 * reps);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatWeight(weight: number, unit: 'kg' | 'lbs'): string {
  return `${weight.toFixed(unit === 'kg' ? 1 : 0)} ${unit}`;
}

/**
 * Check if two workout dates are within 72 hours of each other
 */
function isWithin72Hours(date1: Date, date2: Date): boolean {
  const hoursDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 72;
}

/**
 * Count workouts within a date window
 */
function countWorkoutsInWindow(workoutDates: Date[], windowStart: Date, windowEnd: Date): number {
  return workoutDates.filter(date => {
    const workoutTime = date.getTime();
    return workoutTime >= windowStart.getTime() && workoutTime <= windowEnd.getTime();
  }).length;
}

/**
 * Validate that the current workout is part of a 7-day window with at least 3 workouts
 */
function validateRollingWindows(
  allWorkoutDates: Date[],
  currentWorkoutDate: Date,
  minWorkoutsPerWindow: number = 3
): boolean {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const currentTime = currentWorkoutDate.getTime();
  
  // Check all possible 7-day windows that contain the current workout
  for (let daysBefore = 0; daysBefore <= 6; daysBefore++) {
    const windowStart = new Date(currentTime - daysBefore * oneDayMs);
    const windowEnd = new Date(windowStart.getTime() + sevenDaysMs);
    
    // Count workouts within this 7-day window (including the current workout)
    const workoutsInWindow = countWorkoutsInWindow(allWorkoutDates, windowStart, windowEnd);
    
    if (workoutsInWindow >= minWorkoutsPerWindow) {
      // Found at least one valid 7-day window
      return true;
    }
  }
  
  // No valid 7-day window found
  return false;
}

/**
 * Calculate workout streak
 */
export function calculateStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) {
    return 0;
  }
  
  // Filter out invalid dates
  const validDates = workoutDates.filter(d => !isNaN(d.getTime()));
  if (validDates.length < 3) {
    return 0;
  }

  // Remove duplicates and sort by date (most recent first)
  const uniqueDates = Array.from(
    new Set(validDates.map(date => date.getTime()))
  ).map(time => new Date(time));
  
  const sortedDates = uniqueDates.sort((a, b) => b.getTime() - a.getTime());

  // Track workouts in the streak
  const streakWorkouts: Date[] = [];
  
  // Start from the most recent workout
  for (let i = 0; i < sortedDates.length; i++) {
    const currentWorkout = sortedDates[i];
    
    // First workout is always added (if we have enough workouts)
    if (i === 0) {
      if (validateRollingWindows(sortedDates, currentWorkout, 3)) {
        streakWorkouts.push(currentWorkout);
      } else {
        break;
      }
    } else {
      // Check 72-hour gap rule
      const previousWorkout = streakWorkouts[streakWorkouts.length - 1];
      if (!isWithin72Hours(currentWorkout, previousWorkout)) {
        break;
      }
      
      // Check rolling 7-day window rule
      if (!validateRollingWindows(sortedDates, currentWorkout, 3)) {
        break;
      }
      
      streakWorkouts.push(currentWorkout);
    }
  }
  
  return streakWorkouts.length;
}

export function estimateEnergy(workouts: Array<{ totalVolume: number; totalDuration: number }>): number {
  if (!workouts || workouts.length === 0) {
    return 0;
  }

  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const totalDuration = workouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0);

  const volumeCalories = totalVolume * 0.1;
  const timeCalories = totalDuration * 8;

  const total = Math.round(volumeCalories + timeCalories);
  return isNaN(total) ? 0 : total;
}

/**
 * Calculate volume by exercise type for normalized analytics
 */
export interface VolumeMetrics {
  weightRepsVolume: number; // kg × reps (standard volume)
  repsOnlyVolume: number; // kg × reps for bodyweight exercises (if bodyweight provided), otherwise total reps
  cardioVolume: number; // distance in km
  durationVolume: number; // duration in seconds
  totalNormalizedVolume: number; // Normalized total (weight_reps + reps_only with bodyweight)
}

export function calculateVolumeByType(
  sets: WorkoutSet[],
  trackingType: ExerciseTrackingType,
  options?: {
    userBodyweight?: number;
    exerciseName?: string;
  }
): VolumeMetrics {
  const metrics: VolumeMetrics = {
    weightRepsVolume: 0,
    repsOnlyVolume: 0,
    cardioVolume: 0,
    durationVolume: 0,
    totalNormalizedVolume: 0,
  };

  sets.forEach((set) => {
    if (!set.completed) {
      return;
    }

    const type = trackingType;
    
    // Check if unilateral
    const hasLeft = set.leftReps !== undefined || set.leftWeight !== undefined || set.leftDistance !== undefined || set.leftDuration !== undefined;
    const hasRight = set.rightReps !== undefined || set.rightWeight !== undefined || set.rightDistance !== undefined || set.rightDuration !== undefined;
    
    let vol = 0;
    
    if (set.sides || hasLeft || hasRight) {
      const sideVols = calculateVolumeBySide([set], type, options);
      vol = sideVols.left + sideVols.right;
    } else {
      vol = calculateSetVolume(set, type, options);
    }

    switch (type) {
      case 'weight_reps':
        metrics.weightRepsVolume += vol;
        metrics.totalNormalizedVolume += vol;
        break;
      case 'reps_only':
        metrics.repsOnlyVolume += vol;
        if (options?.userBodyweight && options?.exerciseName) {
          metrics.totalNormalizedVolume += vol;
        }
        break;
      case 'cardio':
        metrics.cardioVolume += vol;
        break;
      case 'duration':
        metrics.durationVolume += vol;
        break;
    }
  });

  return metrics;
}

/**
 * Calculate next set values based on volume progression
 */
export function calculateNextSetByVolume(
  previousSet: WorkoutSet | null | undefined,
  unit: 'kg' | 'lbs' = 'kg'
): { weight: number; reps: number } {
  if (!previousSet || previousSet.weight === undefined || previousSet.reps === undefined) {
    return { weight: 0, reps: 10 };
  }

  const previousWeight = previousSet.weight;
  const previousReps = previousSet.reps;

  const weightIncrement = unit === 'kg' ? 2.5 : 5;
  
  let newWeight: number;
  let newReps: number;

  if (previousWeight === 0) {
    newWeight = weightIncrement;
    newReps = previousReps;
  } else {
    newWeight = previousWeight + weightIncrement;
    newReps = previousReps;
  }

  newWeight = roundToNearest(newWeight, weightIncrement);

  return { weight: Math.max(0, newWeight), reps: Math.max(1, newReps) };
}

/**
 * Calculate pace (time per distance unit)
 */
export function calculatePace(time: number, distance: number, _distanceUnit: 'km' | 'miles'): number {
  if (distance <= 0 || time <= 0) {
    return 0;
  }
  const timeMinutes = time / 60;
  return timeMinutes / distance;
}

/**
 * Estimate calories burned from steps count
 */
export function estimateCaloriesFromSteps(steps: number): number {
  if (steps <= 0) {
    return 0;
  }
  return Math.round(steps * 0.04);
}

/**
 * Calculate speed (distance per time)
 */
export function calculateSpeed(distance: number, time: number, _distanceUnit: 'km' | 'miles'): number {
  if (time <= 0 || distance <= 0) {
    return 0;
  }
  const timeHours = time / 3600;
  return distance / timeHours;
}

/**
 * Format pace for display
 */
export function formatPace(pace: number, distanceUnit: 'km' | 'miles'): string {
  if (pace <= 0) {
    return '0:00';
  }
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /${distanceUnit === 'km' ? 'km' : 'mi'}`;
}

/**
 * Format speed for display
 */
export function formatSpeed(speed: number, distanceUnit: 'km' | 'miles'): string {
  if (speed <= 0) {
    return '0';
  }
  return `${speed.toFixed(1)} ${distanceUnit === 'km' ? 'km/h' : 'mph'}`;
}
