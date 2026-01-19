import { MuscleGroup } from './muscle';

export interface BreakthroughInsight {
  exercise: string;
  projectedWeight: number;
  improvementPercent: number;
  reason: string;
  velocityTrend?: number;
}

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  muscleGroup?: MuscleGroup;
  actionLabel?: string;
  actionHandler?: () => void;
  imageUrl?: string;
}

export interface Recommendation {
  id: string;
  type: 'deload' | 'sleep' | 'nutrition' | 'workout';
  title: string;
  description: string;
  actionLabel?: string;
  actionHandler?: () => void;
  dismissable?: boolean;
}

export interface TrainingPattern {
  id: string;
  type: 'sleep' | 'caffeine' | 'timing' | 'other';
  title: string;
  description: string;
  impact: string;
  icon?: string;
}

export interface NutritionEvent {
  id: string;
  time: string;
  relativeTime: string;
  title: string;
  description: string;
  type: 'protein' | 'carb' | 'meal' | 'supplement';
  icon?: string;
}

export interface ProgressionPhase {
  day: number;
  workoutType: 'push' | 'pull' | 'legs' | 'cardio' | 'rest';
  intensity: 'low' | 'medium' | 'high';
  volumeTarget: number;
  exercises: string[];
  recoveryTarget: number;
}

export interface ProgressionPlan {
  id: string;
  duration: number; // days
  phases: ProgressionPhase[];
  periodization: 'linear' | 'undulating' | 'block';
}

export interface RecoveryPrediction {
  date: string;
  dayLabel: string;
  workoutType: 'push' | 'pull' | 'legs' | 'rest';
  recoveryPercentage: number;
  prPotential?: string[];
  fatigueWarnings?: string[];
  fatigueAccumulation?: number;
  supercompensationScore?: number;
  prProbability?: number; // 0-100
  volumePrediction?: number;
}

export interface WorkoutRecommendation {
  id: string;
  name: string;
  description: string;
  duration: number;
  intensity: 'low' | 'medium' | 'high';
  muscleGroups: MuscleGroup[];
  reason: string;
  imageUrl?: string;
}

export interface CorrectiveExercise {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  targetMuscle: MuscleGroup;
  reason: string;
  category: 'imbalance' | 'posture' | 'weakness' | 'mobility';
}

export interface MuscleImbalance {
  muscle: MuscleGroup;
  leftVolume: number;
  rightVolume: number;
  imbalancePercent: number;
  status: 'balanced' | 'imbalanced';
}

export interface ProgressAnalysis {
  breakthrough?: BreakthroughInsight;
  consistencyScore: number;
  consistencyChange: number;
  workoutCount: number;
  workoutCountChange: number;
  volumeTrend: {
    current: number;
    previous: number;
    changePercent: number;
    weeklyData: Array<{ week: string; volume: number }>;
  };
  plateaus: Array<{
    exercise: string;
    weight: number;
    weeksStuck: number;
    suggestion: string;
  }>;
  formChecks: Array<{
    exercise: string;
    issue: string;
    muscleGroup: MuscleGroup;
    imageUrl?: string;
  }>;
  trainingPatterns: TrainingPattern[];
}

export interface SmartAlerts {
  readinessScore: number;
  readinessStatus: 'optimal' | 'good' | 'moderate' | 'low';
  readinessMessage: string;
  criticalAlerts: Alert[];
  suggestions: Recommendation[];
  nutritionEvents: NutritionEvent[];
}

export interface WorkoutRecommendations {
  readinessScore: number;
  readinessStatus: string;
  recommendedWorkout?: WorkoutRecommendation;
  progressionPlan?: ProgressionPlan;
  muscleBalance: {
    imbalances: MuscleImbalance[];
    overallScore: number;
  };
  correctiveExercises: CorrectiveExercise[];
  recoveryPredictions: RecoveryPrediction[];
}

