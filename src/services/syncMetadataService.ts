import { dbHelpers } from './database';
import { SyncMetadata, SyncableTable, SyncStatus } from '@/types/sync';
import { LocalSyncMetadata } from './database';

class SyncMetadataService {
    async getLocalMetadata(
        tableName: SyncableTable,
        userId: string
    ): Promise<LocalSyncMetadata | null> {
        try {
            const metadata = await dbHelpers.getSyncMetadata(tableName, userId);
            return metadata || null;
        } catch (error) {
            console.error(`Failed to get local sync metadata for ${tableName}:`, error);
            return null;
        }
    }

    async setLocalMetadata(
        tableName: SyncableTable,
        userId: string,
        metadata: Partial<LocalSyncMetadata>
    ): Promise<void> {
        try {
            const existing = await this.getLocalMetadata(tableName, userId);

            const updated: LocalSyncMetadata = {
                tableName,
                userId,
                lastSyncAt: null,
                lastPushAt: null,
                lastPullAt: null,
                syncStatus: 'idle',
                conflictCount: 0,
                ...existing,
                ...metadata,
            };

            await dbHelpers.saveSyncMetadata(updated);
        } catch (error) {
            console.error(`Failed to set local sync metadata for ${tableName}:`, error);
            throw error;
        }
    }

    async updateSyncStatus(
        tableName: SyncableTable,
        userId: string,
        status: SyncStatus,
        errorMessage?: string
    ): Promise<void> {
        const updates: Partial<LocalSyncMetadata> = {
            syncStatus: status,
        };

        if (status === 'error' && errorMessage) {
            updates.errorMessage = errorMessage;
            updates.lastErrorAt = Date.now();
        } else if (status === 'success') {
            updates.errorMessage = undefined;
        }

        await this.setLocalMetadata(tableName, userId, updates);
    }

    async updateLastSyncTime(
        tableName: SyncableTable,
        userId: string,
        direction: 'push' | 'pull' | 'both'
    ): Promise<void> {
        const now = Date.now();
        const updates: Partial<LocalSyncMetadata> = {
            lastSyncAt: now,
        };

        if (direction === 'push' || direction === 'both') {
            updates.lastPushAt = now;
        }

        if (direction === 'pull' || direction === 'both') {
            updates.lastPullAt = now;
        }

        await this.setLocalMetadata(tableName, userId, updates);
    }

    async incrementConflictCount(
        tableName: SyncableTable,
        userId: string
    ): Promise<void> {
        const existing = await this.getLocalMetadata(tableName, userId);
        const currentCount = existing?.conflictCount || 0;

        await this.setLocalMetadata(tableName, userId, {
            conflictCount: currentCount + 1,
        });
    }

    async resetMetadata(
        tableName: SyncableTable,
        userId: string
    ): Promise<void> {
        await this.setLocalMetadata(tableName, userId, {
            lastSyncAt: null,
            lastPushAt: null,
            lastPullAt: null,
            syncStatus: 'idle',
            conflictCount: 0,
            errorMessage: undefined,
            lastErrorAt: undefined,
            recordCount: undefined,
        });
    }

    async getAllMetadata(userId: string): Promise<LocalSyncMetadata[]> {
        try {
            return await dbHelpers.getAllSyncMetadata(userId);
        } catch (error) {
            console.error(`Failed to get all sync metadata for user ${userId}:`, error);
            return [];
        }
    }

    async convertToSupabaseFormat(
        local: LocalSyncMetadata
    ): Promise<SyncMetadata> {
        return {
            id: local.id,
            tableName: local.tableName,
            userId: local.userId,
            lastSyncAt: local.lastSyncAt ? new Date(local.lastSyncAt) : null,
            lastPushAt: local.lastPushAt ? new Date(local.lastPushAt) : null,
            lastPullAt: local.lastPullAt ? new Date(local.lastPullAt) : null,
            syncStatus: local.syncStatus,
            conflictCount: local.conflictCount,
            errorMessage: local.errorMessage,
            lastErrorAt: local.lastErrorAt ? new Date(local.lastErrorAt) : undefined,
            recordCount: local.recordCount,
        };
    }

    async convertFromSupabaseFormat(
        remote: SyncMetadata
    ): Promise<LocalSyncMetadata> {
        return {
            id: remote.id as number | undefined,
            tableName: remote.tableName,
            userId: remote.userId,
            lastSyncAt: remote.lastSyncAt ? remote.lastSyncAt.getTime() : null,
            lastPushAt: remote.lastPushAt ? remote.lastPushAt.getTime() : null,
            lastPullAt: remote.lastPullAt ? remote.lastPullAt.getTime() : null,
            syncStatus: remote.syncStatus,
            conflictCount: remote.conflictCount,
            errorMessage: remote.errorMessage,
            lastErrorAt: remote.lastErrorAt ? remote.lastErrorAt.getTime() : undefined,
            recordCount: remote.recordCount,
        };
    }
}

export const syncMetadataService = new SyncMetadataService();

