import { MuscleGroup } from './muscle';
import { SleepMetrics, RecoveryMetrics } from './sleep';

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxReps: number;
  date: Date;
  workoutId: number;
}

export interface VolumeData {
  date: string;
  totalVolume: number;
  volumeByMuscle: Partial<Record<MuscleGroup, number>>;
}

export interface StrengthProgression {
  exerciseId: string;
  exerciseName: string;
  dataPoints: Array<{
    date: string;
    maxWeight: number;
    maxReps: number;
    totalVolume: number;
  }>;
}

export interface MuscleBalance {
  muscle: MuscleGroup;
  volume: number;
  percentage: number;
  recommendedVolume: number;
  status: 'balanced' | 'under-trained' | 'over-trained';
}

export interface WorkoutFrequency {
  date: string;
  count: number;
  totalVolume: number;
}

export interface PerformanceMetrics {
  totalWorkouts: number;
  totalVolume: number;
  averageDuration: number;
  consistencyScore: number;
  currentStreak: number;
  longestStreak: number;
}

export interface AnalyticsMetrics {
  totalVolume: number;
  workoutCount: number;
  currentStreak: number;
  consistencyScore: number;
  volumeTrend: VolumeData[];
  personalRecords: PersonalRecord[];
  strengthProgression: StrengthProgression[];
  muscleVolume: Map<MuscleGroup, number>;
  focusDistribution: {
    legs: number;
    push: number;
    pull: number;
  };
  symmetryScore: number;
  totalCalories?: number;
  averageCalories?: number;
  caloriesTrend?: Array<{ date: string; calories: number }>;
  sleepMetrics?: SleepMetrics;
  recoveryMetrics?: RecoveryMetrics;
}

