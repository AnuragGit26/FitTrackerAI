import { Workout } from '@/types/workout';

/**
 * Validation utilities for calculation functions
 * Ensures calculations handle edge cases for new users gracefully
 */

/**
 * Validate that a value is a valid number, returning a fallback if not
 */
export function validateNumber(value: number | undefined | null, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return fallback;
}

/**
 * Validate workout array and return safe defaults for new users
 */
export function validateWorkoutsForCalculation(workouts: Workout[]): {
  isValid: boolean;
  workoutCount: number;
  hasEnoughData: boolean;
} {
  const workoutCount = Array.isArray(workouts) ? workouts.length : 0;
  return {
    isValid: workoutCount >= 0,
    workoutCount,
    hasEnoughData: workoutCount >= 7,
  };
}

/**
 * Calculate safe average with validation
 * Returns null if not enough data points
 */
export function calculateSafeAverage(
  values: (number | undefined | null)[],
  minDataPoints: number = 7
): number | null {
  const validValues = values
    .map(v => validateNumber(v))
    .filter(v => v !== 0 || values.some(orig => orig === 0));

  if (validValues.length < minDataPoints) {
    return null;
  }

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sum / validValues.length;
}

/**
 * Get default value for metrics when insufficient data
 */
export function getDefaultMetricValue(metricType: 'volume' | 'count' | 'percentage' | 'score'): number {
  switch (metricType) {
    case 'volume':
    case 'count':
      return 0;
    case 'percentage':
    case 'score':
      return 0;
    default:
      return 0;
  }
}

