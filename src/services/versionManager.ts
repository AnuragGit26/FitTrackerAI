import { SyncableTable } from '@/types/sync';

export interface VersionedRecord {
  version?: number;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface ConflictInfo {
  tableName: SyncableTable;
  recordId: string | number;
  localVersion: number;
  remoteVersion: number;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  hasConflict: boolean;
}

class VersionManager {
  /**
   * Initialize version for new record
   */
  initializeVersion<T extends VersionedRecord>(record: T): T {
    return {
      ...record,
      version: record.version ?? 1,
      updatedAt: record.updatedAt ?? new Date(),
    };
  }

  /**
   * Increment version for update
   */
  incrementVersion<T extends VersionedRecord>(record: T): T {
    return {
      ...record,
      version: (record.version ?? 1) + 1,
      updatedAt: new Date(),
    };
  }

  /**
   * Soft delete record
   */
  softDelete<T extends VersionedRecord>(record: T): T {
    return {
      ...record,
      deletedAt: new Date(),
      version: (record.version ?? 1) + 1,
      updatedAt: new Date(),
    };
  }

  /**
   * Restore soft-deleted record
   */
  restore<T extends VersionedRecord>(record: T): T {
    return {
      ...record,
      deletedAt: null,
      version: (record.version ?? 1) + 1,
      updatedAt: new Date(),
    };
  }

  /**
   * Check if record is deleted
   */
  isDeleted(record: VersionedRecord): boolean {
    return record.deletedAt !== null && record.deletedAt !== undefined;
  }

  /**
   * Detect conflict between local and remote versions
   */
  detectConflict(
    tableName: SyncableTable,
    recordId: string | number,
    local: VersionedRecord,
    remote: VersionedRecord
  ): ConflictInfo {
    const localVersion = local.version ?? 1;
    const remoteVersion = remote.version ?? 1;
    const localUpdatedAt = local.updatedAt ? new Date(local.updatedAt) : new Date(0);
    const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt) : new Date(0);

    // Conflict exists if versions differ and both have been updated
    const hasConflict = localVersion !== remoteVersion && 
                       localUpdatedAt.getTime() !== remoteUpdatedAt.getTime() &&
                       localUpdatedAt.getTime() > 0 &&
                       remoteUpdatedAt.getTime() > 0;

    return {
      tableName,
      recordId,
      localVersion,
      remoteVersion,
      localUpdatedAt,
      remoteUpdatedAt,
      hasConflict,
    };
  }

  /**
   * Resolve conflict using last-write-wins strategy
   */
  resolveConflictLastWriteWins<T extends VersionedRecord>(
    local: T,
    remote: T
  ): T {
    const localUpdatedAt = local.updatedAt ? new Date(local.updatedAt) : new Date(0);
    const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt) : new Date(0);

    if (remoteUpdatedAt > localUpdatedAt) {
      return remote as T;
    }
    return local;
  }

  /**
   * Resolve conflict using version-based strategy
   */
  resolveConflictByVersion<T extends VersionedRecord>(
    local: T,
    remote: T
  ): T {
    const localVersion = local.version ?? 1;
    const remoteVersion = remote.version ?? 1;

    if (remoteVersion > localVersion) {
      return remote as T;
    }
    return local;
  }

  /**
   * Resolve conflict prioritizing local data (local-first strategy)
   * Always returns local data, but marks it for push to remote
   * This ensures local changes are never lost and are synced to the database
   */
  resolveConflictLocalFirst<T extends VersionedRecord>(
    local: T,
    remote: T
  ): { record: T; shouldPush: boolean } {
    // Always keep local data - it represents the user's most recent work
    // Mark it for push to ensure it's synced to remote
    return {
      record: local,
      shouldPush: true
    };
  }

  /**
   * Merge records (three-way merge)
   */
  mergeRecords<T extends VersionedRecord>(
    _base: T,
    local: T,
    remote: T
  ): T {
    // Simple merge: prefer remote if it's newer, otherwise local
    const localUpdatedAt = local.updatedAt ? new Date(local.updatedAt) : new Date(0);
    const remoteUpdatedAt = remote.updatedAt ? new Date(remote.updatedAt) : new Date(0);

    if (remoteUpdatedAt > localUpdatedAt) {
      return {
        ...remote,
        version: Math.max(local.version ?? 1, remote.version ?? 1) + 1,
        updatedAt: new Date(),
      } as T;
    }

    return {
      ...local,
      version: Math.max(local.version ?? 1, remote.version ?? 1) + 1,
      updatedAt: new Date(),
    } as T;
  }

  /**
   * Compare versions
   */
  compareVersions(local: VersionedRecord, remote: VersionedRecord): number {
    const localVersion = local.version ?? 1;
    const remoteVersion = remote.version ?? 1;

    if (localVersion > remoteVersion) return 1;
    if (localVersion < remoteVersion) return -1;
    return 0;
  }

  /**
   * Check if update is allowed (optimistic locking)
   */
  canUpdate(
    current: VersionedRecord,
    incoming: VersionedRecord
  ): boolean {
    const currentVersion = current.version ?? 1;
    const incomingVersion = incoming.version ?? 1;

    // Allow update if incoming version is greater or equal
    // This prevents overwriting newer data with older data
    return incomingVersion >= currentVersion;
  }

  /**
   * Get next version number
   */
  getNextVersion(current: VersionedRecord): number {
    return (current.version ?? 1) + 1;
  }

  /**
   * Validate version consistency
   */
  validateVersion(record: VersionedRecord): boolean {
    if (record.version === undefined || record.version === null) {
      return false;
    }
    return record.version > 0;
  }

  /**
   * Create version snapshot for conflict resolution
   */
  createSnapshot<T extends VersionedRecord>(record: T): T {
    return {
      ...record,
      version: record.version ?? 1,
      updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
    };
  }
}

export const versionManager = new VersionManager();

