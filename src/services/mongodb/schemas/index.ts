// Export Prisma-generated types for all models
// Use type-only import to prevent bundling Prisma Client in browser
import type { Prisma } from '@prisma/client';

// Workout types
export type Workout = Prisma.WorkoutGetPayload<Record<string, never>>;
export type IWorkout = Workout;

// Exercise types
export type Exercise = Prisma.ExerciseGetPayload<Record<string, never>>;
export type IExercise = Exercise;

// WorkoutTemplate types
export type WorkoutTemplate = Prisma.WorkoutTemplateGetPayload<Record<string, never>>;
export type IWorkoutTemplate = WorkoutTemplate;

// PlannedWorkout types
export type PlannedWorkout = Prisma.PlannedWorkoutGetPayload<Record<string, never>>;
export type IPlannedWorkout = PlannedWorkout;

// MuscleStatus types
export type MuscleStatus = Prisma.MuscleStatusGetPayload<Record<string, never>>;
export type IMuscleStatus = MuscleStatus;

// UserProfile types
export type UserProfile = Prisma.UserProfileGetPayload<Record<string, never>>;
export type IUserProfile = UserProfile;

// Setting types
export type Setting = Prisma.SettingGetPayload<Record<string, never>>;
export type ISetting = Setting;

// Notification types
export type Notification = Prisma.NotificationGetPayload<Record<string, never>>;
export type INotification = Notification;

// SleepLog types
export type SleepLog = Prisma.SleepLogGetPayload<Record<string, never>>;
export type ISleepLog = SleepLog;

// RecoveryLog types
export type RecoveryLog = Prisma.RecoveryLogGetPayload<Record<string, never>>;
export type IRecoveryLog = RecoveryLog;

// ErrorLog types
export type ErrorLog = Prisma.ErrorLogGetPayload<Record<string, never>>;
export type IErrorLog = ErrorLog;

// SyncMetadata types
export type SyncMetadata = Prisma.SyncMetadataGetPayload<Record<string, never>>;
export type ISyncMetadata = SyncMetadata;
