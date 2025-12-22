import { MuscleGroup } from './muscle';

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

