import { Workout } from './workout';
import { WorkoutExercise, WorkoutSet } from './exercise';
import { MuscleGroup } from './muscle';

export interface SessionComparison {
  duration: {
    current: number; // minutes
    previous?: number;
    change?: number; // minutes
    changePercent?: number;
  };
  volume: {
    current: number;
    previous?: number;
    change?: number;
    changePercent?: number;
  };
  rpe: {
    current: number;
    previous?: number;
    change?: number;
  };
  intensity: {
    current: number; // 0-100 percentage
    previous?: number;
    change?: number;
  };
}

export interface MuscleDistribution {
  muscle: MuscleGroup;
  volume: number;
  percentage: number;
  changePercent?: number; // vs previous workout
}

export interface FocusArea {
  type: 'push' | 'pull' | 'legs' | 'balanced';
  percentage: number;
  volumeChange?: number;
}

export interface ExerciseTrend {
  exerciseId: string;
  exerciseName: string;
  dataPoints: Array<{
    date: Date;
    volume: number;
    maxWeight?: number;
    maxReps?: number;
  }>;
  currentVolume: number;
  previousVolume?: number;
  changePercent?: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  sparklineData: number[]; // Normalized values 0-100 for sparkline
}

export interface SetComparison {
  setNumber: number;
  previous?: {
    weight?: number;
    reps?: number;
    rpe?: number;
    volume?: number;
  };
  current: {
    weight?: number;
    reps?: number;
    rpe?: number;
    volume?: number;
  };
  delta?: {
    weight?: number;
    reps?: number;
    volume?: number;
  };
}

export interface ExerciseComparison {
  exerciseId: string;
  exerciseName: string;
  currentSets: WorkoutSet[];
  previousSets?: WorkoutSet[];
  setComparisons: SetComparison[];
  currentVolume: number;
  previousVolume?: number;
  volumeChange?: number;
  estimated1RM?: number;
  bestSet?: {
    weight?: number;
    reps?: number;
    volume?: number;
  };
}

export interface PersonalRecord {
  type: '1rm' | 'volume' | 'reps' | 'weight' | 'time' | 'rest';
  exerciseId?: string;
  exerciseName?: string;
  value: number;
  unit?: string;
  previousValue?: number;
  workoutId: string;
  date: Date;
}

export interface WorkoutRating {
  score: number; // 0-10
  tier: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier' | 'D-Tier';
  factors: {
    volume: number; // 0-10 contribution
    intensity: number; // 0-10 contribution
    consistency: number; // 0-10 contribution
    progression: number; // 0-10 contribution
  };
  summary: string;
}

export interface AIInsight {
  type: 'recovery' | 'progression' | 'volume' | 'muscle' | 'general';
  title: string;
  message: string;
  recommendation?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RecoveryLogData {
  mood?: 'drained' | 'okay' | 'energized';
  predictedSoreness?: number; // 0-100
}

export interface WorkoutSummaryData {
  workout: Workout;
  sessionComparison: SessionComparison;
  muscleDistribution: MuscleDistribution[];
  focusArea: FocusArea;
  exerciseComparisons: ExerciseComparison[];
  exerciseTrends: ExerciseTrend[];
  personalRecords: PersonalRecord[];
  workoutRating: WorkoutRating;
  aiInsights: AIInsight[];
  recoveryLog?: RecoveryLogData;
  previousWorkout?: Workout;
}

