import { Workout, WorkoutTemplate, PlannedWorkout } from './workout';
import { Exercise } from './exercise';
import { MuscleStatus } from './muscle';
import { SleepLog, RecoveryLog } from './sleep';
import { UserProfile } from '@/store/userStore';

export interface ExportData {
  version: string;
  exportDate: string;
  appVersion?: string;
  dataCounts: {
    workouts: number;
    templates: number;
    plannedWorkouts: number;
    customExercises: number;
    muscleStatuses: number;
    sleepLogs: number;
    recoveryLogs: number;
    settings: number;
  };
  workouts: Workout[];
  templates: WorkoutTemplate[];
  plannedWorkouts: PlannedWorkout[];
    customExercises: Exercise[];
    muscleStatuses: MuscleStatus[];
    sleepLogs: SleepLog[];
    recoveryLogs: RecoveryLog[];
    settings: Record<string, unknown>;
    userProfile: UserProfile | null;
}

export type ImportStrategy = 'merge' | 'replace';

export interface ImportPreview {
    version: string;
    exportDate: string;
    dataCounts: {
        workouts: number;
        templates: number;
        plannedWorkouts: number;
        customExercises: number;
        muscleStatuses: number;
        sleepLogs: number;
        recoveryLogs: number;
        settings: number;
    };
    userProfile: {
        name?: string;
        id?: string;
    } | null;
}

export interface ExportStats {
    workouts: number;
    templates: number;
    plannedWorkouts: number;
    customExercises: number;
    muscleStatuses: number;
    sleepLogs: number;
    recoveryLogs: number;
    settings: number;
    estimatedSize: string; // Human-readable file size estimate
}

export interface ImportError {
    type: 'validation' | 'data' | 'sync' | 'permission' | 'unknown';
    category: string; // 'workout' | 'template' | 'exercise' | 'file' | 'userProfile' | etc.
    message: string; // User-friendly message
    technicalMessage?: string; // Technical details for debugging
    recordId?: string;
    recordName?: string; // Human-readable identifier (e.g., workout date, template name)
    suggestion?: string; // Actionable suggestion for user
    severity: 'error' | 'warning' | 'info';
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: ImportError[];
    details: {
        workouts: { imported: number; skipped: number; errors: number };
        templates: { imported: number; skipped: number; errors: number };
        plannedWorkouts: { imported: number; skipped: number; errors: number };
        customExercises: { imported: number; skipped: number; errors: number };
        muscleStatuses: { imported: number; skipped: number; errors: number };
        sleepLogs: { imported: number; skipped: number; errors: number };
        recoveryLogs: { imported: number; skipped: number; errors: number };
        settings: { imported: number; skipped: number; errors: number };
        userProfile: { imported: boolean; error?: string };
    };
}

export interface ValidationResult {
    errors: ImportError[];
    warnings: ImportError[];
    isValid: boolean;
}

export interface ProgressCallback {
    (progress: {
        percentage: number;
        currentOperation: string;
        completedItems: number;
        totalItems: number;
    }): void;
}

export interface DeletionResult {
  category: string;
  attempted: number;
  deleted: number;
  failed: number;
  errors: Array<{ recordId: string; error: string }>;
}

export interface ClearDataResult {
  success: boolean;
  deletions: DeletionResult[];
  totalDeleted: number;
  totalFailed: number;
}

