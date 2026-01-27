import { Workout } from '@/types/workout';
import { SupersetGroup, supersetService } from './supersetService';

export interface SupersetAnalytics {
  totalGroups: number;
  averageGroupSize: number;
  mostCommonPairings: Array<{
    exercises: string[];
    frequency: number;
  }>;
  averageRestTime: number;
  volumeTrend: Array<{
    date: string;
    volume: number;
  }>;
  timeEfficiency: number; // Volume per minute
}

export const supersetAnalyticsService = {
  /**
   * Analyze superset performance from workouts
   */
  analyzeSupersetPerformance(workouts: Workout[]): SupersetAnalytics {
    const allGroups: SupersetGroup[] = [];
    const restTimes: number[] = [];
    const volumes: Array<{ date: string; volume: number }> = [];

    workouts.forEach((workout) => {
      const groups = supersetService.getAllGroups(workout.exercises);
      groups.forEach((group) => {
        allGroups.push(group);
        if (group.restTime) {
          restTimes.push(group.restTime);
        }

        const groupVolume = supersetService.calculateGroupVolume(group);
        volumes.push({
          date: new Date(workout.date).toLocaleDateString(),
          volume: groupVolume,
        });
      });
    });

    // Calculate most common pairings
    const pairingMap = new Map<string, number>();
    allGroups.forEach((group) => {
      const exerciseNames = group.exercises
        .map((ex) => ex.exerciseName)
        .sort()
        .join(' + ');
      pairingMap.set(
        exerciseNames,
        (pairingMap.get(exerciseNames) || 0) + 1
      );
    });

    const mostCommonPairings = Array.from(pairingMap.entries())
      .map(([exercises, frequency]) => ({
        exercises: exercises.split(' + '),
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const averageRestTime =
      restTimes.length > 0
        ? restTimes.reduce((sum, time) => sum + time, 0) / restTimes.length
        : 0;

    const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0);
    const totalTime = workouts.reduce((sum, w) => sum + w.totalDuration, 0);
    const timeEfficiency = totalTime > 0 ? totalVolume / totalTime : 0;

    return {
      totalGroups: allGroups.length,
      averageGroupSize:
        allGroups.length > 0
          ? allGroups.reduce((sum, g) => sum + g.exercises.length, 0) /
            allGroups.length
          : 0,
      mostCommonPairings,
      averageRestTime,
      volumeTrend: volumes,
      timeEfficiency,
    };
  },

  /**
   * Suggest optimal rest times
   */
  suggestOptimalRestTime(
    group: SupersetGroup,
    _historicalData?: SupersetGroup[]
  ): number {
    // Default suggestions based on group type
    if (group.groupType === 'circuit') {
      return 60; // 1 minute for circuits
    }

    // For supersets, suggest based on exercise intensity
    // Heavy compound movements: 90-120s
    // Isolation: 60-90s
    return 90; // Default 90 seconds
  },

  /**
   * Recommend exercise pairings
   */
  recommendPairings(
    currentExercise: string,
    historicalGroups: SupersetGroup[]
  ): string[] {
    const pairingCounts = new Map<string, number>();

    historicalGroups.forEach((group) => {
      const hasCurrent = group.exercises.some(
        (ex) => ex.exerciseName === currentExercise
      );
      if (hasCurrent) {
        group.exercises.forEach((ex) => {
          if (ex.exerciseName !== currentExercise) {
            pairingCounts.set(
              ex.exerciseName,
              (pairingCounts.get(ex.exerciseName) || 0) + 1
            );
          }
        });
      }
    });

    return Array.from(pairingCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([exercise]) => exercise);
  },
};

