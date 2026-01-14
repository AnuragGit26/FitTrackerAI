/**
 * Legacy Data Importer
 *
 * Handles importing data from old Auth0 + MongoDB + Supabase exports
 * into the new Firebase system. Automatically handles:
 * - Auth0 user ID → Firebase UID conversion
 * - Missing fields and schema changes
 * - Old Supabase profile pictures (removed, need re-upload)
 * - Date format conversions
 */

import { db } from '@/services/database';
import { dataService } from '@/services/dataService';
import { userContextManager } from '@/services/userContextManager';
import { getFirebaseAuth } from '@/services/firebaseConfig';
import type { Workout, WorkoutTemplate, PlannedWorkout } from '@/types/workout';
import type { Exercise } from '@/types/exercise';
import type { MuscleStatus } from '@/types/muscle';
import type { SleepLog, RecoveryLog } from '@/types/sleep';
import { logger } from '@/utils/logger';

interface LegacyExportData {
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
    profilePicture?: string; // Old Supabase URL - will be removed
  };
}

interface ImportResult {
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
  warnings: string[];
  errors: string[];
  migration: {
    oldUserId: string;
    newUserId: string;
    isAuth0Migration: boolean;
    profilePictureRemoved: boolean;
  };
}

/**
 * Detect if user ID is from Auth0 (old system)
 */
function isAuth0UserId(userId: string): boolean {
  return userId.startsWith('auth0|') || userId.startsWith('google-oauth2|') || userId.startsWith('apple|');
}

/**
 * Get current Firebase user ID
 */
function getCurrentFirebaseUserId(): string | null {
  const auth = getFirebaseAuth();
  return auth.currentUser?.uid || null;
}

/**
 * Import legacy data with automatic migration
 * @param data - Legacy export data
 * @param options - Import options
 */
export async function importLegacyData(
  data: LegacyExportData,
  options: {
    clearExisting?: boolean;
    skipUserProfile?: boolean;
    skipSettings?: boolean;
    dryRun?: boolean;
    targetUserId?: string; // Override user ID (use current Firebase user if not provided)
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
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
    warnings: [],
    errors: [],
    migration: {
      oldUserId: '',
      newUserId: '',
      isAuth0Migration: false,
      profilePictureRemoved: false,
    },
  };

  logger.log('🔄 Legacy Data Import (Auth0 → Firebase Migration)');
  logger.log('Options:', options);
  logger.log('Data summary:', data.dataCounts);

  try {
    // Validate data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    // Extract old user ID from data
    let oldUserId = data.userProfile?.id;

    if (!oldUserId && data.workouts && data.workouts.length > 0) {
      // Fallback: extract from first workout
      oldUserId = data.workouts[0].userId;
      result.warnings.push('User profile missing, extracted user ID from workouts');
      logger.warn('⚠️  User profile missing, using userId from workouts:', oldUserId);
    }

    if (!oldUserId) {
      throw new Error('Cannot determine user ID from export data');
    }

    result.migration.oldUserId = oldUserId;

    // Determine target user ID (current Firebase user or override)
    let newUserId = options.targetUserId;

    if (!newUserId) {
      newUserId = getCurrentFirebaseUserId();
      if (!newUserId) {
        throw new Error('No Firebase user logged in. Please log in first, then import data.');
      }
      logger.log('✅ Using current Firebase user ID:', newUserId);
    }

    result.migration.newUserId = newUserId;
    result.migration.isAuth0Migration = isAuth0UserId(oldUserId);

    if (result.migration.isAuth0Migration) {
      logger.log('🔄 Auth0 → Firebase migration detected');
      logger.log(`   Old ID: ${oldUserId}`);
      logger.log(`   New ID: ${newUserId}`);
      result.warnings.push(`Migrating from Auth0 user ID (${oldUserId}) to Firebase UID (${newUserId})`);
    }

    // Set user context
    userContextManager.setUserId(newUserId);

    if (options.dryRun) {
      logger.log('🔍 DRY RUN MODE - No data will be imported');
      logger.log('   All imports will be simulated');
    }

    // Clear existing data if requested
    if (options.clearExisting && !options.dryRun) {
      logger.log('🗑️  Clearing existing data...');
      await clearAllData(newUserId);
      logger.log('✅ Existing data cleared');
    }

    // Import user profile (with migration)
    if (!options.skipUserProfile && data.userProfile && !options.dryRun) {
      try {
        logger.log('👤 Importing user profile...');

        // Remove old profile picture URL (Supabase storage no longer accessible)
        const profileToImport = { ...data.userProfile };
        if (profileToImport.profilePicture) {
          if (profileToImport.profilePicture.includes('supabase.co')) {
            logger.warn('⚠️  Removing old Supabase profile picture URL (no longer accessible)');
            logger.warn('   Users need to re-upload profile pictures');
            delete profileToImport.profilePicture;
            result.migration.profilePictureRemoved = true;
            result.warnings.push('Old profile picture removed (Supabase storage). Please re-upload.');
          }
        }

        // Update user ID to new Firebase UID
        profileToImport.id = newUserId;

        await dataService.updateUserProfile(profileToImport as Record<string, unknown> as Parameters<typeof dataService.updateUserProfile>[0]);
        result.imported.userProfile = true;
        logger.log('✅ User profile imported (migrated to Firebase UID)');
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

    // Import workouts (with user ID migration)
    if (data.workouts && Array.isArray(data.workouts)) {
      logger.log(`💪 Importing ${data.workouts.length} workouts...`);
      let imported = 0;

      for (const workout of data.workouts) {
        try {
          if (!options.dryRun) {
            // Convert date fields and migrate user ID
            const workoutToImport = {
              ...workout,
              date: workout.date instanceof Date ? workout.date : new Date(workout.date),
              startTime: workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime),
              endTime: workout.endTime ? (workout.endTime instanceof Date ? workout.endTime : new Date(workout.endTime)) : undefined,
              userId: newUserId, // Use new Firebase UID
              createdAt: workout.createdAt ? (workout.createdAt instanceof Date ? workout.createdAt : new Date(workout.createdAt)) : new Date(),
              updatedAt: new Date(), // Mark as updated now
            };

            await db.workouts.put(workoutToImport as Workout);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Workout ${workout.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import workout ${workout.id}:`, error);
        }
      }

      result.imported.workouts = imported;
      logger.log(`✅ Imported ${imported}/${data.workouts.length} workouts`);
    }

    // Import templates (with user ID migration)
    if (data.templates && Array.isArray(data.templates)) {
      logger.log(`📋 Importing ${data.templates.length} templates...`);
      let imported = 0;

      for (const template of data.templates) {
        try {
          if (!options.dryRun) {
            const templateToImport = {
              ...template,
              userId: newUserId, // Use new Firebase UID
              createdAt: template.createdAt ? (template.createdAt instanceof Date ? template.createdAt : new Date(template.createdAt)) : new Date(),
              updatedAt: new Date(),
            };

            await db.workoutTemplates.put(templateToImport as WorkoutTemplate);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import template ${template.id}:`, error);
        }
      }

      result.imported.templates = imported;
      logger.log(`✅ Imported ${imported}/${data.templates.length} templates`);
    }

    // Import planned workouts (with user ID migration)
    if (data.plannedWorkouts && Array.isArray(data.plannedWorkouts)) {
      logger.log(`📅 Importing ${data.plannedWorkouts.length} planned workouts...`);
      let imported = 0;

      for (const planned of data.plannedWorkouts) {
        try {
          if (!options.dryRun) {
            const plannedToImport = {
              ...planned,
              userId: newUserId, // Use new Firebase UID
              date: planned.date instanceof Date ? planned.date : new Date(planned.date),
              createdAt: planned.createdAt ? (planned.createdAt instanceof Date ? planned.createdAt : new Date(planned.createdAt)) : new Date(),
              updatedAt: new Date(),
            };

            await db.plannedWorkouts.put(plannedToImport as PlannedWorkout);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Planned workout ${planned.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import planned workout ${planned.id}:`, error);
        }
      }

      result.imported.plannedWorkouts = imported;
      logger.log(`✅ Imported ${imported}/${data.plannedWorkouts.length} planned workouts`);
    }

    // Import custom exercises (with user ID migration)
    if (data.customExercises && Array.isArray(data.customExercises)) {
      logger.log(`🏋️  Importing ${data.customExercises.length} custom exercises...`);
      let imported = 0;

      for (const exercise of data.customExercises) {
        try {
          if (!options.dryRun) {
            const exerciseToImport = {
              ...exercise,
              userId: newUserId, // Use new Firebase UID
              isCustom: true,
              createdAt: exercise.createdAt ? (exercise.createdAt instanceof Date ? exercise.createdAt : new Date(exercise.createdAt)) : new Date(),
              updatedAt: new Date(),
            };

            await db.exercises.put(exerciseToImport as Exercise);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Exercise ${exercise.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import exercise ${exercise.id}:`, error);
        }
      }

      result.imported.customExercises = imported;
      logger.log(`✅ Imported ${imported}/${data.customExercises.length} custom exercises`);
    }

    // Import muscle statuses (with user ID migration)
    if (data.muscleStatuses && Array.isArray(data.muscleStatuses)) {
      logger.log(`💪 Importing ${data.muscleStatuses.length} muscle statuses...`);
      let imported = 0;

      for (const status of data.muscleStatuses) {
        try {
          if (!options.dryRun) {
            const statusToImport = {
              ...status,
              userId: newUserId, // Use new Firebase UID
              lastWorked: status.lastWorked instanceof Date ? status.lastWorked : new Date(status.lastWorked),
              updatedAt: new Date(),
            };

            await db.muscleStatuses.put(statusToImport as MuscleStatus);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Muscle status ${status.muscle}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import muscle status ${status.muscle}:`, error);
        }
      }

      result.imported.muscleStatuses = imported;
      logger.log(`✅ Imported ${imported}/${data.muscleStatuses.length} muscle statuses`);
    }

    // Import sleep logs (with user ID migration)
    if (data.sleepLogs && Array.isArray(data.sleepLogs)) {
      logger.log(`😴 Importing ${data.sleepLogs.length} sleep logs...`);
      let imported = 0;

      for (const log of data.sleepLogs) {
        try {
          if (!options.dryRun) {
            const logToImport = {
              ...log,
              userId: newUserId, // Use new Firebase UID
              date: log.date instanceof Date ? log.date : new Date(log.date),
              bedtime: log.bedtime instanceof Date ? log.bedtime : new Date(log.bedtime),
              wakeTime: log.wakeTime instanceof Date ? log.wakeTime : new Date(log.wakeTime),
              createdAt: log.createdAt ? (log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt)) : new Date(),
              updatedAt: new Date(),
            };

            await db.sleepLogs.put(logToImport as SleepLog);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Sleep log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import sleep log ${log.id}:`, error);
        }
      }

      result.imported.sleepLogs = imported;
      logger.log(`✅ Imported ${imported}/${data.sleepLogs.length} sleep logs`);
    }

    // Import recovery logs (with user ID migration)
    if (data.recoveryLogs && Array.isArray(data.recoveryLogs)) {
      logger.log(`🔄 Importing ${data.recoveryLogs.length} recovery logs...`);
      let imported = 0;

      for (const log of data.recoveryLogs) {
        try {
          if (!options.dryRun) {
            const logToImport = {
              ...log,
              userId: newUserId, // Use new Firebase UID
              date: log.date instanceof Date ? log.date : new Date(log.date),
              createdAt: log.createdAt ? (log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt)) : new Date(),
              updatedAt: new Date(),
            };

            await db.recoveryLogs.put(logToImport as RecoveryLog);
            imported++;
          } else {
            imported++;
          }
        } catch (error) {
          result.errors.push(`Recovery log ${log.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          logger.error(`❌ Failed to import recovery log ${log.id}:`, error);
        }
      }

      result.imported.recoveryLogs = imported;
      logger.log(`✅ Imported ${imported}/${data.recoveryLogs.length} recovery logs`);
    }

    result.success = result.errors.length === 0;

    // Print summary
    logger.log('\n📊 Import Summary:');
    logger.log('Imported:', result.imported);
    logger.log('\n🔄 Migration Info:');
    logger.log(`  Old User ID: ${result.migration.oldUserId}`);
    logger.log(`  New User ID: ${result.migration.newUserId}`);
    logger.log(`  Auth0 Migration: ${result.migration.isAuth0Migration ? 'Yes' : 'No'}`);
    logger.log(`  Profile Picture Removed: ${result.migration.profilePictureRemoved ? 'Yes (re-upload needed)' : 'No'}`);

    if (result.warnings.length > 0) {
      logger.warn('\n⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        logger.warn(`${i + 1}. ${warning}`);
      });
    }

    if (result.errors.length > 0) {
      logger.error('\n❌ Errors encountered:');
      result.errors.forEach((error, i) => {
        logger.error(`${i + 1}. ${error}`);
      });
    }

    if (result.success) {
      logger.log('\n✅ Import completed successfully!');
      if (result.migration.isAuth0Migration) {
        logger.log('   Your data has been migrated from Auth0 to Firebase.');
        logger.log('   All workouts, templates, and settings are now available.');
        if (result.migration.profilePictureRemoved) {
          logger.log('   ⚠️  Please re-upload your profile picture in Profile settings.');
        }
      }
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
 */
async function clearAllData(userId: string): Promise<void> {
  logger.log('🗑️  Clearing all data for user:', userId);

  await db.transaction('rw', [
    db.workouts,
    db.workoutTemplates,
    db.plannedWorkouts,
    db.exercises,
    db.muscleStatuses,
    db.sleepLogs,
    db.recoveryLogs,
  ], async () => {
    const workouts = await db.workouts.where('userId').equals(userId).toArray();
    await db.workouts.bulkDelete(workouts.map(w => w.id));

    const templates = await db.workoutTemplates.where('userId').equals(userId).toArray();
    await db.workoutTemplates.bulkDelete(templates.map(t => t.id!));

    const planned = await db.plannedWorkouts.where('userId').equals(userId).toArray();
    await db.plannedWorkouts.bulkDelete(planned.map(p => p.id!));

    const exercises = await db.exercises.where('userId').equals(userId).toArray();
    await db.exercises.bulkDelete(exercises.map(e => e.id!));

    const muscles = await db.muscleStatuses.where('userId').equals(userId).toArray();
    await db.muscleStatuses.bulkDelete(muscles.map(m => m.id!));

    const sleepLogs = await db.sleepLogs.where('userId').equals(userId).toArray();
    await db.sleepLogs.bulkDelete(sleepLogs.map(s => s.id!));

    const recoveryLogs = await db.recoveryLogs.where('userId').equals(userId).toArray();
    await db.recoveryLogs.bulkDelete(recoveryLogs.map(r => r.id!));
  });

  logger.log('✅ Data cleared');
}

// Attach to window for console access
if (typeof window !== 'undefined') {
  (window as Window & {
    importLegacyData?: typeof importLegacyData;
  }).importLegacyData = importLegacyData;

  logger.log(`
  🔧 Legacy Data Importer loaded!

  Available function:
  - window.importLegacyData(data, options?)

  Example usage (from browser console):

  // 1. Load your old export file (copy-paste the JSON or use fetch)
  const data = { /* your exported Auth0 data */ };

  // 2. Import data (will auto-migrate Auth0 → Firebase)
  await window.importLegacyData(data, { clearExisting: true });

  // 3. Or test first with dry run
  await window.importLegacyData(data, { dryRun: true });

  Migration features:
  ✅ Auto-converts Auth0 user IDs to Firebase UIDs
  ✅ Removes old Supabase profile picture URLs
  ✅ Handles missing fields gracefully
  ✅ Uses currently logged-in Firebase user
  ✅ Clear migration logging and warnings
  `);
}
