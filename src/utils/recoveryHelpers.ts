import { MuscleStatus } from '@/types/muscle';
import { subDays, differenceInHours } from 'date-fns';
import { DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { SleepLog } from '@/types/sleep';
import { calculateAdjustedRecoveryHours } from '@/services/recoveryCalculator';

export type ReadinessStatus = 'ready' | 'recovering' | 'needs_rest';

export interface RecoveryTrend {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
}

export interface RecoveryInsight {
  type: 'warning' | 'recommendation' | 'info';
  message: string;
  muscles?: string[];
}

/**
 * Calculate overall recovery score as average of all muscle groups
 */
export function calculateOverallRecoveryScore(muscleStatuses: MuscleStatus[]): number {
  if (muscleStatuses.length === 0) return 100;
  
  const total = muscleStatuses.reduce((sum, status) => {
    const val = status.recoveryPercentage;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const average = isNaN(total / muscleStatuses.length) ? 100 : Math.round(total / muscleStatuses.length);
  return isNaN(average) ? 100 : average;
}

/**
 * Calculate recovery trend by comparing current recovery with 7 days ago
 */
export function calculateRecoveryTrend(
  muscleStatuses: MuscleStatus[],
  userLevel: 'beginner' | 'intermediate' | 'advanced',
  baseRestInterval: number
): RecoveryTrend {
  if (muscleStatuses.length === 0) {
    return {
      current: 100,
      previous: 100,
      change: 0,
      changePercentage: 0,
    };
  }

  const current = calculateOverallRecoveryScore(muscleStatuses);
  const sevenDaysAgo = subDays(new Date(), 7);
  
  let totalRecovery7DaysAgo = 0;
  let count = 0;

  muscleStatuses.forEach((status) => {
    if (!status.lastWorked) {
      totalRecovery7DaysAgo += 100;
      count++;
      return;
    }

    const lastWorked = status.lastWorked instanceof Date 
      ? status.lastWorked 
      : new Date(status.lastWorked);

    const hoursSinceWorkout7DaysAgo = differenceInHours(sevenDaysAgo, lastWorked);
    
    if (hoursSinceWorkout7DaysAgo < 0) {
      totalRecovery7DaysAgo += status.recoveryPercentage;
      count++;
      return;
    }

    const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
    let baseRecoveryHours = 48;
    
    if (userLevel === 'beginner') {
      baseRecoveryHours = (recoverySettings.beginnerRestDays[status.muscle] || 2) * 24;
    } else if (userLevel === 'intermediate') {
      baseRecoveryHours = (recoverySettings.intermediateRestDays[status.muscle] || 2) * 24;
    } else {
      baseRecoveryHours = (recoverySettings.advancedRestDays[status.muscle] || 1) * 24;
    }

    if (baseRestInterval !== undefined) {
      const defaultBase = 48;
      const ratio = baseRestInterval / defaultBase;
      baseRecoveryHours = baseRecoveryHours * ratio;
    }

    const workloadMultiplier = 1 + (status.workloadScore / 100);
    const adjustedRecoveryHours = baseRecoveryHours * workloadMultiplier;

    // Safety check for division by zero or invalid values
    if (!adjustedRecoveryHours || isNaN(adjustedRecoveryHours)) {
      totalRecovery7DaysAgo += 100; // Assume fully recovered if calc fails
      count++;
      return;
    }

    const recovery7DaysAgo = Math.min(
      100,
      Math.max(0, (hoursSinceWorkout7DaysAgo / adjustedRecoveryHours) * 100)
    );

    totalRecovery7DaysAgo += isNaN(recovery7DaysAgo) ? 100 : recovery7DaysAgo;
    count++;
  });

  const previous = count > 0 ? Math.round(totalRecovery7DaysAgo / count) : current;
  const change = current - previous;
  let changePercentage = previous > 0 
    ? Math.round((change / previous) * 100) 
    : (current > 0 ? 100 : 0);
    
  if (isNaN(changePercentage)) changePercentage = 0;

  return {
    current,
    previous,
    change,
    changePercentage,
  };
}

/**
 * Determine readiness status based on overall recovery score
 */
export function getReadinessStatus(overallScore: number): ReadinessStatus {
  if (overallScore >= 75) return 'ready';
  if (overallScore >= 50) return 'recovering';
  return 'needs_rest';
}

/**
 * Get top muscles by status (ready to train or needing rest)
 */
export function getTopMusclesByStatus(
  muscleStatuses: MuscleStatus[],
  count: number = 6,
  filterBy: 'ready' | 'needs_rest' | 'all' = 'all'
): MuscleStatus[] {
  if (muscleStatuses.length === 0) return [];

  let filtered = [...muscleStatuses];

  if (filterBy === 'ready') {
    filtered = filtered.filter(s => s.recoveryPercentage >= 75);
    filtered.sort((a, b) => b.recoveryPercentage - a.recoveryPercentage);
  } else if (filterBy === 'needs_rest') {
    filtered = filtered.filter(s => s.recoveryPercentage < 50);
    filtered.sort((a, b) => a.recoveryPercentage - b.recoveryPercentage);
  } else {
    filtered.sort((a, b) => {
      if (a.recoveryPercentage >= 75 && b.recoveryPercentage < 75) return -1;
      if (a.recoveryPercentage < 75 && b.recoveryPercentage >= 75) return 1;
      return b.recoveryPercentage - a.recoveryPercentage;
    });
  }

  return filtered.slice(0, count);
}

/**
 * Generate contextual recovery insights
 */
export function generateRecoveryInsights(muscleStatuses: MuscleStatus[]): RecoveryInsight[] {
  const insights: RecoveryInsight[] = [];

  if (muscleStatuses.length === 0) {
    return insights;
  }

  const overallScore = calculateOverallRecoveryScore(muscleStatuses);
  const overworkedMuscles = muscleStatuses.filter(s => 
    s.recoveryStatus === 'overworked' || s.recoveryStatus === 'sore'
  );
  const readyMuscles = muscleStatuses.filter(s => s.recoveryPercentage >= 75);
  const recoveringMuscles = muscleStatuses.filter(s => 
    s.recoveryPercentage >= 50 && s.recoveryPercentage < 75
  );

  if (overworkedMuscles.length > 0) {
    const muscleNames = overworkedMuscles
      .slice(0, 3)
      .map(s => s.muscle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .join(', ');
    
    insights.push({
      type: 'warning',
      message: `${muscleNames} ${overworkedMuscles.length === 1 ? 'is' : 'are'} under high fatigue. Consider additional rest.`,
      muscles: overworkedMuscles.map(s => s.muscle),
    });
  }

  if (overallScore >= 75 && readyMuscles.length >= 3) {
    const muscleNames = readyMuscles
      .slice(0, 3)
      .map(s => s.muscle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .join(', ');
    
    insights.push({
      type: 'recommendation',
      message: `Great recovery! ${muscleNames} ${readyMuscles.length === 1 ? 'is' : 'are'} ready for intense training.`,
      muscles: readyMuscles.map(s => s.muscle),
    });
  }

  if (recoveringMuscles.length > 0 && overallScore < 75) {
    insights.push({
      type: 'info',
      message: `${recoveringMuscles.length} muscle group${recoveringMuscles.length === 1 ? '' : 's'} still recovering. Light activity recommended.`,
    });
  }

  if (overallScore >= 85 && readyMuscles.length === muscleStatuses.length) {
    insights.push({
      type: 'recommendation',
      message: 'Optimal recovery achieved! All muscle groups are ready for high-intensity training.',
    });
  }

  return insights;
}

/**
 * Calculate 7-day recovery trend data points for chart
 */
export function calculateRecoveryTrendData(
  muscleStatuses: MuscleStatus[],
  userLevel: 'beginner' | 'intermediate' | 'advanced',
  baseRestInterval: number,
  sleepLogs?: SleepLog[]
): Array<{ date: string; recovery: number; day: string }> {
  const daysToShow = 7;
  const dataPoints: Array<{ date: string; recovery: number; day: string }> = [];
  const now = new Date();

  if (muscleStatuses.length === 0) {
    for (let i = daysToShow - 1; i >= 0; i--) {
      const targetDate = subDays(now, i);
      dataPoints.push({
        date: targetDate.toISOString().split('T')[0],
        recovery: Math.max(60, 100 - (i * 2.5)),
        day: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return dataPoints;
  }

  for (let i = daysToShow - 1; i >= 0; i--) {
    const targetDate = subDays(now, i);
    const dayLabel = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

    let totalRecovery = 0;
    let count = 0;

    // Find relevant sleep log for this date if available
    let sleepLog: SleepLog | undefined;
    if (sleepLogs && sleepLogs.length > 0) {
      const targetDateStr = targetDate.toISOString().split('T')[0];
      sleepLog = sleepLogs.find(log => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === targetDateStr;
      });
    }

    muscleStatuses.forEach((status) => {
      if (!status.lastWorked) {
        totalRecovery += 100;
        count++;
        return;
      }

      const lastWorked = status.lastWorked instanceof Date 
        ? status.lastWorked 
        : new Date(status.lastWorked);

      // Handle invalid dates same as null/undefined (fully recovered)
      if (isNaN(lastWorked.getTime())) {
        totalRecovery += 100;
        count++;
        return;
      }

      const hoursSinceWorkout = differenceInHours(targetDate, lastWorked);
      
      if (hoursSinceWorkout < 0) {
        totalRecovery += status.recoveryPercentage;
        count++;
        return;
      }

      const adjustedRecoveryHours = calculateAdjustedRecoveryHours(
        status.muscle,
        status.workloadScore,
        userLevel,
        baseRestInterval,
        sleepLog
      );
      
      const recoveryOnDate = Math.min(
        100,
        Math.max(0, (hoursSinceWorkout / adjustedRecoveryHours) * 100)
      );

      totalRecovery += isNaN(recoveryOnDate) ? 100 : recoveryOnDate;
      count++;
    });

    const avgRecovery = count > 0 ? totalRecovery / count : 85;
    dataPoints.push({
      date: targetDate.toISOString().split('T')[0],
      recovery: Math.round(avgRecovery),
      day: dayLabel,
    });
  }

  return dataPoints;
}

