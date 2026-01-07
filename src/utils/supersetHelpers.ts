import { SupersetGroup } from '@/services/supersetService';
import { WorkoutExercise } from '@/types/exercise';

/**
 * Format group data for display
 */
export function formatGroupName(
  groupType: 'superset' | 'circuit',
  position: number,
  total: number
): string {
  const typeName = groupType === 'superset' ? 'Superset' : 'Circuit';
  return `${typeName} ${position} of ${total}`;
}

/**
 * Compare group performance over time
 */
export function compareGroupPerformance(
  currentGroup: SupersetGroup,
  previousGroup?: SupersetGroup
): {
  volumeChange: number;
  volumeChangePercent: number;
  timeChange?: number;
} {
  const currentVolume = currentGroup.exercises.reduce(
    (sum, ex) => sum + ex.totalVolume,
    0
  );

  if (!previousGroup) {
    return {
      volumeChange: currentVolume,
      volumeChangePercent: 0,
    };
  }

  const previousVolume = previousGroup.exercises.reduce(
    (sum, ex) => sum + ex.totalVolume,
    0
  );

  const volumeChange = currentVolume - previousVolume;
  const volumeChangePercent =
    previousVolume > 0 ? (volumeChange / previousVolume) * 100 : 0;

  return {
    volumeChange,
    volumeChangePercent,
  };
}

/**
 * Identify best group combinations
 */
export function identifyBestCombinations(
  groups: SupersetGroup[]
): Array<{
  exercises: string[];
  averageVolume: number;
  frequency: number;
}> {
  const combinationMap = new Map<string, {
    exercises: string[];
    totalVolume: number;
    count: number;
  }>();

  groups.forEach((group) => {
    const exerciseIds = group.exercises
      .map((ex) => ex.exerciseId)
      .sort()
      .join(',');
    
    const existing = combinationMap.get(exerciseIds);
    if (existing) {
      existing.totalVolume += group.exercises.reduce(
        (sum, ex) => sum + ex.totalVolume,
        0
      );
      existing.count++;
    } else {
      combinationMap.set(exerciseIds, {
        exercises: group.exercises.map((ex) => ex.exerciseName),
        totalVolume: group.exercises.reduce(
          (sum, ex) => sum + ex.totalVolume,
          0
        ),
        count: 1,
      });
    }
  });

  return Array.from(combinationMap.entries())
    .map(([_, data]) => ({
      exercises: data.exercises,
      averageVolume: data.totalVolume / data.count,
      frequency: data.count,
    }))
    .sort((a, b) => b.averageVolume - a.averageVolume);
}

/**
 * Check if exercises are compatible for grouping
 */
export function areExercisesCompatible(
  _exercise1: WorkoutExercise,
  _exercise2: WorkoutExercise
): boolean {
  // Basic compatibility check - can be enhanced
  // For now, allow any exercises to be grouped
  return true;
}

