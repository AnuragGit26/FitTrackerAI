import { WorkoutSet, ExerciseTrackingType } from '@/types/exercise';
import { calculateEffectiveBodyweight } from './bodyweightMultipliers';

/**
 * Infer tracking type from set data
 * Priority order: cardio (distance) > weight_reps (weight+reps) > duration > reps_only
 */
function inferTrackingType(set: WorkoutSet): ExerciseTrackingType {
  // Check for cardio first (most specific)
  if (set.distance !== undefined) {
    return 'cardio';
  }
  // Check for weight training (weight with or without reps)
  if (set.weight !== undefined && set.weight > 0) {
    return 'weight_reps';
  }
  // Check for duration exercises (yoga, stretching, planks)
  if (set.duration !== undefined && set.duration > 0) {
    return 'duration';
  }
  // Check for reps-only exercises (bodyweight exercises like push-ups)
  if (set.reps !== undefined && set.reps > 0) {
    return 'reps_only';
  }
  // Default fallback
  return 'weight_reps';
}

/**
 * Calculate total volume for workout sets
 * For weight_reps: Volume = Σ(reps × weight) for all completed sets
 * For reps_only (bodyweight): Volume = Σ(reps × effective_bodyweight) where effective_bodyweight = bodyweight × exercise_multiplier
 * This is the standard volume calculation used in strength training.
 * Note: For dumbbell exercises, weight should be the total weight of both dumbbells.
 * For barbell exercises, weight should be the total weight (plates + barbell rod).
 *
 * @param sets Array of workout sets
 * @param trackingType Optional tracking type, will be inferred if not provided
 * @param options Optional parameters for enhanced calculations
 * @param options.userBodyweight User's bodyweight in kg (required for accurate reps_only volume)
 * @param options.exerciseName Exercise name (used to determine bodyweight multiplier for reps_only)
 * @returns Total volume (kg × reps for weight_reps and reps_only, or appropriate unit for other types)
 */
export function calculateVolume(
  sets: WorkoutSet[],
  trackingType?: ExerciseTrackingType,
  options?: {
    userBodyweight?: number;
    exerciseName?: string;
  }
): number {
  const volume = sets.reduce((total, set) => {
    if (!set.completed) return total;

    // If tracking type not provided, infer from set data
    const type = trackingType || inferTrackingType(set);

    switch (type) {
      case 'weight_reps':
        if (set.weight !== undefined && set.reps !== undefined) {
          return total + set.reps * set.weight;
        }
        return total;

      case 'reps_only':
        // FIX: For bodyweight exercises, calculate volume using effective bodyweight
        // Volume = reps × (bodyweight × exercise_multiplier)
        // This provides meaningful volume comparable to weighted exercises
        if (set.reps !== undefined) {
          // If bodyweight is provided, calculate realistic volume
          if (options?.userBodyweight && options?.exerciseName) {
            const effectiveWeight = calculateEffectiveBodyweight(
              options.userBodyweight,
              options.exerciseName
            );
            return total + set.reps * effectiveWeight;
          }
          // Fallback: If no bodyweight, use reps only (for backward compatibility)
          // This allows basic tracking even without user weight data
          return total + set.reps;
        }
        return total;

      case 'cardio':
        // FIX: For cardio, always normalize to kilometers to prevent mixing units in analytics
        // This ensures consistent volume calculations regardless of user's unit preference
        if (set.distance !== undefined) {
          // Convert to kilometers (international standard for fitness tracking)
          const distanceKm = set.distanceUnit === 'miles' ? set.distance * 1.60934 : set.distance;
          return total + distanceKm;
        }
        // If no distance, use time as volume metric (seconds)
        if (set.duration !== undefined) {
          return total + set.duration;
        }
        return total;

      case 'duration':
        // For duration exercises, return total duration in seconds
        // or 0 if we want to exclude them from volume calculations
        if (set.duration !== undefined) {
          return total + set.duration;
        }
        return total;

      default:
        return total;
    }
  }, 0);
  
  return isNaN(volume) ? 0 : volume;
}

export function convertWeight(weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return weight;

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
  if (reps === 1) return weight;
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
 * Checks all possible 7-day windows that contain the current workout
 * A 7-day window containing workout at time T can start anywhere from T-6days to T
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
  // A window can start from 6 days before the workout up to the workout time itself
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
 * Calculate workout streak based on:
 * - At least 3 workouts in any rolling 7-day window
 * - Consecutive workouts within 72 hours of each other
 * Returns the count of workouts that meet these conditions
 */
export function calculateStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) return 0;
  
  // Filter out invalid dates
  const validDates = workoutDates.filter(d => !isNaN(d.getTime()));
  if (validDates.length < 3) return 0;

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
      // Check if this workout can be part of a valid streak
      // We need to verify it can form a 7-day window with at least 3 workouts
      if (validateRollingWindows(sortedDates, currentWorkout, 3)) {
        streakWorkouts.push(currentWorkout);
      } else {
        // Can't form a valid streak starting from here
        break;
      }
    } else {
      // Check 72-hour gap rule
      const previousWorkout = streakWorkouts[streakWorkouts.length - 1];
      if (!isWithin72Hours(currentWorkout, previousWorkout)) {
        // Gap too large, streak ends
        break;
      }
      
      // Check rolling 7-day window rule
      // The workout must be part of a 7-day window with at least 3 workouts
      if (!validateRollingWindows(sortedDates, currentWorkout, 3)) {
        // Window rule violated, streak ends
        break;
      }
      
      // Both conditions met, add to streak
      streakWorkouts.push(currentWorkout);
    }
  }
  
  return streakWorkouts.length;
}

export function estimateEnergy(workouts: Array<{ totalVolume: number; totalDuration: number }>): number {
  if (!workouts || workouts.length === 0) return 0;

  const totalVolume = workouts.reduce((sum, w) => sum + (w.totalVolume || 0), 0);
  const totalDuration = workouts.reduce((sum, w) => sum + (w.totalDuration || 0), 0);

  const volumeCalories = totalVolume * 0.1;
  const timeCalories = totalDuration * 8;

  const total = Math.round(volumeCalories + timeCalories);
  return isNaN(total) ? 0 : total;
}

/**
 * Calculate volume by exercise type for normalized analytics
 * Returns separate metrics for different exercise types to avoid unit mixing
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
    if (!set.completed) return;

    switch (trackingType) {
      case 'weight_reps':
        if (set.weight !== undefined && set.reps !== undefined) {
          const volume = set.reps * set.weight;
          metrics.weightRepsVolume += volume;
          metrics.totalNormalizedVolume += volume;
        }
        break;
      case 'reps_only':
        if (set.reps !== undefined) {
          // FIX: Calculate proper volume for bodyweight exercises
          if (options?.userBodyweight && options?.exerciseName) {
            const effectiveWeight = calculateEffectiveBodyweight(
              options.userBodyweight,
              options.exerciseName
            );
            const volume = set.reps * effectiveWeight;
            metrics.repsOnlyVolume += volume;
            // FIX: Include bodyweight exercise volume in totalNormalizedVolume
            // Now that we have proper weight calculations, we can combine with weight_reps
            metrics.totalNormalizedVolume += volume;
          } else {
            // Fallback: If no bodyweight, just count reps
            metrics.repsOnlyVolume += set.reps;
            // Note: reps-only volume without bodyweight is not added to totalNormalizedVolume
            // to avoid mixing units (kg vs reps)
          }
        }
        break;
      case 'cardio':
        if (set.distance !== undefined) {
          const distanceKm = set.distanceUnit === 'miles' ? set.distance * 1.60934 : set.distance;
          metrics.cardioVolume += distanceKm;
          // Note: cardio volume is not added to totalNormalizedVolume
          // to avoid mixing units. Use cardioVolume separately for analytics.
        }
        break;
      case 'duration':
        if (set.duration !== undefined) {
          metrics.durationVolume += set.duration;
          // Note: duration volume is not added to totalNormalizedVolume
          // to avoid mixing units. Use durationVolume separately for analytics.
        }
        break;
    }
  });

  return metrics;
}

/**
 * Calculate next set values based on volume progression
 * Increases volume by prioritizing weight increase (2.5kg/5lbs), ensuring volume always increases
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

  // Weight increment based on unit (2.5kg or 5lbs)
  const weightIncrement = unit === 'kg' ? 2.5 : 5;
  
  let newWeight: number;
  let newReps: number;

  if (previousWeight === 0) {
    // If previous weight was 0, start with base weight and same reps
    newWeight = weightIncrement;
    newReps = previousReps;
  } else {
    // Increase weight first (this will always increase volume)
    newWeight = previousWeight + weightIncrement;
    newReps = previousReps;
  }

  // Round weight to nearest increment
  newWeight = roundToNearest(newWeight, weightIncrement);

  return { weight: Math.max(0, newWeight), reps: Math.max(1, newReps) };
}

/**
 * Calculate pace (time per distance unit)
 * @param time Time in seconds
 * @param distance Distance in km or miles
 * @param _distanceUnit Unit of distance ('km' or 'miles') - used for documentation
 * @returns Pace in minutes per km or minutes per mile
 */
export function calculatePace(time: number, distance: number, _distanceUnit: 'km' | 'miles'): number {
  if (distance <= 0 || time <= 0) return 0;
  const timeMinutes = time / 60;
  return timeMinutes / distance;
}

/**
 * Estimate calories burned from steps count
 * Approximate formula: calories ≈ steps × 0.04
 * This is a rough estimate and varies by individual factors
 * @param steps Number of steps
 * @returns Estimated calories burned
 */
export function estimateCaloriesFromSteps(steps: number): number {
  if (steps <= 0) return 0;
  return Math.round(steps * 0.04);
}

/**
 * Calculate speed (distance per time)
 * @param distance Distance in km or miles
 * @param time Time in seconds
 * @param _distanceUnit Unit of distance ('km' or 'miles') - used for documentation
 * @returns Speed in km/h or mph
 */
export function calculateSpeed(distance: number, time: number, _distanceUnit: 'km' | 'miles'): number {
  if (time <= 0 || distance <= 0) return 0;
  const timeHours = time / 3600;
  return distance / timeHours;
}

/**
 * Format pace for display
 * @param pace Pace in minutes per km or miles
 * @param distanceUnit Unit of distance
 * @returns Formatted pace string (e.g., "5:30 /km")
 */
export function formatPace(pace: number, distanceUnit: 'km' | 'miles'): string {
  if (pace <= 0) return '0:00';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /${distanceUnit === 'km' ? 'km' : 'mi'}`;
}

/**
 * Format speed for display
 * @param speed Speed in km/h or mph
 * @param distanceUnit Unit of distance
 * @returns Formatted speed string (e.g., "12.5 km/h")
 */
export function formatSpeed(speed: number, distanceUnit: 'km' | 'miles'): string {
  if (speed <= 0) return '0';
  return `${speed.toFixed(1)} ${distanceUnit === 'km' ? 'km/h' : 'mph'}`;
}

