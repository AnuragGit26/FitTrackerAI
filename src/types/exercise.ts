import { MuscleGroup } from './muscle';

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'olympic' | 'plyometric';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type WeightUnit = 'kg' | 'lbs';
export type ExerciseTrackingType = 'weight_reps' | 'reps_only' | 'cardio' | 'duration';
export type DistanceUnit = 'km' | 'miles';

export interface ExerciseAdvancedDetails {
  description?: string;
  instructions?: string[];
  tips?: string[];
  commonMistakes?: string[];
  variations?: string[];
  anatomyImageUrl?: string; // URL to human anatomy image from StrengthLog
  cachedAt: number; // timestamp
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: string[];
  difficulty: Difficulty;
  instructions: string[];
  videoUrl?: string;
  isCustom: boolean;
  trackingType: ExerciseTrackingType;
  anatomyImageUrl?: string; // URL to human anatomy image from StrengthLog
  strengthlogUrl?: string; // Link to StrengthLog exercise page
  strengthlogSlug?: string; // Slug for StrengthLog exercise (e.g., 'dumbbell-incline-press')
  advancedDetails?: ExerciseAdvancedDetails; // Cached advanced info
  muscleCategory?: string; // Muscle category for filtering (e.g., "Chest", "Shoulder", "Deltoid")
  userId?: string; // User ID for custom exercises
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

export interface WorkoutSet {
  setNumber: number;
  // For weight_reps tracking
  reps?: number;
  weight?: number;
  unit?: WeightUnit;
  // For cardio tracking
  distance?: number;
  distanceUnit?: DistanceUnit;
  time?: number; // in seconds
  calories?: number;
  steps?: number; // optional steps count for cardio activities
  // For duration tracking
  duration?: number; // in seconds
  // Common fields
  rpe?: number; // Rate of Perceived Exertion (1-10)
  restTime?: number; // seconds - actual rest time taken
  completed: boolean;
  notes?: string;
  // Set duration tracking
  setDuration?: number; // Duration of the set in seconds
  setStartTime?: Date; // When the set started
  setEndTime?: Date; // When the set completed
  // For cardio/HIIT tracking
  heartRate?: number; // Heart rate in BPM
  pace?: number; // Calculated pace (seconds per km/mile)
  // For HIIT tracking
  workDuration?: number; // Work duration in seconds (for HIIT)
  rounds?: number; // Number of rounds (for HIIT)
  intensityLevel?: 'low' | 'moderate' | 'high' | 'max'; // Intensity level (for HIIT)
  // For yoga/flexibility tracking
  focusAreas?: string[]; // Focus areas (e.g., Flexibility, Strength, Balance, Meditation)
  breathWorkType?: string; // Type of breath work (e.g., Breath holds, Pranayama)
}

export type ExerciseGroupType = 'single' | 'superset' | 'circuit';

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  totalVolume: number; // sets × reps × weight
  musclesWorked: MuscleGroup[];
  timestamp: Date;
  notes?: string;
  // Tracking type for accurate volume calculations
  trackingType?: ExerciseTrackingType; // Type of exercise tracking (weight_reps, reps_only, cardio, duration)
  // Superset/Circuit grouping
  groupType?: ExerciseGroupType; // Type of grouping (single, superset, circuit)
  groupId?: string; // ID to group exercises together (exercises with same groupId are grouped)
  groupOrder?: number; // Order within the group (0 = first exercise in group)
}

