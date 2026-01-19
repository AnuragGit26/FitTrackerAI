/**
 * Smart Rest Timer Utilities
 * AI-powered rest time suggestions based on exercise intensity and recovery status
 */

import { Exercise } from '@/types/workout';
import { MuscleGroup, RecoveryStatus } from '@/types/muscle';

export interface RestSuggestion {
  recommendedSeconds: number;
  reason: string;
  intensity: 'low' | 'medium' | 'high' | 'very_high';
}

/**
 * Calculate recommended rest time based on exercise and recovery factors
 */
export function calculateSmartRestTime(
  exercise: Exercise,
  lastSetIntensity: number, // 1-10 RPE scale, or calculated from weight/reps
  muscleRecovery: number, // 0-100% recovery for primary muscle
  currentFatigue: number = 0 // 0-100 cumulative workout fatigue
): RestSuggestion {
  let baseRestSeconds = 90; // Default rest time
  let reason = 'Standard rest period';
  let intensity: 'low' | 'medium' | 'high' | 'very_high' = 'medium';

  // 1. Determine base rest time by exercise type
  const isCompound = isCompoundExercise(exercise.name);
  const isPowerlifting = isPowerliftingMovement(exercise.name);

  if (isPowerlifting) {
    baseRestSeconds = 300; // 5 minutes for heavy powerlifting
    intensity = 'very_high';
    reason = 'Heavy compound movement - extended rest needed';
  } else if (isCompound) {
    baseRestSeconds = 180; // 3 minutes for compound exercises
    intensity = 'high';
    reason = 'Compound exercise - longer rest period';
  } else {
    baseRestSeconds = 90; // 1.5 minutes for isolation
    intensity = 'medium';
    reason = 'Isolation exercise - moderate rest';
  }

  // 2. Adjust based on set intensity (RPE)
  if (lastSetIntensity >= 9) {
    baseRestSeconds += 60; // Add 1 minute for RPE 9-10
    intensity = 'very_high';
    reason = 'High intensity set - extra recovery time';
  } else if (lastSetIntensity >= 7) {
    baseRestSeconds += 30; // Add 30s for RPE 7-8
    if (intensity !== 'very_high') {intensity = 'high';}
  } else if (lastSetIntensity <= 4) {
    baseRestSeconds -= 30; // Reduce for light sets
    intensity = 'low';
    reason = 'Light intensity - shorter rest sufficient';
  }

  // 3. Adjust based on muscle recovery status
  if (muscleRecovery < 50) {
    // Muscle not well recovered - add rest time
    baseRestSeconds += Math.round(baseRestSeconds * 0.2); // +20%
    reason += ' (muscle fatigue detected)';
  } else if (muscleRecovery >= 90) {
    // Well recovered - can reduce slightly
    baseRestSeconds -= Math.round(baseRestSeconds * 0.1); // -10%
  }

  // 4. Adjust for cumulative workout fatigue
  if (currentFatigue > 70) {
    // High fatigue - increase rest
    baseRestSeconds += Math.round(baseRestSeconds * 0.3); // +30%
    reason += ' (high workout fatigue)';
    intensity = 'very_high';
  } else if (currentFatigue > 50) {
    baseRestSeconds += Math.round(baseRestSeconds * 0.15); // +15%
  }

  // 5. Clamp to reasonable bounds (30s - 8 minutes)
  baseRestSeconds = Math.max(30, Math.min(480, baseRestSeconds));

  // Round to nearest 15 seconds for cleaner display
  baseRestSeconds = Math.round(baseRestSeconds / 15) * 15;

  return {
    recommendedSeconds: baseRestSeconds,
    reason,
    intensity,
  };
}

/**
 * Check if exercise is a compound movement
 */
function isCompoundExercise(exerciseName: string): boolean {
  const compoundKeywords = [
    'squat', 'deadlift', 'bench', 'press', 'row', 'pull-up', 'pullup',
    'chin-up', 'chinup', 'dip', 'lunge', 'clean', 'snatch', 'thruster'
  ];

  const nameLower = exerciseName.toLowerCase();
  return compoundKeywords.some(keyword => nameLower.includes(keyword));
}

/**
 * Check if exercise is a heavy powerlifting movement
 */
function isPowerliftingMovement(exerciseName: string): boolean {
  const powerliftingMoves = [
    'squat', 'deadlift', 'bench press', 'overhead press', 'clean', 'snatch'
  ];

  const nameLower = exerciseName.toLowerCase();
  return powerliftingMoves.some(move => nameLower.includes(move));
}

/**
 * Calculate estimated RPE from weight and reps if not manually tracked
 */
export function estimateRPE(weight: number, reps: number, oneRepMax?: number): number {
  if (!oneRepMax) {
    // Use reps as rough guide
    if (reps >= 15) {return 5;} // High rep, likely lower RPE
    if (reps >= 12) {return 6;}
    if (reps >= 10) {return 7;}
    if (reps >= 8) {return 7.5;}
    if (reps >= 6) {return 8;}
    if (reps >= 4) {return 8.5;}
    if (reps >= 2) {return 9;}
    return 9.5; // 1 rep likely near max
  }

  // Calculate percentage of 1RM
  const percentageOfMax = (weight / oneRepMax) * 100;

  if (percentageOfMax >= 95) {return 10;}
  if (percentageOfMax >= 90) {return 9.5;}
  if (percentageOfMax >= 85) {return 9;}
  if (percentageOfMax >= 80) {return 8.5;}
  if (percentageOfMax >= 75) {return 8;}
  if (percentageOfMax >= 70) {return 7.5;}
  if (percentageOfMax >= 65) {return 7;}
  if (percentageOfMax >= 60) {return 6.5;}
  return 6;
}

/**
 * Calculate cumulative workout fatigue (0-100)
 */
export function calculateWorkoutFatigue(
  workoutDuration: number, // minutes
  setsCompleted: number,
  totalVolume: number // kg
): number {
  // Simple fatigue model based on volume and duration
  const durationFactor = Math.min(workoutDuration / 90, 1); // Cap at 90 minutes
  const setsFactor = Math.min(setsCompleted / 30, 1); // Cap at 30 sets
  const volumeFactor = Math.min(totalVolume / 10000, 1); // Cap at 10,000kg

  return Math.round((durationFactor * 30 + setsFactor * 40 + volumeFactor * 30));
}

/**
 * Format seconds into human-readable time
 */
export function formatRestTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Get intensity color class for UI
 */
export function getIntensityColor(intensity: RestSuggestion['intensity']): string {
  switch (intensity) {
    case 'low':
      return 'text-blue-500 dark:text-blue-400';
    case 'medium':
      return 'text-blue-500 dark:text-blue-400';
    case 'high':
      return 'text-yellow-500 dark:text-yellow-400';
    case 'very_high':
      return 'text-red-500 dark:text-red-400';
  }
}

/**
 * Get intensity badge background
 */
export function getIntensityBgColor(intensity: RestSuggestion['intensity']): string {
  switch (intensity) {
    case 'low':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    case 'medium':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
    case 'high':
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700';
    case 'very_high':
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
  }
}
