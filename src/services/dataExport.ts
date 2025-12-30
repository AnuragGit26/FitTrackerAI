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
  ProgressCallback,
} from '@/types/export';
import { logger } from '@/utils/logger';

const EXPORT_VERSION = '2.0.0';
const APP_VERSION = '1.0.0';

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
   * Validate export file before import
   */
  async validateExportFile(file: File): Promise<boolean> {
    try {
      if (!file.name.endsWith('.json')) {
        throw new Error('File must be a JSON file');
      }

      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      if (!data.version) {
        throw new Error('Invalid export file: missing version');
      }

      if (!data.exportDate) {
        throw new Error('Invalid export file: missing export date');
      }

      // Check if it's the new format (v2.0.0+) or old format
      if (data.version.startsWith('2.')) {
        // New format - should have all fields
        if (!Array.isArray(data.workouts)) {
          throw new Error('Invalid export file: workouts must be an array');
        }
      } else if (data.version.startsWith('1.')) {
        // Old format - still valid but limited
        if (!Array.isArray(data.workouts)) {
          throw new Error('Invalid export file: workouts must be an array');
        }
      } else {
        throw new Error(`Unsupported export version: ${data.version}`);
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate export file', error);
      throw error;
    }
  },

  /**
   * Preview import data before confirming
   */
  async previewImport(file: File): Promise<ImportPreview> {
    try {
      await this.validateExportFile(file);

      const text = await file.text();
      const data: ExportData = JSON.parse(text);

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
    } catch (error) {
      logger.error('Failed to preview import', error);
      throw new Error(
        `Failed to preview import: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Clear all user data (for replace strategy)
   */
  async clearUserData(userId: string): Promise<void> {
    try {
      // Delete all user-specific data
      const workouts = await dataService.getAllWorkouts(userId);
      for (const workout of workouts) {
        if (workout.id) {
          await dataService.deleteWorkout(workout.id);
        }
      }

      const templates = await templateService.getAllTemplates(userId);
      for (const template of templates) {
        await templateService.deleteTemplate(template.id);
      }

      const plannedWorkouts =
        await plannedWorkoutService.getAllPlannedWorkouts(userId);
      for (const plannedWorkout of plannedWorkouts) {
        await plannedWorkoutService.deletePlannedWorkout(plannedWorkout.id);
      }

      const allExercises = await dataService.getAllExercises();
      const customExercises = allExercises.filter(
        (ex) => ex.isCustom && ex.userId === userId
      );
      for (const exercise of customExercises) {
        await dataService.deleteExercise(exercise.id);
      }

      const allMuscleStatuses = await dataService.getAllMuscleStatuses();
      const muscleStatuses = allMuscleStatuses.filter(
        (ms) => ms.userId === userId
      );
      for (const status of muscleStatuses) {
        if (status.id) {
          await db.muscleStatuses.delete(status.id);
        }
      }

      const sleepLogs = await sleepRecoveryService.getAllSleepLogs(userId);
      for (const log of sleepLogs) {
        if (log.id) {
          await db.sleepLogs.delete(log.id);
        }
      }

      const recoveryLogs = await sleepRecoveryService.getAllRecoveryLogs(userId);
      for (const log of recoveryLogs) {
        if (log.id) {
          await db.recoveryLogs.delete(log.id);
        }
      }

      // Clear settings (but keep appSettings structure)
      await dataService.updateSetting('appSettings', {});

      logger.info(`Cleared all data for user ${userId}`);
    } catch (error) {
      logger.error('Failed to clear user data', error);
      throw new Error(
        `Failed to clear user data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },

  /**
   * Import all data from JSON with merge or replace strategy
   */
  async importAllData(
    userId: string,
    jsonData: string,
    strategy: ImportStrategy,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      const data: ExportData = JSON.parse(jsonData);
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

      // Validate version
      if (!data.version) {
        throw new Error('Invalid export file: missing version');
      }

      // If replace strategy, clear existing data first
      if (strategy === 'replace') {
        onProgress?.({
          percentage: 5,
          currentOperation: 'Clearing existing data...',
          completedItems: 0,
          totalItems: 9,
        });
        await this.clearUserData(userId);
      }

      const totalSteps = 9;
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
          result.errors.push({
            type: 'userProfile',
            message: `Failed to import user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          result.details.userProfile.error =
            error instanceof Error ? error.message : 'Unknown error';
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
          result.errors.push({
            type: 'settings',
            message: `Failed to import settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
          result.details.settings.errors++;
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
            result.errors.push({
              type: 'customExercise',
              message: `Failed to import exercise ${exercise.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: exercise.id,
            });
            result.details.customExercises.errors++;
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
            result.errors.push({
              type: 'template',
              message: `Failed to import template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: template.id,
            });
            result.details.templates.errors++;
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
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...plannedToImport } = plannedWorkout;
            
            if (strategy === 'replace') {
              await plannedWorkoutService.createPlannedWorkout(userId, plannedToImport);
              result.details.plannedWorkouts.imported++;
              result.imported++;
            } else {
              // Merge: check if planned workout exists (by scheduledDate + name)
              const existingPlanned =
                await plannedWorkoutService.getAllPlannedWorkouts(userId);
              const exists = existingPlanned.some(
                (pw: PlannedWorkout) =>
                  pw.scheduledDate.getTime() ===
                    new Date(plannedWorkout.scheduledDate).getTime() &&
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
            result.errors.push({
              type: 'plannedWorkout',
              message: `Failed to import planned workout: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: plannedWorkout.id,
            });
            result.details.plannedWorkouts.errors++;
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
            const workoutWithUserId = {
              ...workoutToImport,
              userId, // Ensure userId matches
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
            result.errors.push({
              type: 'workout',
              message: `Failed to import workout: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: workout.id?.toString(),
            });
            result.details.workouts.errors++;
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
            result.errors.push({
              type: 'muscleStatus',
              message: `Failed to import muscle status: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: status.muscle,
            });
            result.details.muscleStatuses.errors++;
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
            const logToImport = {
              ...log,
              userId, // Ensure userId matches
            };

            if (strategy === 'replace') {
              await sleepRecoveryService.saveSleepLog(logToImport);
              result.details.sleepLogs.imported++;
              result.imported++;
            } else {
              // Merge: check if log exists (by date + userId)
              const existing = await sleepRecoveryService.getSleepLog(
                userId,
                new Date(log.date)
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
            result.errors.push({
              type: 'sleepLog',
              message: `Failed to import sleep log: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: log.id?.toString(),
            });
            result.details.sleepLogs.errors++;
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
            const logToImport = {
              ...log,
              userId, // Ensure userId matches
            };

            if (strategy === 'replace') {
              await sleepRecoveryService.saveRecoveryLog(logToImport);
              result.details.recoveryLogs.imported++;
              result.imported++;
            } else {
              // Merge: check if log exists (by date + userId)
              const existing = await sleepRecoveryService.getRecoveryLog(
                userId,
                new Date(log.date)
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
            result.errors.push({
              type: 'recoveryLog',
              message: `Failed to import recovery log: ${error instanceof Error ? error.message : 'Unknown error'}`,
              recordId: log.id?.toString(),
            });
            result.details.recoveryLogs.errors++;
          }
        }
      }

      onProgress?.({
        percentage: 100,
        currentOperation: 'Import complete',
        completedItems: totalSteps,
        totalItems: totalSteps,
      });

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
   * Handles mobile devices and large files
   */
  async importFromFile(
    userId: string,
    file: File,
    strategy: ImportStrategy,
    onProgress?: ProgressCallback
  ): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      // Validate file size before reading
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        reject(new Error('File is too large. Maximum size is 50MB.'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result;
          if (typeof text !== 'string') {
            reject(new Error('Failed to read file as text'));
            return;
          }
          
          const result = await this.importAllData(
            userId,
            text,
            strategy,
            onProgress
          );
          resolve(result);
        } catch (error) {
          logger.error('Import failed', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        logger.error('FileReader error', error);
        reject(new Error('Failed to read file. Please ensure the file is not corrupted.'));
      };
      
      reader.onabort = () => {
        reject(new Error('File reading was aborted'));
      };
      
      // Use readAsText with UTF-8 encoding for proper JSON parsing
      try {
        reader.readAsText(file, 'UTF-8');
      } catch (error) {
        logger.error('Failed to start file read', error);
        reject(new Error('Failed to read file. Please try again.'));
      }
    });
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
