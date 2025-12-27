import { differenceInHours } from 'date-fns';
import { MuscleGroup, MuscleStatus, RecoveryStatus, DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { SleepLog } from '@/types/sleep';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface RecoveryCalculationParams {
  muscle: MuscleGroup;
  lastWorkout: Date | null;
  workloadScore: number;
  userLevel: ExperienceLevel;
  totalVolumeLast7Days: number;
  trainingFrequency: number;
  baseRestInterval?: number; // Base rest interval in hours from settings (12-72)
  recentSleep?: SleepLog; // Optional recent sleep log to adjust recovery
}

export function calculateRecoveryStatus(params: RecoveryCalculationParams): MuscleStatus {
  const { 
    muscle, 
    lastWorkout, 
    workloadScore, 
    userLevel, 
    totalVolumeLast7Days, 
    trainingFrequency, 
    baseRestInterval,
    recentSleep
  } = params;

  if (!lastWorkout) {
    return {
      muscle,
      lastWorked: null,
      recoveryStatus: 'ready',
      recoveryPercentage: 100,
      workloadScore: 0,
      recommendedRestDays: 0,
      totalVolumeLast7Days: 0,
      trainingFrequency: 0,
    };
  }

  const hoursSinceWorkout = differenceInHours(new Date(), lastWorkout);

  // Get base recovery time based on muscle and experience level
  const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
  
  const adjustedRecoveryHours = calculateAdjustedRecoveryHours(
    muscle,
    workloadScore,
    userLevel,
    baseRestInterval,
    recentSleep
  );

  // Calculate recovery percentage
  const recoveryPercentage = Math.min(
    100,
    Math.max(0, (hoursSinceWorkout / adjustedRecoveryHours) * 100)
  );

  // Determine recovery status
  let recoveryStatus: RecoveryStatus;
  if (recoveryPercentage >= 100) {
    recoveryStatus = 'ready';
  } else if (recoveryPercentage >= 75) {
    recoveryStatus = 'fresh';
  } else if (recoveryPercentage >= 50) {
    recoveryStatus = 'recovering';
  } else if (recoveryPercentage >= 25) {
    recoveryStatus = 'sore';
  } else {
    recoveryStatus = 'overworked';
  }

  // Check for overtraining
  if (totalVolumeLast7Days > recoverySettings.overtrainingThreshold * 1000) {
    recoveryStatus = 'overworked';
  }

  const remainingHours = Math.max(0, adjustedRecoveryHours - hoursSinceWorkout);
  const recommendedRestDays = Math.ceil(remainingHours / 24);

  return {
    muscle,
    lastWorked: lastWorkout,
    recoveryStatus,
    recoveryPercentage: Math.round(recoveryPercentage),
    workloadScore,
    recommendedRestDays,
    totalVolumeLast7Days,
    trainingFrequency,
  };
}

export function calculateAdjustedRecoveryHours(
  muscle: MuscleGroup,
  workloadScore: number,
  userLevel: ExperienceLevel,
  baseRestInterval?: number,
  sleepLog?: SleepLog
): number {
  const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
  let baseRecoveryHours = 48;

  if (userLevel === 'beginner') {
    baseRecoveryHours = (recoverySettings.beginnerRestDays[muscle] || 2) * 24;
  } else if (userLevel === 'intermediate') {
    baseRecoveryHours = (recoverySettings.intermediateRestDays[muscle] || 2) * 24;
  } else {
    baseRecoveryHours = (recoverySettings.advancedRestDays[muscle] || 1) * 24;
  }

  if (baseRestInterval !== undefined) {
    const defaultBase = 48;
    const ratio = baseRestInterval / defaultBase;
    baseRecoveryHours = baseRecoveryHours * ratio;
  }

  const workloadMultiplier = 1 + (workloadScore / 100);
  let adjustedRecoveryHours = baseRecoveryHours * workloadMultiplier;

  if (sleepLog) {
    let sleepMultiplier = 1.0;
    
    // Quality adjustment
    if (sleepLog.quality <= 4) {
      sleepMultiplier += 0.1 + ((5 - sleepLog.quality) * 0.05);
    } else if (sleepLog.quality >= 8) {
      sleepMultiplier -= 0.1 + ((sleepLog.quality - 7) * 0.05);
    }

    // Duration adjustment
    const durationHours = sleepLog.duration / 60;
    if (durationHours < 6) {
      sleepMultiplier += 0.15;
    } else if (durationHours < 7) {
      sleepMultiplier += 0.05;
    } else if (durationHours > 9) {
      sleepMultiplier -= 0.05;
    }

    sleepMultiplier = Math.max(0.7, Math.min(1.3, sleepMultiplier));
    adjustedRecoveryHours = adjustedRecoveryHours * sleepMultiplier;
  }

  return adjustedRecoveryHours;
}

export function getRecoveryColor(status: RecoveryStatus): string {
  switch (status) {
    case 'ready':
    case 'fresh':
      return '#10b981'; // green
    case 'recovering':
      return '#f59e0b'; // yellow
    case 'sore':
      return '#f97316'; // orange
    case 'overworked':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

export function calculateWorkloadScore(
  volume: number,
  intensity: 'high' | 'medium' | 'low',
  rpe?: number
): number {
  const intensityMultiplier = {
    high: 1.5,
    medium: 1.0,
    low: 0.5,
  };

  const baseScore = volume * intensityMultiplier[intensity];
  
  // Adjust for RPE if provided (higher RPE = more fatigue)
  const rpeMultiplier = rpe ? 1 + (rpe - 5) / 10 : 1;
  
  return Math.round(baseScore * rpeMultiplier);
}

