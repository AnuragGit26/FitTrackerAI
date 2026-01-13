/**
 * Test Data Importer
 *
 * Utility to import real user data into IndexedDB for testing purposes.
 * Usage: Call window.importTestData(data) from browser console with your exported data.
 */

import { db } from '@/services/database';
import { dataService } from '@/services/dataService';
import { userContextManager } from '@/services/userContextManager';
import type { Workout, WorkoutTemplate, PlannedWorkout } from '@/types/workout';
import type { Exercise } from '@/types/exercise';
import type { MuscleStatus } from '@/types/muscle';
import type { SleepLog, RecoveryLog } from '@/types/sleep';
import { logger } from '@/utils/logger';

interface ExportData {
  version?: string;
  exportDate?: string;
  appVersion?: string;
  dataCounts?: {
    workouts?: number;
    templates?: number;
    plannedWorkouts?: number;
    customExercises?: number;
    muscleStatuses?: number;
    sleepLogs?: number;
    recoveryLogs?: number;
    settings?: number;
  };
  workouts?: Workout[];
  templates?: WorkoutTemplate[];
  plannedWorkouts?: PlannedWorkout[];
  customExercises?: Exercise[];
  muscleStatuses?: MuscleStatus[];
  sleepLogs?: SleepLog[];
  recoveryLogs?: RecoveryLog[];
  settings?: {
    appSettings?: unknown;
  };
  userProfile?: {
    id: string;
    name: string;
    experienceLevel?: string;
    goals?: string[];
    equipment?: string[];
    workoutFrequency?: number;
    preferredUnit?: string;
    defaultRestTime?: number;
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    profilePicture?: string;
  };
}

/**
 * Import test data into IndexedDB
 * @param data - Exported data object
 * @param options - Import options
 */
export async function importTestData(
  data: ExportData,
  options: {
    clearExisting?: boolean;
    skipUserProfile?: boolean;
    skipSettings?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<{
  success: boolean;
  imported: {
    workouts: number;
    templates: number;
    plannedWorkouts: number;
    customExercises: number;
    muscleStatuses: number;
    sleepLogs: number;
    recoveryLogs: number;
    userProfile: boolean;
    settings: boolean;
  };
  errors: string[];
}> {
  const result = {
    success: true,
    imported: {
      workouts: 0,
      templates: 0,
      plannedWorkouts: 0,
      customExercises: 0,
      muscleStatuses: 0,
      sleepLogs: 0,
      recoveryLogs: 0,
      userProfile: false,
      settings: false,
    },
    errors: [] as string[],
  };

  logger.log('🔄 Test Data Import');
  logger.log('Options:', options);
  logger.log('Data summary:', data.dataCounts);

  try {
    // Validate data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    if (!data.userProfile?.id) {
      throw new Error('User profile with ID is required');
    }

    const userId = data.userProfile.id;
    logger.log('📝 User ID:', userId);

    // Set user context
    userContextManager.setUserId(userId);

    if (options.dryRun) {
      logger.log('🔍 DRY RUN MODE - No data will be imported');
    }

    // Clear existing data if requested
    if (options.clearExisting && !options.dryRun) {
      logger.log('🗑️  Clearing existing data...');
      await clearAllData(userId);
      logger.log('✅ Existing data cleared');
    }

    // Import user profile
    if (!options.skipUserProfile && data.userProfile && !options.dryRun) {
      try {
        logger.log('👤 Importing user profile...');
        await dataService.updateUserProfile(data.userProfile as any);
        result.imported.userProfile = true;
        logger.log('✅ User profile imported');
      } catch (error) {
        result.errors.push(`User profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.error('❌ User profile import failed:', error);
      }
    }

    // Import settings
    if (!options.skipSettings && data.settings?.appSettings && !options.dryRun) {
      try {
        logger.log('⚙️  Importing settings...');
        await dataService.updateSetting('appSettings', data.settings.appSettings);
        result.imported.settings = true;
        logger.log('✅ Settings imported');
      } catch (error) {
        result.errors.push(`Settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.error('❌ Settings import failed:', error);
      }
    }

    // Import workouts
    if (data.workouts && Array.isArray(data.workouts)) {
      logger.log(`💪 Importing ${data.workouts.length} workouts...`);
      for (const workout of data.workouts) {
        try {
          if (!options.dryRun) {
            // Convert date fields to Date objects if they're strings
            const workoutToImport = {
              ...workout,
              date: workout.date instanceof Date ? workout.date : new Date(workout.date),
              startTime: workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime),
              endTime: workout.endTime ? (workout.endTime instanceof Date ? workout.endTime : new Date(workout.endTime)) : undefined,
              userId: workout.userId || userId,
            };

            // Use bulk insert for better performance
            await db.workouts.put(workoutToImport as any);
          }
          result.imported.workouts++;
        } catch (error) {
          result.errors.push(`Workout ${workout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import workout ${workout.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.workouts} workouts`);
    }

    // Import templates
    if (data.templates && Array.isArray(data.templates)) {
      logger.log(`📋 Importing ${data.templates.length} templates...`);
      for (const template of data.templates) {
        try {
          if (!options.dryRun) {
            await db.workoutTemplates.put({
              ...template,
              userId: template.userId || userId,
            } as any);
          }
          result.imported.templates++;
        } catch (error) {
          result.errors.push(`Template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import template ${template.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.templates} templates`);
    }

    // Import planned workouts
    if (data.plannedWorkouts && Array.isArray(data.plannedWorkouts)) {
      logger.log(`📅 Importing ${data.plannedWorkouts.length} planned workouts...`);
      for (const planned of data.plannedWorkouts) {
        try {
          if (!options.dryRun) {
            await db.plannedWorkouts.put({
              ...planned,
              userId: planned.userId || userId,
              date: planned.date instanceof Date ? planned.date : new Date(planned.date),
            } as any);
          }
          result.imported.plannedWorkouts++;
        } catch (error) {
          result.errors.push(`Planned workout ${planned.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import planned workout ${planned.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.plannedWorkouts} planned workouts`);
    }

    // Import custom exercises
    if (data.customExercises && Array.isArray(data.customExercises)) {
      logger.log(`🏋️  Importing ${data.customExercises.length} custom exercises...`);
      for (const exercise of data.customExercises) {
        try {
          if (!options.dryRun) {
            await db.exercises.put({
              ...exercise,
              userId: exercise.userId || userId,
              isCustom: true,
            } as any);
          }
          result.imported.customExercises++;
        } catch (error) {
          result.errors.push(`Exercise ${exercise.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import exercise ${exercise.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.customExercises} custom exercises`);
    }

    // Import muscle statuses
    if (data.muscleStatuses && Array.isArray(data.muscleStatuses)) {
      logger.log(`💪 Importing ${data.muscleStatuses.length} muscle statuses...`);
      for (const status of data.muscleStatuses) {
        try {
          if (!options.dryRun) {
            await db.muscleStatuses.put({
              ...status,
              userId: status.userId || userId,
              lastWorked: status.lastWorked instanceof Date ? status.lastWorked : new Date(status.lastWorked),
            } as any);
          }
          result.imported.muscleStatuses++;
        } catch (error) {
          result.errors.push(`Muscle status ${status.muscle}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import muscle status ${status.muscle}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.muscleStatuses} muscle statuses`);
    }

    // Import sleep logs
    if (data.sleepLogs && Array.isArray(data.sleepLogs)) {
      logger.log(`😴 Importing ${data.sleepLogs.length} sleep logs...`);
      for (const log of data.sleepLogs) {
        try {
          if (!options.dryRun) {
            await db.sleepLogs.put({
              ...log,
              userId: log.userId || userId,
              date: log.date instanceof Date ? log.date : new Date(log.date),
              bedtime: log.bedtime instanceof Date ? log.bedtime : new Date(log.bedtime),
              wakeTime: log.wakeTime instanceof Date ? log.wakeTime : new Date(log.wakeTime),
            } as any);
          }
          result.imported.sleepLogs++;
        } catch (error) {
          result.errors.push(`Sleep log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import sleep log ${log.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.sleepLogs} sleep logs`);
    }

    // Import recovery logs
    if (data.recoveryLogs && Array.isArray(data.recoveryLogs)) {
      logger.log(`🔄 Importing ${data.recoveryLogs.length} recovery logs...`);
      for (const log of data.recoveryLogs) {
        try {
          if (!options.dryRun) {
            await db.recoveryLogs.put({
              ...log,
              userId: log.userId || userId,
              date: log.date instanceof Date ? log.date : new Date(log.date),
            } as any);
          }
          result.imported.recoveryLogs++;
        } catch (error) {
          result.errors.push(`Recovery log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import recovery log ${log.id}:`, error);
        }
      }
      logger.log(`✅ Imported ${result.imported.recoveryLogs} recovery logs`);
    }

    result.success = result.errors.length === 0;

    logger.log('\n📊 Import Summary:');
    logger.log(result.imported);

    if (result.errors.length > 0) {
      logger.warn('\n⚠️  Errors encountered:');
      result.errors.forEach((error, i) => {
        logger.warn(`${i + 1}. ${error}`);
      });
    }

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    logger.error('❌ Import failed:', error);
    return result;
  }
}

/**
 * Clear all data for a specific user
 * @param userId - User ID to clear data for
 */
export async function clearAllData(userId: string): Promise<void> {
  logger.log('🗑️  Clearing all data for user:', userId);

  await db.transaction('rw', [
    db.workouts,
    db.workoutTemplates,
    db.plannedWorkouts,
    db.muscleStatuses,
    db.sleepLogs,
    db.recoveryLogs,
  ], async () => {
    // Clear workouts
    const workouts = await db.workouts.where('userId').equals(userId).toArray();
    await db.workouts.bulkDelete(workouts.map(w => w.id));

    // Clear templates
    const templates = await db.workoutTemplates.where('userId').equals(userId).toArray();
    await db.workoutTemplates.bulkDelete(templates.map(t => t.id!));

    // Clear planned workouts
    const planned = await db.plannedWorkouts.where('userId').equals(userId).toArray();
    await db.plannedWorkouts.bulkDelete(planned.map(p => p.id!));

    // Clear muscle statuses
    const muscles = await db.muscleStatuses.where('userId').equals(userId).toArray();
    await db.muscleStatuses.bulkDelete(muscles.map(m => m.id!));

    // Clear sleep logs
    const sleepLogs = await db.sleepLogs.where('userId').equals(userId).toArray();
    await db.sleepLogs.bulkDelete(sleepLogs.map(s => s.id!));

    // Clear recovery logs
    const recoveryLogs = await db.recoveryLogs.where('userId').equals(userId).toArray();
    await db.recoveryLogs.bulkDelete(recoveryLogs.map(r => r.id!));
  });

  logger.log('✅ Data cleared');
}

/**
 * Export current data for backup or migration
 * @param userId - User ID to export data for
 */
export async function exportUserData(userId: string): Promise<ExportData> {
  logger.log('📦 Exporting data for user:', userId);

  const workouts = await db.workouts.where('userId').equals(userId).toArray();
  const templates = await db.workoutTemplates.where('userId').equals(userId).toArray();
  const plannedWorkouts = await db.plannedWorkouts.where('userId').equals(userId).toArray();
  const customExercises = await db.exercises.where('userId').equals(userId).and(e => e.isCustom === true).toArray();
  const muscleStatuses = await db.muscleStatuses.where('userId').equals(userId).toArray();
  const sleepLogs = await db.sleepLogs.where('userId').equals(userId).toArray();
  const recoveryLogs = await db.recoveryLogs.where('userId').equals(userId).toArray();

  const userProfile = await dataService.getUserProfile(userId);
  const appSettings = await dataService.getSetting('appSettings');

  const data: ExportData = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    appVersion: '1.0.0',
    dataCounts: {
      workouts: workouts.length,
      templates: templates.length,
      plannedWorkouts: plannedWorkouts.length,
      customExercises: customExercises.length,
      muscleStatuses: muscleStatuses.length,
      sleepLogs: sleepLogs.length,
      recoveryLogs: recoveryLogs.length,
      settings: appSettings ? 1 : 0,
    },
    workouts,
    templates,
    plannedWorkouts,
    customExercises,
    muscleStatuses,
    sleepLogs,
    recoveryLogs,
    settings: appSettings ? { appSettings } : undefined,
    userProfile: userProfile ? userProfile as any : undefined,
  };

  logger.log('✅ Export complete');
  logger.log(data.dataCounts);

  return data;
}

// Attach to window for console access
if (typeof window !== 'undefined') {
  (window as any).importTestData = importTestData;
  (window as any).exportUserData = exportUserData;
  (window as any).clearAllData = clearAllData;

  logger.log(`
  🔧 Test Data Utilities loaded!

  Available functions:
  - window.importTestData(data, options?)
  - window.exportUserData(userId)
  - window.clearAllData(userId)

  Example usage:

  // Import data (replace existing)
  const data = { /* your exported data */ };
  await window.importTestData(data, { clearExisting: true });

  // Dry run (test without importing)
  await window.importTestData(data, { dryRun: true });

  // Export current data
  const exported = await window.exportUserData('your-user-id');
  logger.log(JSON.stringify(exported, null, 2));

  // Clear all data
  await window.clearAllData('your-user-id');
  `);
}
