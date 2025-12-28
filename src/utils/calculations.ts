import { WorkoutSet, ExerciseTrackingType } from '@/types/exercise';

/**
 * Infer tracking type from set data
 */
function inferTrackingType(set: WorkoutSet): ExerciseTrackingType {
  if (set.weight !== undefined || (set.reps !== undefined && set.weight !== undefined)) {
    return 'weight_reps';
  }
  if (set.distance !== undefined) {
    return 'cardio';
  }
  if (set.duration !== undefined) {
    return 'duration';
  }
  if (set.reps !== undefined) {
    return 'reps_only';
  }
  return 'weight_reps'; // Default fallback
}

export function calculateVolume(sets: WorkoutSet[], trackingType?: ExerciseTrackingType): number {
  return sets.reduce((total, set) => {
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
        // For bodyweight exercises, volume could be just total reps
        // or 0 if we want to exclude them from volume calculations
        if (set.reps !== undefined) {
          return total + set.reps;
        }
        return total;

      case 'cardio':
        // For cardio, we could use distance or time, but for consistency
        // with existing analytics, return 0 or use distance
        if (set.distance !== undefined) {
          // Convert to a common unit (km) for volume calculation
          const distanceKm = set.distanceUnit === 'miles' ? set.distance * 1.60934 : set.distance;
          return total + distanceKm;
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

export function calculateStreak(workoutDates: Date[]): number {
  if (workoutDates.length === 0) return 0;

  const sortedDates = workoutDates
    .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const currentDate = new Date(today);

  for (const workoutDate of sortedDates) {
    const workoutDay = new Date(workoutDate);
    workoutDay.setHours(0, 0, 0, 0);

    if (workoutDay.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (workoutDay.getTime() < currentDate.getTime()) {
      break;
    }
  }

  return streak;
}

export function estimateEnergy(workouts: Array<{ totalVolume: number; totalDuration: number }>): number {
  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.totalDuration, 0);

  const volumeCalories = totalVolume * 0.1;
  const timeCalories = totalDuration * 8;

  return Math.round(volumeCalories + timeCalories);
}

/**
 * Calculate volume by exercise type for normalized analytics
 * Returns separate metrics for different exercise types to avoid unit mixing
 */
export interface VolumeMetrics {
  weightRepsVolume: number; // kg × reps (standard volume)
  repsOnlyVolume: number; // total reps
  cardioVolume: number; // distance in km
  durationVolume: number; // duration in seconds
  totalNormalizedVolume: number; // Normalized total (weight_reps only for now)
}

export function calculateVolumeByType(sets: WorkoutSet[], trackingType: ExerciseTrackingType): VolumeMetrics {
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
          metrics.repsOnlyVolume += set.reps;
          // Note: reps_only volume is not added to totalNormalizedVolume
          // to avoid mixing units. Use repsOnlyVolume separately for analytics.
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
  const previousVolume = previousWeight * previousReps;

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
 * @param distanceUnit Unit of distance ('km' or 'miles')
 * @returns Pace in minutes per km or minutes per mile
 */
export function calculatePace(time: number, distance: number, distanceUnit: 'km' | 'miles'): number {
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
 * @param distanceUnit Unit of distance ('km' or 'miles')
 * @returns Speed in km/h or mph
 */
export function calculateSpeed(distance: number, time: number, distanceUnit: 'km' | 'miles'): number {
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

