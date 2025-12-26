import { Workout } from '@/types/workout';
import { SupersetGroup } from './supersetService';
import { supersetService } from './supersetService';
import { supersetAnalyticsService } from './supersetAnalyticsService';

export interface SupersetInsight {
  type: 'recommendation' | 'warning' | 'success';
  title: string;
  message: string;
  action?: string;
}

export const supersetInsightsService = {
  /**
   * Analyze superset patterns
   */
  analyzePatterns(workouts: Workout[]): {
    mostCommonPairings: Array<{ exercises: string[]; count: number }>;
    mostEffectiveCombinations: Array<{ exercises: string[]; avgVolume: number }>;
  } {
    const allGroups: SupersetGroup[] = [];
    workouts.forEach((workout) => {
      const groups = supersetService.getAllGroups(workout.exercises);
      groups.forEach((group) => allGroups.push(group));
    });

    const pairingMap = new Map<string, number>();
    const volumeMap = new Map<string, { total: number; count: number }>();

    allGroups.forEach((group) => {
      const exerciseIds = group.exercises
        .map((ex) => ex.exerciseId)
        .sort()
        .join(',');
      
      pairingMap.set(exerciseIds, (pairingMap.get(exerciseIds) || 0) + 1);
      
      const volume = supersetService.calculateGroupVolume(group);
      const existing = volumeMap.get(exerciseIds);
      if (existing) {
        volumeMap.set(exerciseIds, {
          total: existing.total + volume,
          count: existing.count + 1,
        });
      } else {
        volumeMap.set(exerciseIds, { total: volume, count: 1 });
      }
    });

    const mostCommonPairings = Array.from(pairingMap.entries())
      .map(([ids, count]) => ({
        exercises: ids.split(','),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostEffectiveCombinations = Array.from(volumeMap.entries())
      .map(([ids, data]) => ({
        exercises: ids.split(','),
        avgVolume: data.total / data.count,
      }))
      .sort((a, b) => b.avgVolume - a.avgVolume)
      .slice(0, 5);

    return {
      mostCommonPairings,
      mostEffectiveCombinations,
    };
  },

  /**
   * Generate recommendations
   */
  generateRecommendations(
    workouts: Workout[],
    currentGroup?: SupersetGroup
  ): SupersetInsight[] {
    const insights: SupersetInsight[] = [];
    const analytics = supersetAnalyticsService.analyzeSupersetPerformance(
      workouts
    );

    // Rest time optimization
    if (currentGroup && currentGroup.restTime) {
      const suggested = supersetAnalyticsService.suggestOptimalRestTime(
        currentGroup
      );
      if (Math.abs(currentGroup.restTime - suggested) > 15) {
        insights.push({
          type: 'recommendation',
          title: 'Rest Time Optimization',
          message: `Try ${suggested}s rest between exercises for better recovery`,
          action: `Set to ${suggested}s`,
        });
      }
    }

    // Volume efficiency
    if (analytics.timeEfficiency > 0) {
      const efficiency = analytics.timeEfficiency;
      if (efficiency < 10) {
        insights.push({
          type: 'warning',
          title: 'Low Volume Efficiency',
          message: 'Consider increasing rest time or reducing exercises per group',
        });
      } else if (efficiency > 20) {
        insights.push({
          type: 'success',
          title: 'Great Efficiency!',
          message: `You're achieving ${efficiency.toFixed(1)} volume units per minute`,
        });
      }
    }

    // Pairing recommendations
    if (currentGroup && currentGroup.exercises.length > 0) {
      const firstExercise = currentGroup.exercises[0];
      const recommendations = supersetAnalyticsService.recommendPairings(
        firstExercise.exerciseName,
        []
      );
      if (recommendations.length > 0) {
        insights.push({
          type: 'recommendation',
          title: 'Suggested Pairings',
          message: `Try pairing with: ${recommendations.join(', ')}`,
        });
      }
    }

    return insights;
  },

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics(group: SupersetGroup, duration: number): {
    volumePerMinute: number;
    recoveryEfficiency: number;
    timeSavings: number; // vs single exercises
  } {
    const totalVolume = supersetService.calculateGroupVolume(group);
    const volumePerMinute = duration > 0 ? totalVolume / duration : 0;

    // Estimate time if exercises were done separately
    const estimatedSingleTime = group.exercises.length * 5; // 5 min per exercise
    const timeSavings = estimatedSingleTime - duration;

    // Recovery efficiency (higher is better)
    const recoveryEfficiency = group.restTime
      ? (totalVolume / group.restTime) * 100
      : 0;

    return {
      volumePerMinute,
      recoveryEfficiency,
      timeSavings,
    };
  },

  /**
   * Track trends
   */
  trackTrends(workouts: Workout[]): {
    usageOverTime: Array<{ date: string; count: number }>;
    performanceImprovements: number; // percentage
    restTimeTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const usageMap = new Map<string, number>();
    const restTimes: number[] = [];

    workouts.forEach((workout) => {
      const date = new Date(workout.date).toLocaleDateString();
      const groups = supersetService.getAllGroups(workout.exercises);
      usageMap.set(date, (usageMap.get(date) || 0) + groups.size);
      groups.forEach((group) => {
        if (group.restTime) {
          restTimes.push(group.restTime);
        }
      });
    });

    const usageOverTime = Array.from(usageMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate rest time trend
    let restTimeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (restTimes.length >= 2) {
      const firstHalf = restTimes.slice(0, Math.floor(restTimes.length / 2));
      const secondHalf = restTimes.slice(Math.floor(restTimes.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      if (Math.abs(diff) < 5) {
        restTimeTrend = 'stable';
      } else {
        restTimeTrend = diff > 0 ? 'increasing' : 'decreasing';
      }
    }

    // Calculate performance improvements (simplified)
    const performanceImprovements = 0; // TODO: Implement based on volume trends

    return {
      usageOverTime,
      performanceImprovements,
      restTimeTrend,
    };
  },
};

