/**
 * Background AI Fetcher Service
 * Prepares context data and triggers background AI insights fetching via service worker
 */

import { swCommunication } from './swCommunication';
import { aiChangeDetector } from './aiChangeDetector';
import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord, StrengthProgression } from '@/types/analytics';
import { InsightType } from './aiCacheManager';
import { logger } from '@/utils/logger';

interface BackgroundFetchContext {
  currentMonthWorkouts: Workout[];
  previousMonthWorkouts: Workout[];
  muscleStatuses: MuscleStatus[];
  personalRecords: PersonalRecord[];
  strengthProgression: StrengthProgression[];
  volumeTrend: Array<{ date: string; totalVolume: number }>;
  metrics: {
    consistencyScore: number;
    workoutCount: number;
    symmetryScore: number;
    focusDistribution: {
      legs: number;
      push: number;
      pull: number;
    };
  };
  previousMetrics: {
    consistencyScore: number;
    workoutCount: number;
  };
  readinessScore: number;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  baseRestInterval?: number;
}

export class BackgroundAIFetcher {
  /**
   * Trigger background fetch for AI insights
   */
  async triggerBackgroundFetch(
    context: BackgroundFetchContext,
    userId?: string,
    insightTypes: InsightType[] = ['progress', 'insights', 'recommendations']
  ): Promise<void> {
    // Check if service worker is available
    const isAvailable = await swCommunication.waitForServiceWorker(2000);
    if (!isAvailable) {
      logger.warn('[Background AI Fetcher] Service worker not available, skipping background fetch');
      return;
    }

    // Generate fingerprint for caching
    const fingerprint = aiChangeDetector.getFingerprint(
      context.currentMonthWorkouts,
      context.muscleStatuses,
      context.metrics.consistencyScore,
      context.personalRecords
    );

    // Get API key from environment
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Prepare context data for service worker
    // Note: We need to serialize the data properly for SW
    const swContext = {
      currentMonthWorkouts: this.serializeWorkouts(context.currentMonthWorkouts),
      previousMonthWorkouts: this.serializeWorkouts(context.previousMonthWorkouts),
      muscleStatuses: this.serializeMuscleStatuses(context.muscleStatuses),
      personalRecords: this.serializePersonalRecords(context.personalRecords),
      strengthProgression: this.serializeStrengthProgression(context.strengthProgression),
      volumeTrend: context.volumeTrend,
      metrics: context.metrics,
      previousMetrics: context.previousMetrics,
      readinessScore: context.readinessScore,
      userLevel: context.userLevel,
      baseRestInterval: context.baseRestInterval,
    };

    // Send request to service worker
    await swCommunication.requestBackgroundFetch(
      swContext,
      fingerprint,
      insightTypes,
      userId,
      apiKey
    );
  }

  /**
   * Serialize workouts for service worker (convert dates to strings)
   */
  private serializeWorkouts(workouts: Workout[]): Array<Record<string, unknown>> {
    return workouts.map((workout) => ({
      ...workout,
      date: workout.date instanceof Date ? workout.date.toISOString() : workout.date,
      exercises: workout.exercises?.map((ex) => ({
        ...ex,
        timestamp: ex.timestamp instanceof Date ? ex.timestamp.toISOString() : ex.timestamp,
      })),
    }));
  }

  /**
   * Serialize muscle statuses for service worker
   */
  private serializeMuscleStatuses(muscleStatuses: MuscleStatus[]): Array<Record<string, unknown>> {
    return muscleStatuses.map((status) => ({
      ...status,
      lastWorked: status.lastWorked instanceof Date 
        ? status.lastWorked.toISOString() 
        : status.lastWorked,
    }));
  }

  /**
   * Serialize personal records for service worker
   */
  private serializePersonalRecords(records: PersonalRecord[]): Array<Record<string, unknown>> {
    return records.map((record) => ({
      ...record,
      date: record.date instanceof Date ? record.date.toISOString() : record.date,
    }));
  }

  /**
   * Serialize strength progression for service worker
   */
  private serializeStrengthProgression(progression: StrengthProgression[]): Array<Record<string, unknown>> {
    return progression.map((prog) => ({
      ...prog,
      dataPoints: prog.dataPoints.map((dp) => ({
        ...dp,
        date: dp.date,
      })),
    }));
  }
}

export const backgroundAIFetcher = new BackgroundAIFetcher();

