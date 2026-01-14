import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  orderBy,
  QueryConstraint,
  DocumentReference,
  Firestore,
} from 'firebase/firestore';
import { getFirestoreDb, getFirebaseAuth } from './firebaseConfig';
import { dbHelpers } from './database';
import { requireUserId } from '@/utils/userIdValidation';
import { syncMetadataService } from './syncMetadataService';
import { errorRecovery } from './errorRecovery';
import { userContextManager } from './userContextManager';
import { errorLogService } from './errorLogService';
import { logger } from '@/utils/logger';
import {
  SyncOptions,
  SyncResult,
  SyncableTable,
  SyncDirection,
  SyncProgress,
  SyncStatus,
} from '@/types/sync';

const BATCH_SIZE = 500; // Firestore batch limit

type ProgressCallback = (progress: SyncProgress) => void;

/**
 * Convert a timestamp (number, Date, or Firestore Timestamp) to a local Date object
 */
function timestampToLocalDate(timestamp: number | Date | Timestamp | string | null | undefined): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) return timestamp.toDate();

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      logger.warn(`[timestampToLocalDate] Invalid date string: ${timestamp}`);
      return null;
    }
    return date;
  }

  if (typeof timestamp === 'number') {
    const MIN_TIMESTAMP_MS = 946684800000; // Jan 1, 2000 in milliseconds
    if (timestamp < MIN_TIMESTAMP_MS && timestamp > 0) {
      timestamp = timestamp * 1000;
    }

    const date = new Date(timestamp);
    const year = date.getFullYear();
    if (year < 2000 || year > 2100) {
      logger.warn(`[timestampToLocalDate] Date out of reasonable range (${year}): ${timestamp}`);
      return null;
    }

    return date;
  }

  return null;
}


/**
 * Firestore Sync Service
 *
 * Replaces MongoDB sync with Firestore-based sync while maintaining the same architecture:
 * - Bidirectional sync (push/pull)
 * - Offline-first with IndexedDB as source of truth
 * - Conflict resolution using version numbers
 * - Batch operations for efficiency
 * - User-scoped queries with Firestore subcollections
 */
class FirestoreSyncService {
  private isSyncing = false;
  private syncQueue: Promise<SyncResult[]> = Promise.resolve([]);
  private currentProgress: SyncProgress | null = null;
  private progressCallback: ProgressCallback | null = null;
  private recordsToPushAfterConflict: Map<string, Set<string | number>> = new Map();

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  getCurrentProgress(): SyncProgress | null {
    return this.currentProgress;
  }

  setProgressCallback(callback: ProgressCallback | null): void {
    this.progressCallback = callback;
  }

  private updateProgress(progress: Partial<SyncProgress>): void {
    if (this.currentProgress) {
      this.currentProgress = { ...this.currentProgress, ...progress };
      if (this.progressCallback) {
        this.progressCallback(this.currentProgress);
      }
    }
  }

  /**
   * Get Firestore collection name from IndexedDB table name
   */
  private getCollectionName(tableName: SyncableTable): string {
    const mapping: Record<SyncableTable, string> = {
      'workouts': 'workouts',
      'exercises': 'exercises', // Global or customExercises
      'workout_templates': 'templates',
      'planned_workouts': 'plannedWorkouts',
      'muscle_statuses': 'muscleStatus',
      'user_profiles': 'users',
      'settings': 'settings',
      'notifications': 'notifications',
      'sleep_logs': 'sleepLogs',
      'recovery_logs': 'recoveryLogs',
      'error_logs': 'errorLogs',
    };
    return mapping[tableName] || tableName;
  }

  /**
   * Main sync method - queues sync operations
   */
  async sync(userId: string, options: SyncOptions = {}): Promise<SyncResult[]> {
    logger.log('[FirestoreSyncService.sync] Starting sync for userId:', userId, 'options:', options);

    this.syncQueue = this.syncQueue
      .then(async () => {
        logger.log('[FirestoreSyncService.sync] Executing performSync...');
        return await this.performSync(userId, options);
      })
      .catch((error) => {
        logger.error('[FirestoreSyncService.sync] Sync failed:', error);
        this.isSyncing = false;
        this.currentProgress = null;
        throw error;
      });

    return this.syncQueue;
  }

  /**
   * Perform bidirectional sync
   */
  private async performSync(userId: string, options: SyncOptions = {}): Promise<SyncResult[]> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'performSync',
      additionalInfo: { direction: options.direction || 'bidirectional' },
    });

    if (this.isSyncing) {
      throw new Error('Sync is already in progress');
    }

    this.isSyncing = true;
    const results: SyncResult[] = [];
    const direction = options.direction || 'bidirectional';
    const tables = options.tables || [
      'workouts',
      'exercises',
      'workout_templates',
      'planned_workouts',
      'muscle_statuses',
      'user_profiles',
      'settings',
      'notifications',
      'sleep_logs',
      'recovery_logs',
      'error_logs',
    ];

    this.currentProgress = {
      currentTable: null,
      totalTables: tables.length,
      completedTables: 0,
      currentOperation: 'Initializing sync...',
      recordsProcessed: 0,
      totalRecords: 0,
      percentage: 0,
    };

    try {
      logger.log('[FirestoreSyncService.performSync] Setting userId context...');
      userContextManager.setUserId(validatedUserId);

      // Ensure Firebase authentication
      await this.ensureFirebaseAuth(validatedUserId);

      // Filter tables by type
      const independentTables = tables.filter((t) =>
        !['user_profiles', 'settings', 'notifications', 'error_logs'].includes(t)
      );
      const dependentTables = tables.filter((t) => ['user_profiles', 'settings'].includes(t));
      const pullOnlyTables = tables.filter((t) => t === 'notifications');

      // Sync independent tables in parallel
      logger.log('[FirestoreSyncService.performSync] Syncing independent tables:', independentTables);
      const independentPromises = independentTables.map(async (table) => {
        logger.log(`[FirestoreSyncService.performSync] Syncing table: ${table}`);
        try {
          const result = await this.syncTable(validatedUserId, table, direction, options);
          this.updateProgress({
            completedTables: results.length + 1,
            percentage: Math.round(((results.length + 1) / tables.length) * 100),
          });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`[FirestoreSyncService.performSync] Error syncing table ${table}:`, errorMessage);

          await errorLogService
            .logSyncError(
              validatedUserId,
              table,
              'all',
              error instanceof Error ? error : new Error(errorMessage),
              'read',
              { direction }
            )
            .catch((logError) => {
              logger.error('Failed to log sync error:', logError);
            });

          return {
            tableName: table,
            direction,
            status: 'error' as SyncStatus,
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [
              {
                tableName: table,
                recordId: 'all',
                error: errorMessage,
                timestamp: new Date(),
                operation: 'read' as const,
              },
            ],
            duration: 0,
          };
        }
      });

      const independentResults = await Promise.all(independentPromises);
      results.push(...independentResults);

      // Sync dependent tables sequentially
      for (const table of dependentTables) {
        this.updateProgress({
          currentTable: table,
          currentOperation: `Syncing ${table}...`,
        });

        try {
          const result = await this.syncTable(validatedUserId, table, direction, options);
          results.push(result);
          this.updateProgress({
            completedTables: results.length,
            percentage: Math.round((results.length / tables.length) * 100),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            tableName: table,
            direction,
            status: 'error',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [
              {
                tableName: table,
                recordId: 'all',
                error: errorMessage,
                timestamp: new Date(),
                operation: 'read',
              },
            ],
            duration: 0,
          });

          await errorLogService
            .logSyncError(
              validatedUserId,
              table,
              'all',
              error instanceof Error ? error : new Error(errorMessage),
              'read',
              { direction }
            )
            .catch(() => {});
        }
      }

      // Sync pull-only tables
      for (const table of pullOnlyTables) {
        this.updateProgress({
          currentTable: table,
          currentOperation: `Pulling ${table}...`,
        });

        try {
          const result = await this.syncTable(validatedUserId, table, 'pull', options);
          results.push(result);
          this.updateProgress({
            completedTables: results.length,
            percentage: Math.round((results.length / tables.length) * 100),
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            tableName: table,
            direction: 'pull',
            status: 'error',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [
              {
                tableName: table,
                recordId: 'all',
                error: errorMessage,
                timestamp: new Date(),
                operation: 'read',
              },
            ],
            duration: 0,
          });
        }
      }

      // Log errors if any
      const hasErrors = results.some((result) => result.errors && result.errors.length > 0);
      if (hasErrors) {
        try {
          await errorLogService.logError({
            userId: validatedUserId,
            errorType: 'sync_error',
            errorMessage: 'Some sync errors occurred',
            operation: 'sync',
            severity: 'error',
            context: {
              totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
              tablesWithErrors: results
                .filter((r) => r.errors && r.errors.length > 0)
                .map((r) => ({
                  table: r.tableName,
                  errorCount: r.errors.length,
                  direction: r.direction,
                })),
            },
          });
        } catch (logError) {
          logger.error('Failed to log sync summary error:', logError);
        }
      }
    } catch (error) {
      logger.error('[FirestoreSyncService.performSync] Sync error:', error);
      throw error;
    } finally {
      this.isSyncing = false;
      this.currentProgress = null;
      logger.log('[FirestoreSyncService.performSync] Sync completed, results count:', results.length);
    }

    return results;
  }

  /**
   * Ensure Firebase is authenticated
   */
  private async ensureFirebaseAuth(userId: string): Promise<void> {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    // Check if already authenticated
    if (currentUser) {
      // Verify it's the correct user
      if (currentUser.uid === userId) {
        logger.log('[FirestoreSyncService] Firebase already authenticated for user:', userId);
        return;
      } else {
        logger.log('[FirestoreSyncService] Firebase authenticated for different user');
        throw new Error('Firebase authenticated for different user. Please log out and log in again.');
      }
    }

    // User is not authenticated
    throw new Error('Firebase user not authenticated. Please log in again.');
  }

  /**
   * Sync a single table
   */
  private async syncTable(
    userId: string,
    table: SyncableTable,
    direction: SyncDirection,
    options: SyncOptions
  ): Promise<SyncResult> {
    return await errorRecovery.withRetry(
      async () => {
        if (direction === 'bidirectional') {
          return await this.syncBidirectional(userId, table, options);
        } else if (direction === 'push') {
          return await this.syncPush(userId, table, options);
        } else {
          return await this.syncPull(userId, table, options);
        }
      },
      {
        maxRetries: options.maxRetries ?? 3,
        retryableErrors: (error) => {
          const message = error.message.toLowerCase();
          return (
            message.includes('network') || message.includes('timeout') || message.includes('temporary')
          );
        },
      }
    );
  }

  /**
   * Bidirectional sync (pull then push)
   */
  private async syncBidirectional(
    userId: string,
    tableName: SyncableTable,
    options: SyncOptions
  ): Promise<SyncResult> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'syncBidirectional',
      additionalInfo: { tableName },
    });

    const startTime = Date.now();
    await syncMetadataService.updateSyncStatus(tableName, validatedUserId, 'syncing');

    try {
      const pullResult = await this.syncPull(validatedUserId, tableName, options);
      const pushResult = await this.syncPush(validatedUserId, tableName, options);

      const result: SyncResult = {
        tableName,
        direction: 'bidirectional',
        status: pullResult.status === 'error' || pushResult.status === 'error' ? 'error' : 'success',
        recordsProcessed: pullResult.recordsProcessed + pushResult.recordsProcessed,
        recordsCreated: pullResult.recordsCreated + pushResult.recordsCreated,
        recordsUpdated: pullResult.recordsUpdated + pushResult.recordsUpdated,
        recordsDeleted: pullResult.recordsDeleted + pushResult.recordsDeleted,
        conflicts: pullResult.conflicts + pushResult.conflicts,
        errors: [...pullResult.errors, ...pushResult.errors],
        duration: Date.now() - startTime,
      };

      await syncMetadataService.updateSyncStatus(
        tableName,
        validatedUserId,
        result.status === 'error' ? 'error' : 'success'
      );

      if (result.status === 'success') {
        await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'both');
      }

      return result;
    } catch (error) {
      await syncMetadataService.updateSyncStatus(
        tableName,
        userId,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  /**
   * Pull records from Firestore to IndexedDB
   */
  private async syncPull(
    userId: string,
    tableName: SyncableTable,
    options: SyncOptions
  ): Promise<SyncResult> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'syncPull',
      additionalInfo: { tableName },
    });

    const startTime = Date.now();
    const result: SyncResult = {
      tableName,
      direction: 'pull',
      status: 'success',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
    };

    try {
      const metadata = await syncMetadataService.getLocalMetadata(tableName, validatedUserId);
      const lastPullAt = metadata?.lastPullAt || (options.forceFullSync ? null : undefined);

      const remoteRecords = await this.fetchRemoteRecords(
        validatedUserId,
        tableName,
        lastPullAt ? new Date(lastPullAt) : undefined
      );

      this.updateProgress({
        currentOperation: `Pulling ${remoteRecords.length} records from ${tableName}...`,
        totalRecords: remoteRecords.length,
      });

      for (const remoteRecord of remoteRecords) {
        try {
          const conflict = await this.resolveConflict(validatedUserId, tableName, remoteRecord, 'pull');

          if (conflict) {
            result.conflicts++;
            await syncMetadataService.incrementConflictCount(tableName, validatedUserId);
          }

          const applyResult = await this.applyRemoteRecord(validatedUserId, tableName, remoteRecord);

          if (applyResult.conflictHandled && !conflict) {
            result.conflicts++;
            await syncMetadataService.incrementConflictCount(tableName, validatedUserId);
          }

          result.recordsProcessed++;
          result.recordsCreated++;
          this.updateProgress({
            recordsProcessed: result.recordsProcessed,
          });
        } catch (error) {
          const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            tableName,
            recordId,
            error: errorMessage,
            timestamp: new Date(),
            operation: 'read',
          });

          await errorLogService
            .logSyncError(
              validatedUserId,
              tableName,
              recordId,
              error instanceof Error ? error : new Error(errorMessage),
              'read'
            )
            .catch(() => {});
        }
      }

      result.duration = Date.now() - startTime;

      if (result.status === 'success') {
        await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'pull');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'error';
      result.errors.push({
        tableName,
        recordId: 'all',
        error: errorMessage,
        timestamp: new Date(),
        operation: 'read',
      });
      result.duration = Date.now() - startTime;

      await errorLogService
        .logSyncError(
          validatedUserId,
          tableName,
          'all',
          error instanceof Error ? error : new Error(errorMessage),
          'read'
        )
        .catch(() => {});

      return result;
    }
  }

  /**
   * Push records from IndexedDB to Firestore
   */
  private async syncPush(
    userId: string,
    tableName: SyncableTable,
    options: SyncOptions
  ): Promise<SyncResult> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'syncPush',
      additionalInfo: { tableName },
    });

    logger.log(`[FirestoreSyncService.syncPush] Starting push sync for table: ${tableName}, userId: ${validatedUserId}`);

    const startTime = Date.now();
    const result: SyncResult = {
      tableName,
      direction: 'push',
      status: 'success',
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
    };

    try {
      const metadata = await syncMetadataService.getLocalMetadata(tableName, validatedUserId);
      const lastPushAt = metadata?.lastPushAt || (options.forceFullSync ? null : undefined);

      const localRecords = await this.fetchLocalRecords(
        validatedUserId,
        tableName,
        lastPushAt ? new Date(lastPushAt) : undefined
      );

      this.updateProgress({
        currentOperation: `Pushing ${localRecords.length} records to ${tableName}...`,
        totalRecords: localRecords.length,
      });

      // Process in batches (Firestore limit is 500)
      const batches = [];
      for (let i = 0; i < localRecords.length; i += BATCH_SIZE) {
        batches.push(localRecords.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        const db = getFirestoreDb();
        const firestoreBatch = writeBatch(db);
        let batchCount = 0;

        for (const localRecord of batch) {
          try {
            const convertedRecord = this.convertToFirestoreFormat(tableName, localRecord);
            const docRef = this.getDocumentReference(db, tableName, validatedUserId, convertedRecord);

            // Check for conflicts before writing
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const remoteData = docSnap.data();
              const conflict = this.detectVersionConflict(localRecord, remoteData);

              if (conflict) {
                result.conflicts++;
                await syncMetadataService.incrementConflictCount(tableName, validatedUserId);
                logger.warn(`[FirestoreSyncService.syncPush] Conflict detected for ${tableName} record:`, this.getRecordId(localRecord, tableName));
                // Local-first strategy: overwrite remote with local
              }
            }

            firestoreBatch.set(docRef, convertedRecord, { merge: true });
            batchCount++;
            result.recordsProcessed++;
            result.recordsUpdated++;

            this.updateProgress({
              recordsProcessed: result.recordsProcessed,
            });
          } catch (error) {
            const recordId = this.getRecordId(localRecord, tableName);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({
              tableName,
              recordId,
              error: errorMessage,
              timestamp: new Date(),
              operation: 'write',
            });

            await errorLogService
              .logSyncError(
                validatedUserId,
                tableName,
                recordId,
                error instanceof Error ? error : new Error(errorMessage),
                'write'
              )
              .catch(() => {});
          }
        }

        // Commit batch
        if (batchCount > 0) {
          await firestoreBatch.commit();
          logger.log(`[FirestoreSyncService.syncPush] Committed batch of ${batchCount} records for ${tableName}`);
        }
      }

      result.duration = Date.now() - startTime;

      if (result.status === 'success') {
        await syncMetadataService.updateLastSyncTime(tableName, validatedUserId, 'push');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.status = 'error';
      result.errors.push({
        tableName,
        recordId: 'all',
        error: errorMessage,
        timestamp: new Date(),
        operation: 'write',
      });
      result.duration = Date.now() - startTime;

      await errorLogService
        .logSyncError(
          validatedUserId,
          tableName,
          'all',
          error instanceof Error ? error : new Error(errorMessage),
          'write'
        )
        .catch(() => {});

      return result;
    }
  }

  /**
   * Fetch remote records from Firestore
   */
  private async fetchRemoteRecords(
    userId: string,
    tableName: SyncableTable,
    since?: Date
  ): Promise<unknown[]> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'fetchRemoteRecords',
      additionalInfo: { tableName },
    });

    logger.debug(
      `[FirestoreSyncService.fetchRemoteRecords] Fetching ${tableName} from Firestore for userId: ${validatedUserId}`,
      since ? `since ${since.toISOString()}` : ''
    );

    const db = getFirestoreDb();
    const collectionName = this.getCollectionName(tableName);

    // Special handling for user_profiles (single document)
    if (tableName === 'user_profiles') {
      const docRef = doc(db, 'users', validatedUserId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return [{ id: docSnap.id, ...docSnap.data() }];
      }
      return [];
    }

    // Special handling for settings (single document in subcollection)
    if (tableName === 'settings') {
      const docRef = doc(db, 'users', validatedUserId, 'settings', 'appSettings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return [{ key: 'appSettings', ...docSnap.data() }];
      }
      return [];
    }

    // Special handling for global exercises
    if (tableName === 'exercises') {
      // Fetch both global exercises and custom exercises
      const globalExercisesQuery = query(collection(db, 'exercises'));
      const customExercisesQuery = query(collection(db, 'users', validatedUserId, 'customExercises'));

      const [globalSnapshot, customSnapshot] = await Promise.all([
        getDocs(globalExercisesQuery),
        getDocs(customExercisesQuery),
      ]);

      const records: unknown[] = [];
      globalSnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });
      customSnapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() });
      });

      return records;
    }

    // User-scoped subcollection query
    const constraints: QueryConstraint[] = [];

    if (since) {
      constraints.push(where('updatedAt', '>=', Timestamp.fromDate(since)));
    }

    constraints.push(orderBy('updatedAt', 'asc'));

    const collectionRef = collection(db, 'users', validatedUserId, collectionName);
    const q = query(collectionRef, ...constraints);
    const querySnapshot = await getDocs(q);

    const records: unknown[] = [];
    querySnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    logger.debug(
      `[FirestoreSyncService.fetchRemoteRecords] Fetched ${records.length} records for ${tableName} (userId: ${validatedUserId})`
    );

    return records;
  }

  /**
   * Fetch local records from IndexedDB
   */
  private async fetchLocalRecords(
    userId: string,
    tableName: SyncableTable,
    since?: Date
  ): Promise<Record<string, unknown>[]> {
    const validatedUserId = requireUserId(userId, {
      functionName: 'fetchLocalRecords',
      additionalInfo: { tableName },
    });

    logger.debug(
      `[FirestoreSyncService.fetchLocalRecords] Fetching ${tableName} from IndexedDB for userId: ${validatedUserId}`,
      since ? `since ${since.toISOString()}` : ''
    );

    let records = await dbHelpers.getRecordsByUserId(tableName, validatedUserId);

    // Filter by updated date if since is provided
    if (since) {
      records = records.filter((record) => {
        const updatedAt = (record as Record<string, unknown>).updatedAt;
        if (!updatedAt) return true; // Include records without updatedAt
        const updatedDate = timestampToLocalDate(updatedAt);
        return updatedDate && updatedDate >= since;
      });
    }

    logger.debug(
      `[FirestoreSyncService.fetchLocalRecords] Fetched ${records.length} local records for ${tableName}`
    );

    return records;
  }

  /**
   * Get document reference for Firestore
   */
  private getDocumentReference(
    db: Firestore,
    tableName: SyncableTable,
    userId: string,
    record: Record<string, unknown>
  ): DocumentReference {
    const collectionName = this.getCollectionName(tableName);
    const recordId = this.getRecordId(record, tableName);

    // Special handling for user_profiles
    if (tableName === 'user_profiles') {
      return doc(db, 'users', userId);
    }

    // Special handling for settings
    if (tableName === 'settings') {
      return doc(db, 'users', userId, 'settings', 'appSettings');
    }

    // Special handling for exercises (global vs custom)
    if (tableName === 'exercises') {
      const isCustom = record.isCustom === true || record.userId === userId;
      if (isCustom) {
        return doc(db, 'users', userId, 'customExercises', recordId);
      } else {
        return doc(db, 'exercises', recordId);
      }
    }

    // User-scoped subcollection
    return doc(db, 'users', userId, collectionName, recordId);
  }

  /**
   * Convert IndexedDB record to Firestore format
   */
  private convertToFirestoreFormat(tableName: SyncableTable, record: Record<string, unknown>): Record<string, unknown> {
    const converted = { ...record };

    // Convert Date objects to Firestore Timestamps
    Object.keys(converted).forEach((key) => {
      const value = converted[key];
      if (value instanceof Date) {
        converted[key] = Timestamp.fromDate(value);
      } else if (Array.isArray(value)) {
        converted[key] = value.map((item) =>
          item instanceof Date ? Timestamp.fromDate(item) : item
        );
      }
    });

    // Add userId if not present (except for user_profiles)
    if (tableName !== 'user_profiles' && !converted.userId) {
      const userId = userContextManager.getUserId();
      if (userId) {
        converted.userId = userId;
      }
    }

    return converted;
  }

  /**
   * Convert Firestore record to IndexedDB format
   */
  private convertFromFirestoreFormat(tableName: SyncableTable, record: Record<string, unknown>): Record<string, unknown> {
    const converted = { ...record };

    // Convert Firestore Timestamps to Date objects
    Object.keys(converted).forEach((key) => {
      const value = converted[key];
      if (value instanceof Timestamp) {
        converted[key] = value.toDate();
      } else if (Array.isArray(value)) {
        converted[key] = value.map((item) => (item instanceof Timestamp ? item.toDate() : item));
      }
    });

    return converted;
  }

  /**
   * Apply remote record to IndexedDB
   */
  private async applyRemoteRecord(
    userId: string,
    tableName: SyncableTable,
    remoteRecord: unknown
  ): Promise<{ conflictHandled: boolean }> {
    const convertedRecord = this.convertFromFirestoreFormat(tableName, remoteRecord as Record<string, unknown>);
    await dbHelpers.upsertRecord(tableName, convertedRecord);
    return { conflictHandled: false };
  }

  /**
   * Resolve conflict between local and remote records
   */
  private async resolveConflict(
    userId: string,
    tableName: SyncableTable,
    remoteRecord: unknown,
    _direction: SyncDirection
  ): Promise<boolean> {
    const recordId = this.getRecordId(remoteRecord as Record<string, unknown>, tableName);
    const localRecord = await dbHelpers.getRecordById(tableName, recordId);

    if (!localRecord) {
      return false; // No conflict if local record doesn't exist
    }

    return this.detectVersionConflict(localRecord, remoteRecord as Record<string, unknown>);
  }

  /**
   * Detect version conflict
   */
  private detectVersionConflict(localRecord: Record<string, unknown>, remoteRecord: Record<string, unknown>): boolean {
    const localVersion = (localRecord.version as number) || 0;
    const remoteVersion = (remoteRecord.version as number) || 0;

    return localVersion !== remoteVersion;
  }

  /**
   * Get record ID from record
   */
  private getRecordId(record: Record<string, unknown>, _tableName: SyncableTable): string {
    return (record.id as string) || (record.key as string) || 'unknown';
  }
}

export const firestoreSyncService = new FirestoreSyncService();
