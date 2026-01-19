/**
 * Comprehensive data export/import service for user data portability
 */

import { dataService } from './dataService';
import { templateService } from './templateService';
import { plannedWorkoutService } from './plannedWorkoutService';
import { sleepRecoveryService } from './sleepRecoveryService';
import { dbHelpers, db } from './database';
import { Workout, WorkoutTemplate, PlannedWorkout } from '@/types/workout';
import { Exercise } from '@/types/exercise';
import { MuscleStatus } from '@/types/muscle';
import {
  ExportData,
  ImportStrategy,
  ImportPreview,
  ExportStats,
  ImportResult,
  ImportError,
  ValidationResult,
  ProgressCallback,
  DeletionResult,
  ClearDataResult,
} from '@/types/export';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/errorHandler';

const EXPORT_VERSION = '2.0.0';
const APP_VERSION = '1.0.0';

// Critical errors that should block import
const BLOCKING_VALIDATION_ERRORS = [
  'Missing version field',
  'Unsupported version',
  'Invalid export file'
];

/**
 * Check if an error should block the import
 */
function isBlockingError(error: ImportError): boolean {
  return error.severity === 'error' &&
         BLOCKING_VALIDATION_ERRORS.some(msg => error.message.includes(msg));
}

/**
 * Get user-friendly error message for import errors
 */
function getUserFriendlyImportErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    // Timeout errors
    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // Database errors
    if (message.includes('database') || message.includes('indexeddb') || message.includes('quota')) {
      return 'Storage error. Please free up some space and try again.';
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return error.message;
    }
    
    // Return the error message if it's user-friendly (short and clear)
    if (error.message.length < 150 && !error.message.includes('Error:') && !error.message.includes('at ')) {
      return error.message;
    }
  }

  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Create a structured import error with user-friendly message and context
 */
function createImportError(
  type: ImportError['type'],
  category: string,
  error: unknown,
  context?: {
    recordId?: string;
    recordName?: string;
    field?: string;
    expected?: string;
    actual?: string;
  }
): ImportError {
  const baseMessage = getUserFriendlyImportErrorMessage(error);
  const technicalMessage = error instanceof Error ? error.message : String(error);
  
  // Category-specific messages
  let userMessage = '';
  let suggestion = '';
  let severity: ImportError['severity'] = type === 'validation' ? 'warning' : 'error';
  
  switch (category) {
    case 'workout':
      if (type === 'validation') {
        userMessage = `Workout on ${context?.recordName || 'unknown date'} has invalid data`;
        suggestion = context?.field 
          ? `Please check the ${context.field} field in the workout data`
          : 'Please check the workout date and exercise data';
      } else if (type === 'data') {
        userMessage = `Failed to import workout from ${context?.recordName || 'unknown date'}`;
        suggestion = 'The workout data may be corrupted. Try exporting again or contact support.';
      } else {
        userMessage = `Error importing workout: ${baseMessage}`;
        suggestion = 'Please check the workout data format and try again.';
      }
      break;
      
    case 'template':
      userMessage = `Template "${context?.recordName || 'Unknown'}" could not be imported`;
      if (type === 'validation') {
        suggestion = 'Please check the template structure and exercise references';
      } else {
        suggestion = 'Check if the template name already exists or if exercise references are valid';
      }
      break;
      
    case 'exercise':
      userMessage = `Custom exercise "${context?.recordName || 'Unknown'}" could not be imported`;
      suggestion = 'The exercise data may be incomplete or corrupted. Check the exercise details.';
      break;
      
    case 'plannedWorkout':
      userMessage = `Planned workout for ${context?.recordName || 'unknown date'} could not be imported`;
      suggestion = 'Check if a planned workout already exists for this date or if the template reference is valid.';
      break;
      
    case 'muscleStatus':
      userMessage = `Muscle status for ${context?.recordName || 'unknown muscle'} could not be imported`;
      suggestion = 'The muscle status data may be invalid. This will be recalculated from your workouts.';
      severity = 'warning';
      break;
      
    case 'sleepLog':
      userMessage = `Sleep log for ${context?.recordName || 'unknown date'} could not be imported`;
      suggestion = 'Please check the sleep log date and duration values.';
      break;
      
    case 'recoveryLog':
      userMessage = `Recovery log for ${context?.recordName || 'unknown date'} could not be imported`;
      suggestion = 'Please check the recovery log date and values.';
      break;
      
    case 'userProfile':
      userMessage = 'User profile could not be imported';
      suggestion = 'Your profile settings may be incomplete. You can update them manually in settings.';
      break;
      
    case 'settings':
      userMessage = 'Settings could not be imported';
      suggestion = 'Some app settings may not have been imported. You can reconfigure them in settings.';
      severity = 'warning';
      break;
      
    case 'file':
      userMessage = baseMessage;
      if (type === 'validation') {
        suggestion = 'Please export your data using the latest version of the app';
      } else {
        suggestion = 'Please ensure the file is not corrupted and try again.';
      }
      break;
      
    case 'sync':
      userMessage = 'Data sync failed after import';
      suggestion = 'Your data has been saved locally. It will sync automatically when you have internet connection.';
      severity = 'warning';
      break;
      
    default:
      userMessage = baseMessage;
      suggestion = 'Please try again or contact support if the problem persists.';
  }
  
  return {
    type,
    category,
    message: userMessage || baseMessage,
    technicalMessage,
    recordId: context?.recordId,
    recordName: context?.recordName,
    suggestion,
    severity,
  };
}

export const dataExport = {
  /**
   * Get export statistics for UI display
   */
  async getExportStats(userId: string): Promise<ExportStats> {
    try {
      const [
        workouts,
        templates,
        plannedWorkouts,
        allExercises,
        allMuscleStatuses,
        sleepLogs,
        recoveryLogs,
      ] = await Promise.all([
        dataService.getAllWorkouts(userId),
        templateService.getAllTemplates(userId),
        plannedWorkoutService.getAllPlannedWorkouts(userId),
        dataService.getAllExercises(),
        dataService.getAllMuscleStatuses(),
        sleepRecoveryService.getAllSleepLogs(userId),
        sleepRecoveryService.getAllRecoveryLogs(userId),
      ]);

      const customExercises = allExercises.filter(
        (ex: Exercise) => ex.isCustom && ex.userId === userId
      );
      const muscleStatuses = allMuscleStatuses.filter(
        (ms: MuscleStatus) => ms.userId === userId
      );

      // Estimate file size (rough calculation: ~2KB per workout, ~1KB per template, etc.)
      const estimatedBytes =
        workouts.length * 2000 +
        templates.length * 1000 +
        plannedWorkouts.length * 500 +
        customExercises.length * 800 +
        muscleStatuses.length * 200 +
        sleepLogs.length * 300 +
        recoveryLogs.length * 300 +
        1000; // metadata overhead

      const estimatedSize =
        estimatedBytes < 1024
          ? `${estimatedBytes} B`
          : estimatedBytes < 1024 * 1024
            ? `${(estimatedBytes / 1024).toFixed(1)} KB`
            : `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;

      return {
        workouts: workouts.length,
        templates: templates.length,
        plannedWorkouts: plannedWorkouts.length,
        customExercises: customExercises.length,
        muscleStatuses: muscleStatuses.length,
        sleepLogs: sleepLogs.length,
        recoveryLogs: recoveryLogs.length,
        settings: 1, // appSettings is a single object
        estimatedSize,
      };
    } catch (error) {
      logger.error('Failed to get export stats', error);
      throw new Error(
        `Failed to get export stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Export all user data to JSON with progress callback
   */
  async exportAllData(
    userId: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    try {
      onProgress?.({
        percentage: 0,
        currentOperation: 'Preparing export...',
        completedItems: 0,
        totalItems: 8,
      });

      // Fetch all data
      onProgress?.({
        percentage: 10,
        currentOperation: 'Fetching workouts...',
        completedItems: 1,
        totalItems: 8,
      });
      const workouts = await dataService.getAllWorkouts(userId);

      onProgress?.({
        percentage: 25,
        currentOperation: 'Fetching templates...',
        completedItems: 2,
        totalItems: 8,
      });
      const templates = await templateService.getAllTemplates(userId);

      onProgress?.({
        percentage: 35,
        currentOperation: 'Fetching planned workouts...',
        completedItems: 3,
        totalItems: 8,
      });
      const plannedWorkouts =
        await plannedWorkoutService.getAllPlannedWorkouts(userId);

      onProgress?.({
        percentage: 45,
        currentOperation: 'Fetching custom exercises...',
        completedItems: 4,
        totalItems: 8,
      });
      const allExercises = await dataService.getAllExercises();
      const customExercises = allExercises.filter(
        (ex) => ex.isCustom && ex.userId === userId
      );

      onProgress?.({
        percentage: 55,
        currentOperation: 'Fetching muscle statuses...',
        completedItems: 5,
        totalItems: 8,
      });
      const allMuscleStatuses = await dataService.getAllMuscleStatuses();
      const muscleStatuses = allMuscleStatuses.filter(
        (ms) => ms.userId === userId
      );

      onProgress?.({
        percentage: 65,
        currentOperation: 'Fetching sleep logs...',
        completedItems: 6,
        totalItems: 8,
      });
      const sleepLogs = await sleepRecoveryService.getAllSleepLogs(userId);

      onProgress?.({
        percentage: 75,
        currentOperation: 'Fetching recovery logs...',
        completedItems: 7,
        totalItems: 8,
      });
      const recoveryLogs = await sleepRecoveryService.getAllRecoveryLogs(userId);

      onProgress?.({
        percentage: 85,
        currentOperation: 'Fetching settings and profile...',
        completedItems: 8,
        totalItems: 8,
      });
      const userProfile = await dataService.getUserProfile(userId);
      const settings = await dataService.getSetting('appSettings');
      const settingsObj = settings
        ? { appSettings: settings }
        : ({} as Record<string, unknown>);

      // Structure export data
      const exportData: ExportData = {
        version: EXPORT_VERSION,
        exportDate: new Date().toISOString(),
        appVersion: APP_VERSION,
        dataCounts: {
          workouts: workouts.length,
          templates: templates.length,
          plannedWorkouts: plannedWorkouts.length,
          customExercises: customExercises.length,
          muscleStatuses: muscleStatuses.length,
          sleepLogs: sleepLogs.length,
          recoveryLogs: recoveryLogs.length,
          settings: Object.keys(settingsObj).length,
        },
        workouts,
        templates,
        plannedWorkouts,
        customExercises,
        muscleStatuses,
        sleepLogs,
        recoveryLogs,
        settings: settingsObj,
        userProfile,
      };

      onProgress?.({
        percentage: 95,
        currentOperation: 'Generating JSON...',
        completedItems: 8,
        totalItems: 8,
      });

      const jsonString = JSON.stringify(exportData, null, 2);

      onProgress?.({
        percentage: 100,
        currentOperation: 'Export complete',
        completedItems: 8,
        totalItems: 8,
      });

      return jsonString;
    } catch (error) {
      logger.error('Failed to export data', error);
      throw new Error(
        `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Export data and download as file
   * Handles mobile devices with fallback for iOS Safari
   */
  async downloadExport(
    userId: string,
    filename?: string,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const data = await this.exportAllData(userId, onProgress);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Check if we're on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      // iOS Safari doesn't support programmatic downloads well
      // Open in new tab as fallback
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Popup blocked, show user instructions
        throw new Error(
          'Please allow popups to download the file, or use the share button in your browser.'
        );
      }
      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    } else {
      // Standard download for other browsers
      const link = document.createElement('a');
      link.href = url;
      link.download =
        filename ||
        `fittrackai-export-${new Date().toISOString().split('T')[0]}.json`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      try {
        link.click();
      } catch (error) {
        logger.error('Failed to trigger download', error);
        // Fallback: open in new window
        window.open(url, '_blank');
      } finally {
        // Clean up after a delay to ensure download starts
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    }
  },

  /**
   * Parse and validate JSON export file in one step
   * Returns parsed data if valid, throws if invalid
   */
  async parseExportFile(file: File): Promise<ExportData> {
    try {
      if (!file.name.endsWith('.json')) {
        throw new Error('File must be a JSON file');
      }

      const text = await file.text();

      // Single JSON parse
      let data: ExportData;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error(
          'Invalid JSON format. Please ensure you selected a valid FitTrackAI export file.'
        );
      }

      // Basic structure validation (inline, no re-parse)
      if (!data.version) {
        throw new Error('Invalid export file: missing version');
      }

      if (!data.exportDate) {
        throw new Error('Invalid export file: missing export date');
      }

      // Version check
      if (data.version.startsWith('2.')) {
        if (!Array.isArray(data.workouts)) {
          throw new Error('Invalid export file: workouts must be an array');
        }
      } else if (data.version.startsWith('1.')) {
        if (!Array.isArray(data.workouts)) {
          throw new Error('Invalid export file: workouts must be an array');
        }
      } else {
        throw new Error(`Unsupported export version: ${data.version}`);
      }

      logger.info(`[parseExportFile] Successfully parsed file with version ${data.version}`);
      return data;
    } catch (error) {
      logger.error('[parseExportFile] Failed to parse export file:', error);
      throw error;
    }
  },

  /**
   * Validate already-parsed export data
   * Used after parseExportFile for additional validation if needed
   */
  validateExportFile(data: ExportData): boolean {
    // Structure already validated in parseExportFile
    // This can be extended for deeper semantic validation if needed
    return true;
  },

  /**
   * Preview import data before confirming
   * Accepts already-parsed data (no file reading or parsing)
   */
  previewImport(data: ExportData): ImportPreview {
    return {
      version: data.version,
      exportDate: data.exportDate,
      dataCounts: data.dataCounts || {
        workouts: data.workouts?.length || 0,
        templates: data.templates?.length || 0,
        plannedWorkouts: data.plannedWorkouts?.length || 0,
        customExercises: data.customExercises?.length || 0,
        muscleStatuses: data.muscleStatuses?.length || 0,
        sleepLogs: data.sleepLogs?.length || 0,
        recoveryLogs: data.recoveryLogs?.length || 0,
        settings: data.settings ? Object.keys(data.settings).length : 0,
      },
      userProfile: data.userProfile
        ? {
            name: data.userProfile.name,
            id: data.userProfile.id,
          }
        : null,
    };
  },

  /**
   * Clear all user data (for replace strategy)
   * Returns detailed deletion results including partial failures
   */
  async clearUserData(userId: string): Promise<ClearDataResult> {
    const deletions: DeletionResult[] = [];
    let totalDeleted = 0;
    let totalFailed = 0;

    logger.info(`[clearUserData] Starting deletion for user ${userId}`);

    // 1. Delete workouts (per-record error handling)
    try {
      const workouts = await dataService.getAllWorkouts(userId);
      const result: DeletionResult = {
        category: 'workouts',
        attempted: workouts.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const workout of workouts) {
        if (workout.id) {
          try {
            await dataService.deleteWorkout(workout.id);
            result.deleted++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              recordId: workout.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to delete workout ${workout.id}:`, error);
          }
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch workouts for deletion:', error);
      deletions.push({
        category: 'workouts',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch workouts' }]
      });
      totalFailed++;
    }

    // 2. Delete templates (per-record error handling)
    try {
      const templates = await templateService.getAllTemplates(userId);
      const result: DeletionResult = {
        category: 'templates',
        attempted: templates.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const template of templates) {
        try {
          await templateService.deleteTemplate(template.id);
          result.deleted++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            recordId: template.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          logger.error(`Failed to delete template ${template.id}:`, error);
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch templates for deletion:', error);
      deletions.push({
        category: 'templates',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch templates' }]
      });
      totalFailed++;
    }

    // 3. Delete planned workouts (per-record error handling)
    try {
      const plannedWorkouts = await plannedWorkoutService.getAllPlannedWorkouts(userId);
      const result: DeletionResult = {
        category: 'plannedWorkouts',
        attempted: plannedWorkouts.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const plannedWorkout of plannedWorkouts) {
        try {
          await plannedWorkoutService.deletePlannedWorkout(plannedWorkout.id);
          result.deleted++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            recordId: plannedWorkout.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          logger.error(`Failed to delete planned workout ${plannedWorkout.id}:`, error);
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch planned workouts for deletion:', error);
      deletions.push({
        category: 'plannedWorkouts',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch planned workouts' }]
      });
      totalFailed++;
    }

    // 4. Delete custom exercises (per-record error handling)
    try {
      const allExercises = await dataService.getAllExercises();
      const customExercises = allExercises.filter(
        (ex) => ex.isCustom && ex.userId === userId
      );
      const result: DeletionResult = {
        category: 'customExercises',
        attempted: customExercises.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const exercise of customExercises) {
        try {
          await dataService.deleteExercise(exercise.id);
          result.deleted++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            recordId: exercise.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          logger.error(`Failed to delete exercise ${exercise.id}:`, error);
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch custom exercises for deletion:', error);
      deletions.push({
        category: 'customExercises',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch custom exercises' }]
      });
      totalFailed++;
    }

    // 5. Delete muscle statuses (per-record error handling)
    try {
      const allMuscleStatuses = await dataService.getAllMuscleStatuses();
      const muscleStatuses = allMuscleStatuses.filter(
        (ms) => ms.userId === userId
      );
      const result: DeletionResult = {
        category: 'muscleStatuses',
        attempted: muscleStatuses.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const status of muscleStatuses) {
        if (status.id) {
          try {
            await db.muscleStatuses.delete(status.id);
            result.deleted++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              recordId: status.id.toString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to delete muscle status ${status.id}:`, error);
          }
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch muscle statuses for deletion:', error);
      deletions.push({
        category: 'muscleStatuses',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch muscle statuses' }]
      });
      totalFailed++;
    }

    // 6. Delete sleep logs (per-record error handling)
    try {
      const sleepLogs = await sleepRecoveryService.getAllSleepLogs(userId);
      const result: DeletionResult = {
        category: 'sleepLogs',
        attempted: sleepLogs.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const log of sleepLogs) {
        if (log.id) {
          try {
            await db.sleepLogs.delete(log.id);
            result.deleted++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              recordId: log.id.toString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to delete sleep log ${log.id}:`, error);
          }
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch sleep logs for deletion:', error);
      deletions.push({
        category: 'sleepLogs',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch sleep logs' }]
      });
      totalFailed++;
    }

    // 7. Delete recovery logs (per-record error handling)
    try {
      const recoveryLogs = await sleepRecoveryService.getAllRecoveryLogs(userId);
      const result: DeletionResult = {
        category: 'recoveryLogs',
        attempted: recoveryLogs.length,
        deleted: 0,
        failed: 0,
        errors: []
      };

      for (const log of recoveryLogs) {
        if (log.id) {
          try {
            await db.recoveryLogs.delete(log.id);
            result.deleted++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              recordId: log.id.toString(),
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to delete recovery log ${log.id}:`, error);
          }
        }
      }

      deletions.push(result);
      totalDeleted += result.deleted;
      totalFailed += result.failed;
    } catch (error) {
      logger.error('Failed to fetch recovery logs for deletion:', error);
      deletions.push({
        category: 'recoveryLogs',
        attempted: 0,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'all', error: 'Failed to fetch recovery logs' }]
      });
      totalFailed++;
    }

    // 8. Clear settings (special handling - don't fail if this errors)
    try {
      await dataService.updateSetting('appSettings', {});
      deletions.push({
        category: 'settings',
        attempted: 1,
        deleted: 1,
        failed: 0,
        errors: []
      });
      totalDeleted++;
    } catch (error) {
      logger.error('Failed to clear settings:', error);
      deletions.push({
        category: 'settings',
        attempted: 1,
        deleted: 0,
        failed: 1,
        errors: [{ recordId: 'appSettings', error: error instanceof Error ? error.message : 'Unknown' }]
      });
      totalFailed++;
    }

    logger.info(`[clearUserData] Completed: ${totalDeleted} deleted, ${totalFailed} failed`);

    return {
      success: totalFailed === 0,
      deletions,
      totalDeleted,
      totalFailed
    };
  },

  /**
   * Validate import data before starting import process
   */
  async validateImportData(data: ExportData): Promise<ValidationResult> {
    const errors: ImportError[] = [];
    const warnings: ImportError[] = [];
    
    // Version check
    if (!data.version) {
      errors.push(createImportError(
        'validation',
        'file',
        new Error('Missing version field'),
        { recordName: 'Export file' }
      ));
    } else if (!data.version.startsWith('2.') && !data.version.startsWith('1.')) {
      errors.push(createImportError(
        'validation',
        'file',
        new Error(`Unsupported version: ${data.version}`),
        { 
          recordName: 'Export file',
          expected: 'Version 2.0.0 or 1.x',
          actual: data.version
        }
      ));
    }
    
    // Validate export date
    if (!data.exportDate) {
      warnings.push(createImportError(
        'validation',
        'file',
        new Error('Missing export date'),
        { recordName: 'Export file' }
      ));
    }
    
    // Validate workouts
    if (Array.isArray(data.workouts)) {
      data.workouts.forEach((workout, index) => {
        if (!workout.date) {
          errors.push(createImportError(
            'validation',
            'workout',
            new Error('Missing workout date'),
            {
              recordId: workout.id?.toString(),
              recordName: `Workout #${index + 1}`,
              field: 'date'
            }
          ));
        } else {
          // Validate date format
          const date = new Date(workout.date);
          if (isNaN(date.getTime())) {
            errors.push(createImportError(
              'validation',
              'workout',
              new Error(`Invalid date format: ${workout.date}`),
              {
                recordId: workout.id?.toString(),
                recordName: `Workout #${index + 1}`,
                field: 'date',
                actual: typeof workout.date === 'string' ? workout.date : String(workout.date)
              }
            ));
          }
        }
        
        if (!Array.isArray(workout.exercises)) {
          errors.push(createImportError(
            'validation',
            'workout',
            new Error('Missing or invalid exercises array'),
            {
              recordId: workout.id?.toString(),
              recordName: `Workout #${index + 1}`,
              field: 'exercises'
            }
          ));
        }
      });
    }
    
    // Validate templates
    if (Array.isArray(data.templates)) {
      data.templates.forEach((template, index) => {
        if (!template.name) {
          errors.push(createImportError(
            'validation',
            'template',
            new Error('Missing template name'),
            {
              recordId: template.id,
              recordName: `Template #${index + 1}`,
              field: 'name'
            }
          ));
        }
        
        if (!Array.isArray(template.exercises)) {
          warnings.push(createImportError(
            'validation',
            'template',
            new Error('Missing or invalid exercises array'),
            {
              recordId: template.id,
              recordName: template.name || `Template #${index + 1}`,
              field: 'exercises'
            }
          ));
        }
      });
    }
    
    // Validate planned workouts
    if (Array.isArray(data.plannedWorkouts)) {
      data.plannedWorkouts.forEach((plannedWorkout, index) => {
        if (!plannedWorkout.scheduledDate) {
          errors.push(createImportError(
            'validation',
            'plannedWorkout',
            new Error('Missing scheduled date'),
            {
              recordId: plannedWorkout.id,
              recordName: `Planned workout #${index + 1}`,
              field: 'scheduledDate'
            }
          ));
        } else {
          const date = new Date(plannedWorkout.scheduledDate);
          if (isNaN(date.getTime())) {
            errors.push(createImportError(
              'validation',
              'plannedWorkout',
              new Error(`Invalid scheduled date format: ${plannedWorkout.scheduledDate}`),
              {
                recordId: plannedWorkout.id,
                recordName: `Planned workout #${index + 1}`,
                field: 'scheduledDate',
                actual: String(plannedWorkout.scheduledDate)
              }
            ));
          }
        }
      });
    }
    
    // Validate sleep logs
    if (Array.isArray(data.sleepLogs)) {
      data.sleepLogs.forEach((log, index) => {
        if (!log.date) {
          errors.push(createImportError(
            'validation',
            'sleepLog',
            new Error('Missing sleep log date'),
            {
              recordId: log.id?.toString(),
              recordName: `Sleep log #${index + 1}`,
              field: 'date'
            }
          ));
        }
      });
    }
    
    // Validate recovery logs
    if (Array.isArray(data.recoveryLogs)) {
      data.recoveryLogs.forEach((log, index) => {
        if (!log.date) {
          errors.push(createImportError(
            'validation',
            'recoveryLog',
            new Error('Missing recovery log date'),
            {
              recordId: log.id?.toString(),
              recordName: `Recovery log #${index + 1}`,
              field: 'date'
            }
          ));
        }
      });
    }
    
    return { errors, warnings, isValid: errors.length === 0 };
  },

  /**
   * Import all data from parsed ExportData with merge or replace strategy
   */
  async importAllData(
    userId: string,
    data: ExportData,
    strategy: ImportStrategy,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      // Data is already parsed - no JSON.parse needed!
      const result: ImportResult = {
        imported: 0,
        skipped: 0,
        errors: [],
        details: {
          workouts: { imported: 0, skipped: 0, errors: 0 },
          templates: { imported: 0, skipped: 0, errors: 0 },
          plannedWorkouts: { imported: 0, skipped: 0, errors: 0 },
          customExercises: { imported: 0, skipped: 0, errors: 0 },
          muscleStatuses: { imported: 0, skipped: 0, errors: 0 },
          sleepLogs: { imported: 0, skipped: 0, errors: 0 },
          recoveryLogs: { imported: 0, skipped: 0, errors: 0 },
          settings: { imported: 0, skipped: 0, errors: 0 },
          userProfile: { imported: false },
        },
      };

      // Pre-import validation
      const totalSteps = 9; // 9 import steps (sync happens automatically later)
      onProgress?.({
        percentage: 2,
        currentOperation: 'Validating import data...',
        completedItems: 0,
        totalItems: totalSteps,
      });
      
      const validation = await this.validateImportData(data);

      // Check for blocking errors
      if (!validation.isValid) {
        const blockingErrors = validation.errors.filter(isBlockingError);
        if (blockingErrors.length > 0) {
          logger.error('[importAllData] Import blocked by validation errors:', blockingErrors);

          // Create result with only validation errors
          result.errors.push(...validation.errors);
          result.errors.push(...validation.warnings);

          throw new Error(
            `Import blocked: ${blockingErrors.length} critical validation error(s) found. ` +
            `Please check the export file format and try again.`
          );
        }
      }

      // Add warnings to result but continue
      if (validation.warnings.length > 0) {
        logger.warn('[importAllData] Import has warnings:', validation.warnings);
        result.errors.push(...validation.warnings);
      }

      // Add non-blocking errors as warnings
      const nonBlockingErrors = validation.errors.filter(e => !isBlockingError(e));
      if (nonBlockingErrors.length > 0) {
        logger.warn('[importAllData] Import has non-blocking errors:', nonBlockingErrors);
        result.errors.push(...nonBlockingErrors);
      }

      // If replace strategy, clear existing data first
      if (strategy === 'replace') {
        onProgress?.({
          percentage: 5,
          currentOperation: 'Clearing existing data...',
          completedItems: 0,
          totalItems: totalSteps,
        });

        const clearResult = await this.clearUserData(userId);

        // Add deletion issues to import result
        if (!clearResult.success) {
          logger.warn(`Data clearing had ${clearResult.totalFailed} failures`, clearResult);

          for (const deletion of clearResult.deletions) {
            if (deletion.failed > 0) {
              for (const error of deletion.errors) {
                result.errors.push({
                  type: 'data',
                  category: `delete_${deletion.category}`,
                  message: `Failed to delete ${deletion.category}: ${error.error}`,
                  technicalMessage: error.error,
                  recordId: error.recordId,
                  severity: 'warning', // Don't block import
                  suggestion: 'Some old data may remain. Consider manually cleaning up or trying again.'
                });
              }
            }
          }
        }

        logger.info(`Cleared ${clearResult.totalDeleted} records before import`);
      }

      let currentStep = strategy === 'replace' ? 1 : 0;

      // 1. Import User Profile
      if (data.userProfile) {
        try {
          onProgress?.({
            percentage: (currentStep / totalSteps) * 100,
            currentOperation: 'Importing user profile...',
            completedItems: currentStep,
            totalItems: totalSteps,
          });
          const existingProfile = await dataService.getUserProfile(userId);
          const profileToImport = {
            ...data.userProfile,
            id: userId, // Ensure userId matches
          };

          if (strategy === 'replace' || !existingProfile) {
            await dataService.updateUserProfile(profileToImport);
            result.details.userProfile.imported = true;
            result.imported++;
          } else {
            // Merge: only update if import has newer data or different values
            await dataService.updateUserProfile(profileToImport);
            result.details.userProfile.imported = true;
            result.imported++;
          }
        } catch (error) {
          const importError = createImportError(
            'data',
            'userProfile',
            error,
            {
              recordName: data.userProfile?.name || 'User profile'
            }
          );
          result.errors.push(importError);
          result.details.userProfile.error = importError.technicalMessage || importError.message;
          
          logger.error('Failed to import user profile', {
            error,
            userId,
            profileName: data.userProfile?.name
          });
        }
      }
      currentStep++;

      // 2. Import Settings
      if (data.settings && Object.keys(data.settings).length > 0) {
        try {
          onProgress?.({
            percentage: (currentStep / totalSteps) * 100,
            currentOperation: 'Importing settings...',
            completedItems: currentStep,
            totalItems: totalSteps,
          });
          for (const [key, value] of Object.entries(data.settings)) {
            await dataService.updateSetting(key, value);
          }
          result.details.settings.imported = Object.keys(data.settings).length;
          result.imported += result.details.settings.imported;
        } catch (error) {
          const importError = createImportError(
            'data',
            'settings',
            error,
            { recordName: 'App settings' }
          );
          result.errors.push(importError);
          result.details.settings.errors++;
          
          logger.error('Failed to import settings', {
            error,
            userId,
            settingKeys: Object.keys(data.settings)
          });
        }
      }
      currentStep++;

      // 3. Import Custom Exercises
      if (Array.isArray(data.customExercises)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.customExercises.length} custom exercises...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const exercise of data.customExercises) {
          try {
            const exerciseToImport = {
              ...exercise,
              userId, // Ensure userId matches
            };

            if (strategy === 'replace') {
              await dataService.createExercise(exerciseToImport);
              result.details.customExercises.imported++;
              result.imported++;
            } else {
              // Merge: check if exercise exists
              const existing = await dbHelpers.getExercise(exercise.id);
              if (!existing || existing.userId !== userId) {
                await dataService.createExercise(exerciseToImport);
                result.details.customExercises.imported++;
                result.imported++;
              } else {
                result.details.customExercises.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const importError = createImportError(
              'data',
              'exercise',
              error,
              {
                recordId: exercise.id,
                recordName: exercise.name || 'Unknown exercise'
              }
            );
            result.errors.push(importError);
            result.details.customExercises.errors++;
            
            logger.error(`Failed to import custom exercise ${exercise.id}`, {
              error,
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              userId
            });
          }
        }
      }
      currentStep++;

      // 4. Import Templates
      if (Array.isArray(data.templates)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.templates.length} templates...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const template of data.templates) {
          try {
            const templateToImport = {
              ...template,
              userId, // Ensure userId matches
            };

            if (strategy === 'replace') {
              await templateService.createTemplate(templateToImport);
              result.details.templates.imported++;
              result.imported++;
            } else {
              // Merge: check if template exists (by name + userId)
              const existingTemplates =
                await templateService.getAllTemplates(userId);
              const exists = existingTemplates.some(
                (t: WorkoutTemplate) => t.name === template.name && t.userId === userId
              );
              if (!exists) {
                await templateService.createTemplate(templateToImport);
                result.details.templates.imported++;
                result.imported++;
              } else {
                result.details.templates.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const importError = createImportError(
              'data',
              'template',
              error,
              {
                recordId: template.id,
                recordName: template.name || 'Unknown template'
              }
            );
            result.errors.push(importError);
            result.details.templates.errors++;
            
            logger.error(`Failed to import template ${template.id}`, {
              error,
              templateId: template.id,
              templateName: template.name,
              userId
            });
          }
        }
      }
      currentStep++;

      // 5. Import Planned Workouts
      if (Array.isArray(data.plannedWorkouts)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.plannedWorkouts.length} planned workouts...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const plannedWorkout of data.plannedWorkouts) {
          try {
            // Remove id, createdAt, updatedAt for import
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...plannedToImportBase } = plannedWorkout;
            
            // Ensure dates are Date objects
            const plannedToImport = {
              ...plannedToImportBase,
              scheduledDate: plannedToImportBase.scheduledDate
                ? (typeof plannedToImportBase.scheduledDate === 'string'
                    ? new Date(plannedToImportBase.scheduledDate)
                    : plannedToImportBase.scheduledDate)
                : new Date(),
            };
            
            if (strategy === 'replace') {
              await plannedWorkoutService.createPlannedWorkout(userId, plannedToImport);
              result.details.plannedWorkouts.imported++;
              result.imported++;
            } else {
              // Merge: check if planned workout exists (by scheduledDate + name)
              const existingPlanned =
                await plannedWorkoutService.getAllPlannedWorkouts(userId);
              const scheduledDate = plannedToImport.scheduledDate;
              const exists = existingPlanned.some(
                (pw: PlannedWorkout) =>
                  pw.scheduledDate.getTime() === scheduledDate.getTime() &&
                  pw.workoutName === plannedWorkout.workoutName
              );
              if (!exists) {
                await plannedWorkoutService.createPlannedWorkout(userId, plannedToImport);
                result.details.plannedWorkouts.imported++;
                result.imported++;
              } else {
                result.details.plannedWorkouts.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const scheduledDate = plannedWorkout.scheduledDate 
              ? new Date(plannedWorkout.scheduledDate).toLocaleDateString()
              : 'Unknown date';
            const importError = createImportError(
              'data',
              'plannedWorkout',
              error,
              {
                recordId: plannedWorkout.id,
                recordName: scheduledDate
              }
            );
            result.errors.push(importError);
            result.details.plannedWorkouts.errors++;
            
            logger.error(`Failed to import planned workout ${plannedWorkout.id}`, {
              error,
              plannedWorkoutId: plannedWorkout.id,
              scheduledDate: plannedWorkout.scheduledDate,
              userId
            });
          }
        }
      }
      currentStep++;

      // 6. Import Workouts
      if (Array.isArray(data.workouts)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.workouts.length} workouts...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const workout of data.workouts) {
          try {
            // Remove id for import (will be auto-generated)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, ...workoutToImport } = workout;
            
            // Ensure dates are Date objects
            const workoutDate = workoutToImport.date 
              ? (typeof workoutToImport.date === 'string' 
                  ? new Date(workoutToImport.date) 
                  : workoutToImport.date)
              : new Date();
            const workoutStartTime = workoutToImport.startTime
              ? (typeof workoutToImport.startTime === 'string'
                  ? new Date(workoutToImport.startTime)
                  : workoutToImport.startTime)
              : workoutDate; // Default to workout date if not provided
            const workoutEndTime = workoutToImport.endTime
              ? (typeof workoutToImport.endTime === 'string'
                  ? new Date(workoutToImport.endTime)
                  : workoutToImport.endTime)
              : undefined;
            
            const workoutWithUserId = {
              ...workoutToImport,
              userId, // Ensure userId matches
              date: workoutDate,
              startTime: workoutStartTime,
              endTime: workoutEndTime,
            };

            if (strategy === 'replace') {
              await dataService.createWorkout(workoutWithUserId);
              result.details.workouts.imported++;
              result.imported++;
            } else {
              // Merge: check if workout exists (by date + exercises)
              const existingWorkouts = await dataService.getAllWorkouts(userId);
              const workoutDate = new Date(workout.date).toISOString().split('T')[0];
              const exists = existingWorkouts.some((w: Workout) => {
                const wDate = new Date(w.date).toISOString().split('T')[0];
                return (
                  wDate === workoutDate &&
                  JSON.stringify(w.exercises) ===
                    JSON.stringify(workout.exercises)
                );
              });
              if (!exists) {
                await dataService.createWorkout(workoutWithUserId);
                result.details.workouts.imported++;
                result.imported++;
              } else {
                result.details.workouts.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            // Convert date to Date object if it's a string
            let workoutDate = 'Unknown date';
            try {
              if (workout.date) {
                const date = typeof workout.date === 'string' ? new Date(workout.date) : workout.date;
                workoutDate = date.toLocaleDateString();
              }
            } catch (dateError) {
              logger.warn('Failed to parse workout date', { dateError, workoutDate: workout.date });
            }
            
            const importError = createImportError(
              'data',
              'workout',
              error,
              {
                recordId: workout.id?.toString(),
                recordName: workoutDate
              }
            );
            result.errors.push(importError);
            result.details.workouts.errors++;
            
            logger.error(`Failed to import workout ${workout.id}`, {
              error,
              workoutId: workout.id,
              workoutDate: workout.date,
              exerciseCount: workout.exercises?.length,
              userId
            });
          }
        }
      }
      currentStep++;

      // 7. Import Muscle Statuses
      if (Array.isArray(data.muscleStatuses)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.muscleStatuses.length} muscle statuses...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const status of data.muscleStatuses) {
          try {
            const statusToImport = {
              ...status,
              userId, // Ensure userId matches
            };

            if (strategy === 'replace') {
              await dbHelpers.upsertMuscleStatus(statusToImport);
              result.details.muscleStatuses.imported++;
              result.imported++;
            } else {
              // Merge: check if status exists (by muscle + userId)
              const existingStatuses =
                await dataService.getAllMuscleStatuses();
              const exists = existingStatuses.some(
                (s) => s.muscle === status.muscle && s.userId === userId
              );
              if (!exists) {
                await dbHelpers.upsertMuscleStatus(statusToImport);
                result.details.muscleStatuses.imported++;
                result.imported++;
              } else {
                result.details.muscleStatuses.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const importError = createImportError(
              'data',
              'muscleStatus',
              error,
              {
                recordId: status.muscle,
                recordName: status.muscle.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
              }
            );
            result.errors.push(importError);
            result.details.muscleStatuses.errors++;
            
            logger.error(`Failed to import muscle status for ${status.muscle}`, {
              error,
              muscle: status.muscle,
              userId
            });
          }
        }
      }
      currentStep++;

      // 8. Import Sleep Logs
      if (Array.isArray(data.sleepLogs)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.sleepLogs.length} sleep logs...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const log of data.sleepLogs) {
          try {
            // Ensure dates are Date objects
            const sleepDate = log.date
              ? (typeof log.date === 'string' ? new Date(log.date) : log.date)
              : new Date();
            const sleepBedtime = log.bedtime
              ? (typeof log.bedtime === 'string' ? new Date(log.bedtime) : log.bedtime)
              : sleepDate; // Default to sleep date if not provided
            const sleepWakeTime = log.wakeTime
              ? (typeof log.wakeTime === 'string' ? new Date(log.wakeTime) : log.wakeTime)
              : new Date(sleepDate.getTime() + 8 * 60 * 60 * 1000); // Default to 8 hours later if not provided
            
            const logToImport = {
              ...log,
              userId, // Ensure userId matches
              date: sleepDate,
              bedtime: sleepBedtime,
              wakeTime: sleepWakeTime,
            };

            if (strategy === 'replace') {
              await sleepRecoveryService.saveSleepLog(logToImport);
              result.details.sleepLogs.imported++;
              result.imported++;
            } else {
              // Merge: check if log exists (by date + userId)
              const existing = await sleepRecoveryService.getSleepLog(
                userId,
                logToImport.date
              );
              if (!existing) {
                await sleepRecoveryService.saveSleepLog(logToImport);
                result.details.sleepLogs.imported++;
                result.imported++;
              } else {
                result.details.sleepLogs.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const logDate = log.date 
              ? (typeof log.date === 'string' ? new Date(log.date) : log.date).toLocaleDateString()
              : 'Unknown date';
            const importError = createImportError(
              'data',
              'sleepLog',
              error,
              {
                recordId: log.id?.toString(),
                recordName: logDate
              }
            );
            result.errors.push(importError);
            result.details.sleepLogs.errors++;
            
            logger.error(`Failed to import sleep log ${log.id}`, {
              error,
              logId: log.id,
              logDate: log.date,
              userId
            });
          }
        }
      }
      currentStep++;

      // 9. Import Recovery Logs
      if (Array.isArray(data.recoveryLogs)) {
        onProgress?.({
          percentage: (currentStep / totalSteps) * 100,
          currentOperation: `Importing ${data.recoveryLogs.length} recovery logs...`,
          completedItems: currentStep,
          totalItems: totalSteps,
        });
        for (const log of data.recoveryLogs) {
          try {
            // Ensure dates are Date objects
            const logToImport = {
              ...log,
              userId, // Ensure userId matches
              date: log.date
                ? (typeof log.date === 'string' ? new Date(log.date) : log.date)
                : new Date(),
            };

            if (strategy === 'replace') {
              await sleepRecoveryService.saveRecoveryLog(logToImport);
              result.details.recoveryLogs.imported++;
              result.imported++;
            } else {
              // Merge: check if log exists (by date + userId)
              const existing = await sleepRecoveryService.getRecoveryLog(
                userId,
                logToImport.date
              );
              if (!existing) {
                await sleepRecoveryService.saveRecoveryLog(logToImport);
                result.details.recoveryLogs.imported++;
                result.imported++;
              } else {
                result.details.recoveryLogs.skipped++;
                result.skipped++;
              }
            }
          } catch (error) {
            const logDate = log.date 
              ? (typeof log.date === 'string' ? new Date(log.date) : log.date).toLocaleDateString()
              : 'Unknown date';
            const importError = createImportError(
              'data',
              'recoveryLog',
              error,
              {
                recordId: log.id?.toString(),
                recordName: logDate
              }
            );
            result.errors.push(importError);
            result.details.recoveryLogs.errors++;
            
            logger.error(`Failed to import recovery log ${log.id}`, {
              error,
              logId: log.id,
              logDate: log.date,
              userId
            });
          }
        }
      }

      onProgress?.({
        percentage: 100,
        currentOperation: 'Import complete',
        completedItems: totalSteps - 1,
        totalItems: totalSteps - 1,
      });

      // Note: Imported data is saved to IndexedDB only by default
      // Sync to Supabase/MongoDB will happen automatically via the normal sync mechanism
      // (debounced sync triggered by dataService events)

      return result;
    } catch (error) {
      logger.error('Failed to import data', error);
      throw new Error(
        `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Import data from file
   * Parses file once and passes data through to importAllData
   */
  async importFromFile(
    userId: string,
    file: File,
    strategy: ImportStrategy,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    // Validate file size before reading
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new AppError(
        `The file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 50MB.`,
        'FILE_TOO_LARGE',
        undefined,
        undefined,
        { fileName: file.name, fileSize: file.size, maxSize }
      );
    }

    try {
      // SINGLE PARSE - parseExportFile does all JSON parsing and validation
      const data = await this.parseExportFile(file);

      // Pass parsed data directly - no more JSON.parse calls
      const result = await this.importAllData(
        userId,
        data,
        strategy,
        onProgress
      );

      return result;
    } catch (error) {
      logger.error('[importFromFile] Import failed:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Failed to import data. Please check the file format and try again.',
        'IMPORT_FAILED',
        undefined,
        error instanceof Error ? error : new Error(String(error)),
        { fileName: file.name }
      );
    }
  },

  /**
   * Legacy methods for backward compatibility
   */
  async exportData(userId: string): Promise<string> {
    return this.exportAllData(userId);
  },

  async importData(
    userId: string,
    jsonData: string
  ): Promise<{ imported: number; errors: string[] }> {
    const result = await this.importAllData(userId, jsonData, 'merge');
    return {
      imported: result.imported,
      errors: result.errors.map((e) => e.message),
    };
  },
};