/**
 * Type definitions for service worker
 */

import { Workout } from './workout';
import { MuscleStatus } from './muscle';
import { ProgressAnalysis, SmartAlerts, WorkoutRecommendations } from './insights';
import { PersonalRecord, StrengthProgression } from './analytics';

export interface SyncEvent extends ExtendableEvent {
  tag: string;
}

export interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

export interface AIContext {
  currentMonthWorkouts: Workout[];
  personalRecords: PersonalRecord[];
  strengthProgression: StrengthProgression[];
  volumeTrend: Array<{ date: string; totalVolume: number }>;
  metrics: {
    consistencyScore: number;
    workoutCount: number;
    symmetryScore?: number;
    focusDistribution?: {
      legs: number;
      push: number;
      pull: number;
    };
  };
  previousMetrics: {
    consistencyScore: number;
    workoutCount: number;
  };
  muscleStatuses: MuscleStatus[];
  readinessScore: number;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  baseRestInterval?: number;
}

export type InsightType = 'progress' | 'insights' | 'recommendations';

export interface AIInsightsResults {
  progress?: ProgressAnalysis;
  insights?: SmartAlerts;
  recommendations?: WorkoutRecommendations;
}

export interface AIInsightsErrors {
  [key: string]: string;
}

