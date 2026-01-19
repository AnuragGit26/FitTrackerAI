import { Workout } from '@/types/workout';
import { MuscleGroup, MuscleStatus } from '@/types/muscle';
import { differenceInHours } from 'date-fns';
import { calculateVolume } from '@/utils/calculations';

/**
 * Advanced Recovery Modeling Service
 * Implements algorithms for fatigue accumulation, supercompensation,
 * volume prediction, and PR probability.
 */

// Constants for fatigue modeling
const FATIGUE_DECAY_RATE = 0.05; // Hourly decay rate
const WORKLOAD_FATIGUE_FACTOR = 0.5; // Conversion of workload score to fatigue units

/**
 * Calculate fatigue accumulation for a specific muscle group
 * Uses an exponential decay model based on recent workload
 */
export function calculateFatigueAccumulation(
  muscleStatus: MuscleStatus,
  hoursSinceLastWorkout: number
): number {
  // Base fatigue derived from workload score (0-100+)
  const initialFatigue = muscleStatus.workloadScore * WORKLOAD_FATIGUE_FACTOR;
  
  // Exponential decay: F(t) = F0 * e^(-λt)
  const currentFatigue = initialFatigue * Math.exp(-FATIGUE_DECAY_RATE * hoursSinceLastWorkout);
  
  return Math.max(0, Math.round(currentFatigue));
}

/**
 * Calculate supercompensation score
 * Supercompensation occurs when recovery > 100% (overshoot)
 * Peak supercompensation typically happens 24-48h after full recovery
 */
export function calculateSupercompensation(
  muscleStatus: MuscleStatus,
  hoursSinceLastWorkout: number
): number {
  const recoveryPercentage = muscleStatus.recoveryPercentage;
  
  if (recoveryPercentage < 100) {
    return 0; // No supercompensation yet
  }
  
  // Hours *since* reaching 100% recovery (approximate)
  // Assuming linear recovery rate for simplicity to find 100% point
  // adjustedRecoveryHours is roughly total hours needed.
  // We can infer how long it's been "ready".
  
  // Simplified model:
  // Supercompensation peaks at 110% then decays back to 100%
  // Curve shape: bell curve centered shortly after full recovery
  
  // We'll use a heuristic:
  // If > 100% recovery (which isn't strictly tracked in `recoveryPercentage` capped at 100),
  // we simulate it based on time since 100% recovery would have occurred.
  
  // Let's assume optimal window is 12-36 hours AFTER becoming 'ready' (100%)
  // If muscleStatus says 'ready' (100%), we check how long it's been ready.
  // But MuscleStatus doesn't track "time became ready".
  
  // Alternative: Use recoveryPercentage directly if we uncap it internally, 
  // or model it here based on physiology.
  
  // For now, let's look at the "freshness" or "readiness" beyond 100%
  // We can use the difference between current time and last workout vs recommended rest days.
  
  const recommendedRecoveryHours = muscleStatus.recommendedRestDays * 24;
  
  if (hoursSinceLastWorkout <= recommendedRecoveryHours) {
    return 0; // Still recovering
  }
  
  const hoursSinceRecovered = hoursSinceLastWorkout - recommendedRecoveryHours;
  
  // Peak at 24 hours after recovery
  // Gaussian-like curve
  const peakTime = 24;
  const width = 12; // Standard deviation equivalent
  
  const score = 10 * Math.exp(-Math.pow(hoursSinceRecovered - peakTime, 2) / (2 * Math.pow(width, 2)));
  
  return Math.round(score);
}

/**
 * Predict volume for next workout based on historical trends
 * Uses moving average and trend direction
 */
export function predictVolume(
  recentWorkouts: Workout[],
  muscle: MuscleGroup
): number {
  // Extract volume for this muscle from recent workouts
  const volumes = recentWorkouts
    .map(w => {
      const exercises = w.exercises.filter(ex => ex.musclesWorked.includes(muscle));
      if (exercises.length === 0) {
    return 0;
  }
      return exercises.reduce((sum, ex) => sum + calculateVolume(ex.sets, ex.trackingType), 0);
    })
    .filter(v => v > 0)
    .reverse(); // Oldest first
    
  if (volumes.length === 0) {
    return 0;
  }
  if (volumes.length === 1) {
    return volumes[0];
  }
  
  // Simple linear regression or weighted moving average
  // Let's use weighted moving average favoring recent sessions
  let weightedSum = 0;
  let weightTotal = 0;
  
  volumes.forEach((vol, i) => {
    const weight = i + 1;
    weightedSum += vol * weight;
    weightTotal += weight;
  });
  
  const movingAverage = weightedSum / weightTotal;
  
  // Check trend (last vs average)
  const lastVol = volumes[volumes.length - 1];
  const trendFactor = lastVol > movingAverage ? 1.05 : 1.0; // 5% increase if trending up
  
  return Math.round(movingAverage * trendFactor);
}

/**
 * Calculate probability of hitting a PR (0-100)
 * Factors: Recovery status, recent volume trend, consistency, and supercompensation
 */
export function calculatePRProbability(
  muscleStatus: MuscleStatus,
  recentWorkouts: Workout[],
  hoursSinceLastWorkout: number
): number {
  // Factor 1: Recovery (40%)
  // Must be at least 90% recovered to have high chance
  let recoveryScore = 0;
  if (muscleStatus.recoveryPercentage >= 100) {
    recoveryScore = 100;
  }
  else if (muscleStatus.recoveryPercentage >= 90) {
    recoveryScore = 80;
  }
  else if (muscleStatus.recoveryPercentage >= 80) {
    recoveryScore = 50;
  }
  else {recoveryScore = 20;}
  
  // Factor 2: Supercompensation (20%)
  const supercomp = calculateSupercompensation(muscleStatus, hoursSinceLastWorkout);
  // supercomp is roughly 0-10
  const superScore = Math.min(100, supercomp * 10);
  
  // Factor 3: Consistency (20%)
  // Simple check of workout frequency in last 2 weeks
  const consistencyScore = muscleStatus.trainingFrequency >= 2 ? 100 : 
                           muscleStatus.trainingFrequency >= 1 ? 70 : 40;
                           
  // Factor 4: Volume Trend (20%)
  // Are we progressively overloading?
  const volumes = recentWorkouts
    .slice(0, 5) // Last 5 workouts
    .map(w => w.exercises.reduce((sum, ex) => sum + ex.totalVolume, 0))
    .reverse();
    
  let trendScore = 50;
  if (volumes.length >= 2) {
    const current = volumes[volumes.length - 1];
    const prev = volumes[volumes.length - 2];
    if (current > prev) {trendScore = 90;}
    else if (current === prev) {
    trendScore = 70;
  }
    else {trendScore = 40;}
  }
  
  // Weighted Total
  const probability = (
    (recoveryScore * 0.4) +
    (superScore * 0.2) +
    (consistencyScore * 0.2) +
    (trendScore * 0.2)
  );
  
  return Math.min(100, Math.round(probability));
}
