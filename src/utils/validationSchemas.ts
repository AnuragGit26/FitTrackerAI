import { z } from 'zod';
import { ExerciseTrackingType } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Weight validation - must be non-negative and within reasonable bounds
 * Note: Allows 0 for bodyweight exercises
 */
export const weightKgSchema = z
  .number({
    required_error: 'Weight is required',
    invalid_type_error: 'Weight must be a number',
  })
  .nonnegative('Weight cannot be negative')
  .max(1000, 'Weight cannot exceed 1000 kg')
  .finite('Weight must be a finite number');

export const weightLbsSchema = z
  .number({
    required_error: 'Weight is required',
    invalid_type_error: 'Weight must be a number',
  })
  .nonnegative('Weight cannot be negative')
  .max(2200, 'Weight cannot exceed 2200 lbs')
  .finite('Weight must be a finite number');

/**
 * Dynamic weight schema based on unit
 */
export const createWeightSchema = (unit: 'kg' | 'lbs') =>
  unit === 'kg' ? weightKgSchema : weightLbsSchema;

/**
 * Positive weight schemas for completed sets (must be > 0)
 */
export const positiveWeightKgSchema = weightKgSchema.positive('Weight must be greater than 0 for completed sets');
export const positiveWeightLbsSchema = weightLbsSchema.positive('Weight must be greater than 0 for completed sets');

/**
 * Dynamic positive weight schema for completed sets
 */
export const createPositiveWeightSchema = (unit: 'kg' | 'lbs') =>
  unit === 'kg' ? positiveWeightKgSchema : positiveWeightLbsSchema;

/**
 * Reps validation - must be positive and reasonable
 */
export const repsSchema = z
  .number({
    required_error: 'Reps are required',
    invalid_type_error: 'Reps must be a number',
  })
  .int('Reps must be a whole number')
  .positive('Reps must be greater than 0')
  .max(500, 'Reps cannot exceed 500')
  .finite('Reps must be a finite number');

/**
 * Distance validation (km)
 */
export const distanceKmSchema = z
  .number({
    required_error: 'Distance is required',
    invalid_type_error: 'Distance must be a number',
  })
  .nonnegative('Distance cannot be negative')
  .max(1000, 'Distance cannot exceed 1000 km')
  .finite('Distance must be a finite number');

/**
 * Distance validation (miles)
 */
export const distanceMilesSchema = z
  .number({
    required_error: 'Distance is required',
    invalid_type_error: 'Distance must be a number',
  })
  .nonnegative('Distance cannot be negative')
  .max(621, 'Distance cannot exceed 621 miles')
  .finite('Distance must be a finite number');

/**
 * Dynamic distance schema based on unit
 */
export const createDistanceSchema = (unit: 'km' | 'miles') =>
  unit === 'km' ? distanceKmSchema : distanceMilesSchema;

/**
 * Duration validation (seconds) - max 24 hours
 */
export const durationSecondsSchema = z
  .number({
    required_error: 'Duration is required',
    invalid_type_error: 'Duration must be a number',
  })
  .nonnegative('Duration cannot be negative')
  .max(86400, 'Duration cannot exceed 24 hours')
  .finite('Duration must be a finite number');

/**
 * Time validation (seconds) - alias for duration
 */
export const timeSecondsSchema = durationSecondsSchema;

/**
 * Calories validation - optional, max 10,000
 */
export const caloriesSchema = z
  .number({
    invalid_type_error: 'Calories must be a number',
  })
  .nonnegative('Calories cannot be negative')
  .max(10000, 'Calories cannot exceed 10,000')
  .finite('Calories must be a finite number')
  .optional();

/**
 * Steps validation - optional, max 100,000
 */
export const stepsSchema = z
  .number({
    invalid_type_error: 'Steps must be a number',
  })
  .int('Steps must be a whole number')
  .nonnegative('Steps cannot be negative')
  .max(100000, 'Steps cannot exceed 100,000')
  .finite('Steps must be a finite number')
  .optional();

/**
 * RPE (Rate of Perceived Exertion) validation - 1 to 10
 */
export const rpeSchema = z
  .number({
    invalid_type_error: 'RPE must be a number',
  })
  .int('RPE must be a whole number')
  .min(1, 'RPE must be at least 1')
  .max(10, 'RPE cannot exceed 10')
  .optional();

/**
 * Heart rate validation - 30 to 220 BPM
 */
export const heartRateSchema = z
  .number({
    invalid_type_error: 'Heart rate must be a number',
  })
  .int('Heart rate must be a whole number')
  .min(30, 'Heart rate must be at least 30 BPM')
  .max(220, 'Heart rate cannot exceed 220 BPM')
  .optional();

/**
 * Rest time validation - 0 to 1 hour (3600 seconds)
 */
export const restTimeSchema = z
  .number({
    invalid_type_error: 'Rest time must be a number',
  })
  .nonnegative('Rest time cannot be negative')
  .max(3600, 'Rest time cannot exceed 1 hour')
  .optional();

// ============================================================================
// TEXT FIELD SCHEMAS
// ============================================================================

/**
 * Name validation (exercises, workouts, templates)
 */
export const nameSchema = z
  .string({
    required_error: 'Name is required',
    invalid_type_error: 'Name must be text',
  })
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters');

/**
 * Notes validation - max 1000 characters
 */
export const notesSchema = z
  .string({
    invalid_type_error: 'Notes must be text',
  })
  .max(1000, 'Notes cannot exceed 1000 characters')
  .optional();

/**
 * Email validation
 */
export const emailSchema = z
  .string({
    required_error: 'Email is required',
  })
  .email('Invalid email address')
  .trim()
  .toLowerCase();

/**
 * Password validation - min 8 characters
 */
export const passwordSchema = z
  .string({
    required_error: 'Password is required',
  })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters');

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

/**
 * Age validation
 */
export const ageSchema = z
  .number({
    required_error: 'Age is required',
    invalid_type_error: 'Age must be a number',
  })
  .int('Age must be a whole number')
  .min(13, 'Age must be at least 13')
  .max(120, 'Age cannot exceed 120');

/**
 * Height validation (cm)
 */
export const heightCmSchema = z
  .number({
    required_error: 'Height is required',
    invalid_type_error: 'Height must be a number',
  })
  .min(50, 'Height must be at least 50 cm')
  .max(300, 'Height cannot exceed 300 cm');

/**
 * Height validation (inches)
 */
export const heightInchesSchema = z
  .number({
    required_error: 'Height is required',
    invalid_type_error: 'Height must be a number',
  })
  .min(20, 'Height must be at least 20 inches')
  .max(120, 'Height cannot exceed 120 inches');

/**
 * Body weight validation (kg)
 */
export const bodyWeightKgSchema = z
  .number({
    required_error: 'Weight is required',
    invalid_type_error: 'Weight must be a number',
  })
  .min(20, 'Weight must be at least 20 kg')
  .max(500, 'Weight cannot exceed 500 kg');

/**
 * Body weight validation (lbs)
 */
export const bodyWeightLbsSchema = z
  .number({
    required_error: 'Weight is required',
    invalid_type_error: 'Weight must be a number',
  })
  .min(44, 'Weight must be at least 44 lbs')
  .max(1100, 'Weight cannot exceed 1100 lbs');

/**
 * Gender validation
 */
export const genderSchema = z.enum(['male', 'female', 'other'], {
  required_error: 'Gender is required',
  invalid_type_error: 'Invalid gender selection',
});

/**
 * Goal validation
 */
export const goalSchema = z.enum(
  ['lose_weight', 'gain_muscle', 'maintain', 'improve_strength', 'improve_endurance'],
  {
    required_error: 'Goal is required',
    invalid_type_error: 'Invalid goal selection',
  }
);

/**
 * Experience level validation
 */
export const experienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'], {
  required_error: 'Experience level is required',
  invalid_type_error: 'Invalid experience level',
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  name: nameSchema,
  age: ageSchema.optional(),
  gender: genderSchema.optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  experienceLevel: experienceLevelSchema.optional(),
  goals: z.array(goalSchema).optional(),
});

// ============================================================================
// WORKOUT SET SCHEMAS
// ============================================================================

/**
 * Base workout set schema (common fields)
 */
const baseSetSchema = z.object({
  setNumber: z.number().int().positive(),
  completed: z.boolean(),
  rpe: rpeSchema,
  restTime: restTimeSchema,
  notes: notesSchema,
  setDuration: durationSecondsSchema.optional(),
  setStartTime: z.date().optional(),
  setEndTime: z.date().optional(),
  heartRate: heartRateSchema,
  // Side tracking fields
  leftReps: repsSchema.optional(),
  rightReps: repsSchema.optional(),
  leftWeight: z.number().nonnegative('Weight cannot be negative').optional(),
  rightWeight: z.number().nonnegative('Weight cannot be negative').optional(),
  leftDistance: z.number().nonnegative('Distance cannot be negative').optional(),
  rightDistance: z.number().nonnegative('Distance cannot be negative').optional(),
  leftDuration: durationSecondsSchema.optional(),
  rightDuration: durationSecondsSchema.optional(),
  sides: z.enum(['left', 'right', 'both']).optional(),
});

/**
 * Weight & Reps set schema
 * Note: Weight can be 0 for bodyweight exercises
 */
export const weightRepsSetSchema = baseSetSchema.extend({
  weight: z.number().nonnegative('Weight cannot be negative').optional(),
  reps: repsSchema.optional(),
  unit: z.enum(['kg', 'lbs']).optional(),
});

/**
 * Reps only set schema
 */
export const repsOnlySetSchema = baseSetSchema.extend({
  reps: repsSchema.optional(),
});

/**
 * Cardio set schema
 */
export const cardioSetSchema = baseSetSchema.extend({
  distance: z.number().nonnegative().optional(),
  distanceUnit: z.enum(['km', 'miles']).optional(),
  time: timeSecondsSchema.optional(),
  duration: durationSecondsSchema.optional(),
  reps: repsSchema.optional(),
  calories: caloriesSchema,
  steps: stepsSchema,
  pace: z.number().positive().optional(),
  intensityLevel: z.enum(['low', 'moderate', 'high', 'max']).optional(),
});

/**
 * Duration set schema
 */
export const durationSetSchema = baseSetSchema.extend({
  duration: durationSecondsSchema.optional(),
});

/**
 * Generic workout set schema (union of all types)
 */
export const workoutSetSchema = z.union([
  weightRepsSetSchema,
  repsOnlySetSchema,
  cardioSetSchema,
  durationSetSchema,
]);

/**
 * Completed set validation - ensures required fields are present
 */
export const createCompletedSetSchema = (trackingType: ExerciseTrackingType, unit: 'kg' | 'lbs') => {
  switch (trackingType) {
    case 'weight_reps':
      return weightRepsSetSchema.extend({
        completed: z.literal(true),
        weight: createPositiveWeightSchema(unit),
        reps: repsSchema,
      });
    case 'reps_only':
      return repsOnlySetSchema.extend({
        completed: z.literal(true),
        reps: repsSchema,
      });
    case 'cardio':
      return cardioSetSchema.extend({
        completed: z.literal(true),
      });
    case 'duration':
      return durationSetSchema.extend({
        completed: z.literal(true),
        duration: durationSecondsSchema,
      });
    default:
      return baseSetSchema;
  }
};

// ============================================================================
// WORKOUT EXERCISE SCHEMAS
// ============================================================================

/**
 * Workout exercise schema
 */
export const workoutExerciseSchema = z.object({
  id: z.string().min(1, 'Exercise ID is required'),
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  exerciseName: nameSchema,
  sets: z.array(workoutSetSchema).min(1, 'At least one set is required'),
  totalVolume: z.number().nonnegative(),
  musclesWorked: z.array(z.nativeEnum(MuscleGroup)),
  timestamp: z.date(),
  notes: notesSchema,
  trackingType: z.enum(['weight_reps', 'reps_only', 'cardio', 'duration']).optional(),
  groupType: z.enum(['single', 'superset', 'circuit']).optional(),
  groupId: z.string().optional(),
  groupOrder: z.number().int().nonnegative().optional(),
});

// ============================================================================
// WORKOUT SCHEMAS
// ============================================================================

/**
 * Workout mood validation
 */
export const workoutMoodSchema = z.enum(['great', 'good', 'okay', 'tired', 'exhausted'], {
  invalid_type_error: 'Invalid mood selection',
});

/**
 * Full workout schema
 */
export const workoutSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  date: z.date(),
  startTime: z.date(),
  endTime: z.date().optional(),
  exercises: z.array(workoutExerciseSchema).min(1, 'At least one exercise is required'),
  totalDuration: z.number().int().nonnegative('Duration cannot be negative'),
  totalVolume: z.number().nonnegative('Volume cannot be negative'),
  calories: caloriesSchema,
  notes: notesSchema,
  musclesTargeted: z.array(z.nativeEnum(MuscleGroup)),
  workoutType: z.string().min(1, 'Workout type is required'),
  mood: workoutMoodSchema.optional(),
  version: z.number().int().nonnegative().optional(),
  deletedAt: z.date().nullable().optional(),
});

/**
 * Workout validation with time checks
 */
export const workoutWithTimeValidationSchema = workoutSchema.refine(
  (data) => {
    if (!data.endTime) {
    return true;
  }
    return data.endTime > data.startTime;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
).refine(
  (data) => {
    if (!data.endTime) {
    return true;
  }
    const timeDiff = data.endTime.getTime() - data.startTime.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return timeDiff <= oneDayMs;
  },
  {
    message: 'Workout cannot exceed 24 hours',
    path: ['endTime'],
  }
);

// ============================================================================
// EXERCISE SCHEMAS
// ============================================================================

/**
 * Exercise category validation
 */
export const exerciseCategorySchema = z.enum(
  ['strength', 'cardio', 'flexibility', 'olympic', 'plyometric'],
  {
    required_error: 'Exercise category is required',
    invalid_type_error: 'Invalid exercise category',
  }
);

/**
 * Difficulty validation
 */
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced'], {
  required_error: 'Difficulty is required',
  invalid_type_error: 'Invalid difficulty level',
});

/**
 * Tracking type validation
 */
export const trackingTypeSchema = z.enum(['weight_reps', 'reps_only', 'cardio', 'duration'], {
  required_error: 'Tracking type is required',
  invalid_type_error: 'Invalid tracking type',
});

/**
 * Exercise creation/update schema
 */
export const exerciseSchema = z.object({
  id: z.string().optional(),
  name: nameSchema,
  category: exerciseCategorySchema,
  primaryMuscles: z.array(z.nativeEnum(MuscleGroup)).min(1, 'At least one primary muscle is required'),
  secondaryMuscles: z.array(z.nativeEnum(MuscleGroup)),
  equipment: z.array(z.string()),
  difficulty: difficultySchema,
  instructions: z.array(z.string()),
  videoUrl: z.string().url('Invalid video URL').optional().or(z.literal('')),
  isCustom: z.boolean(),
  trackingType: trackingTypeSchema,
  anatomyImageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  strengthlogUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  strengthlogSlug: z.string().optional(),
  muscleCategory: z.string().optional(),
  userId: z.string().optional(),
});

// ============================================================================
// TEMPLATE SCHEMAS
// ============================================================================

/**
 * Template category validation
 */
export const templateCategorySchema = z.enum(
  ['strength', 'hypertrophy', 'cardio', 'home', 'flexibility'],
  {
    required_error: 'Template category is required',
    invalid_type_error: 'Invalid template category',
  }
);

/**
 * Template difficulty validation
 */
export const templateDifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'], {
  required_error: 'Difficulty is required',
  invalid_type_error: 'Invalid difficulty level',
});

/**
 * Template exercise schema
 */
export const templateExerciseSchema = z.object({
  exerciseId: z.string().min(1, 'Exercise ID is required'),
  exerciseName: nameSchema,
  sets: z.number().int().positive('Sets must be at least 1').max(20, 'Sets cannot exceed 20'),
  reps: z.number().int().positive('Reps must be at least 1').max(500, 'Reps cannot exceed 500'),
  weight: z.number().positive().optional(),
  restTime: restTimeSchema,
  setData: z.array(z.object({
    reps: repsSchema.optional(),
    weight: z.number().positive().optional(),
    unit: z.enum(['kg', 'lbs']).optional(),
    distance: z.number().nonnegative().optional(),
    distanceUnit: z.enum(['km', 'miles']).optional(),
    time: timeSecondsSchema.optional(),
    calories: caloriesSchema,
    duration: durationSecondsSchema.optional(),
    rpe: rpeSchema,
  })).optional(),
});

/**
 * Workout template schema
 */
export const workoutTemplateSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  name: nameSchema,
  category: templateCategorySchema,
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  difficulty: templateDifficultySchema.optional(),
  daysPerWeek: z.number().int().min(1, 'Must train at least 1 day per week').max(7, 'Cannot train more than 7 days per week').optional(),
  exercises: z.array(templateExerciseSchema).min(1, 'At least one exercise is required'),
  estimatedDuration: z.number().int().positive('Duration must be positive').max(480, 'Duration cannot exceed 8 hours'),
  musclesTargeted: z.array(z.nativeEnum(MuscleGroup)),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  matchPercentage: z.number().min(0).max(100).optional(),
});

// ============================================================================
// FORM SCHEMAS (for UI forms)
// ============================================================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Sign up form schema
 */
export const signUpFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Profile settings form schema
 */
export const profileSettingsFormSchema = z.object({
  name: nameSchema,
  age: ageSchema.optional(),
  gender: genderSchema.optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  experienceLevel: experienceLevelSchema.optional(),
  goals: z.array(goalSchema).optional(),
  preferredUnit: z.enum(['kg', 'lbs']).optional(),
  defaultRestTime: z.number().int().nonnegative().max(600).optional(),
});

/**
 * Exercise form schema (for creating/editing)
 */
export const exerciseFormSchema = exerciseSchema.omit({ id: true, userId: true });

/**
 * Template form schema (for creating/editing)
 */
export const templateFormSchema = workoutTemplateSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================================================
// TYPE EXPORTS (infer types from schemas)
// ============================================================================

export type LoginFormData = z.infer<typeof loginFormSchema>;
export type SignUpFormData = z.infer<typeof signUpFormSchema>;
export type ProfileSettingsFormData = z.infer<typeof profileSettingsFormSchema>;
export type ExerciseFormData = z.infer<typeof exerciseFormSchema>;
export type TemplateFormData = z.infer<typeof templateFormSchema>;
export type WorkoutSetData = z.infer<typeof workoutSetSchema>;
export type WorkoutExerciseData = z.infer<typeof workoutExerciseSchema>;
export type WorkoutData = z.infer<typeof workoutSchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates a single field and returns formatted error message
 */
export function validateField<T>(schema: z.ZodType<T>, value: unknown): {
  success: boolean;
  error?: string;
  data?: T;
} {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const error = result.error.errors[0]?.message || 'Validation failed';
  return { success: false, error };
}

/**
 * Validates multiple fields and returns all errors
 */
export function validateFields<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  values: Record<string, unknown>
): {
  success: boolean;
  errors?: Record<string, string>;
  data?: z.infer<z.ZodObject<T>>;
} {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });

  return { success: false, errors };
}

/**
 * Creates a dynamic weight schema based on unit preference
 */
export function getWeightSchema(unit: 'kg' | 'lbs') {
  return createWeightSchema(unit);
}

/**
 * Creates a dynamic distance schema based on unit preference
 */
export function getDistanceSchema(unit: 'km' | 'miles') {
  return createDistanceSchema(unit);
}

/**
 * Validates a workout set based on tracking type
 */
export function validateWorkoutSet(
  set: unknown,
  trackingType: ExerciseTrackingType,
  unit: 'kg' | 'lbs'
): {
  success: boolean;
  error?: string;
} {
  if (typeof set !== 'object' || set === null || !('completed' in set)) {
    return { success: false, error: 'Invalid set data' };
  }

  // If set is not completed, skip detailed validation
  if (!set.completed) {
    return { success: true };
  }

  const schema = createCompletedSetSchema(trackingType, unit);
  const result = schema.safeParse(set);

  if (result.success) {
    return { success: true };
  }

  // Safety check: ensure error exists
  if (!result.error || !result.error.errors || result.error.errors.length === 0) {
    return { success: false, error: 'Set validation failed' };
  }

  const error = result.error.errors[0]?.message || 'Set validation failed';
  return { success: false, error };
}
