import { WorkoutSet, ExerciseTrackingType } from '@/types/exercise';

export function calculateVolume(sets: WorkoutSet[], trackingType: ExerciseTrackingType): number {
  return sets.reduce((total, set) => {
    if (!set.completed) return total;

    switch (trackingType) {
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
  let currentDate = new Date(today);
  
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

