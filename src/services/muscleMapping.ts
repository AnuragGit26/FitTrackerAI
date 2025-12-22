import { MuscleGroup } from '@/types/muscle';

export interface ExerciseMuscleMapping {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  intensity: 'high' | 'medium' | 'low';
}

export const exerciseMuscleMap: Record<string, ExerciseMuscleMapping> = {
  'Barbell Bench Press': {
    primary: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondary: [MuscleGroup.TRICEPS],
    intensity: 'high',
  },
  'Dumbbell Bench Press': {
    primary: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondary: [MuscleGroup.TRICEPS],
    intensity: 'high',
  },
  'Push-ups': {
    primary: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondary: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    intensity: 'medium',
  },
  'Barbell Deadlift': {
    primary: [MuscleGroup.BACK, MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondary: [MuscleGroup.LOWER_BACK, MuscleGroup.TRAPS, MuscleGroup.FOREARMS],
    intensity: 'high',
  },
  'Barbell Row': {
    primary: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondary: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    intensity: 'high',
  },
  'Pull-ups': {
    primary: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondary: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    intensity: 'high',
  },
  'Overhead Press': {
    primary: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondary: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    intensity: 'high',
  },
  'Lateral Raises': {
    primary: [MuscleGroup.SIDE_DELTS],
    secondary: [MuscleGroup.FRONT_DELTS],
    intensity: 'medium',
  },
  'Barbell Squat': {
    primary: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondary: [MuscleGroup.HAMSTRINGS, MuscleGroup.LOWER_BACK, MuscleGroup.ABS],
    intensity: 'high',
  },
  'Romanian Deadlift': {
    primary: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondary: [MuscleGroup.LOWER_BACK],
    intensity: 'high',
  },
  'Leg Press': {
    primary: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondary: [MuscleGroup.HAMSTRINGS],
    intensity: 'medium',
  },
  'Walking Lunges': {
    primary: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondary: [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    intensity: 'medium',
  },
  'Barbell Bicep Curl': {
    primary: [MuscleGroup.BICEPS],
    secondary: [MuscleGroup.FOREARMS],
    intensity: 'medium',
  },
  'Tricep Dips': {
    primary: [MuscleGroup.TRICEPS],
    secondary: [MuscleGroup.FRONT_DELTS],
    intensity: 'high',
  },
  'Close-Grip Bench Press': {
    primary: [MuscleGroup.TRICEPS],
    secondary: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    intensity: 'high',
  },
  'Plank': {
    primary: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondary: [MuscleGroup.LOWER_BACK],
    intensity: 'low',
  },
  'Russian Twists': {
    primary: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondary: [],
    intensity: 'low',
  },
  'Running': {
    primary: [MuscleGroup.QUADS, MuscleGroup.CALVES],
    secondary: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    intensity: 'medium',
  },
  'Rowing Machine': {
    primary: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondary: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.BICEPS],
    intensity: 'medium',
  },
};

export function getMuscleMapping(exerciseName: string): ExerciseMuscleMapping | null {
  return exerciseMuscleMap[exerciseName] || null;
}

export function getAllMusclesForExercise(exerciseName: string): MuscleGroup[] {
  const mapping = getMuscleMapping(exerciseName);
  if (!mapping) return [];
  return [...mapping.primary, ...mapping.secondary];
}

