import { MuscleGroup } from './muscle';
import { WorkoutExercise } from './exercise';

export type WorkoutMood = 'great' | 'good' | 'okay' | 'tired' | 'exhausted';

export interface Workout {
  id?: string;
  userId: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  exercises: WorkoutExercise[];
  totalDuration: number; // minutes
  totalVolume: number;
  calories?: number; // calories burned during workout
  notes?: string;
  musclesTargeted: MuscleGroup[];
  workoutType: string;
  mood?: WorkoutMood;
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

export type TemplateCategory = 'strength' | 'hypertrophy' | 'cardio' | 'home' | 'flexibility';
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  category: TemplateCategory;
  description?: string;
  imageUrl?: string;
  difficulty?: TemplateDifficulty;
  daysPerWeek?: number;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    weight?: number;
    restTime?: number;
    setData?: Array<{
      reps?: number;
      weight?: number;
      unit?: 'kg' | 'lbs';
      distance?: number;
      distanceUnit?: 'km' | 'miles';
      time?: number;
      calories?: number;
      duration?: number;
      rpe?: number; // Rate of Perceived Exertion (1-10)
    }>;
  }>;
  estimatedDuration: number;
  musclesTargeted: MuscleGroup[];
  isFeatured?: boolean;
  isTrending?: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPercentage?: number; // for AI recommendations
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

export interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight?: number;
  restTime?: number;
}

export interface PlannedWorkout {
  id: string;
  userId: string;
  scheduledDate: Date;
  scheduledTime?: Date;
  templateId?: string;
  workoutName: string;
  category: TemplateCategory;
  estimatedDuration: number;
  exercises: PlannedExercise[];
  musclesTargeted: MuscleGroup[];
  notes?: string;
  isCompleted: boolean;
  completedWorkoutId?: string;
  createdAt: Date;
  updatedAt: Date;
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

