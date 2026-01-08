// Sync handlers for each table type using MongoDB native driver

import { MongoClient } from 'https://deno.land/x/mongo@v0.32.0/mod.ts';
import type { SyncableTable, SyncResult, SyncError } from './types.ts';
import { transformRecord, buildMongoFilter, mapTableToCollection } from './transformers.ts';

const BATCH_SIZE = 100;

/**
 * Sync a single record to MongoDB
 */
async function syncRecord(
    client: MongoClient,
    tableName: SyncableTable,
    record: Record<string, unknown>,
    operation: 'insert' | 'update' | 'delete'
): Promise<{ success: boolean; error?: string }> {
    try {
        const collectionName = mapTableToCollection(tableName);
        const db = client.database('fittrackai');
        const collection = db.collection(collectionName);
        
        const transformed = transformRecord(record, tableName);
        const filter = buildMongoFilter(transformed, tableName);
        
        switch (operation) {
            case 'insert':
            case 'update': {
                // Handle soft deletes
                if (transformed.deletedAt) {
                    // Soft delete: update with deletedAt
                    await collection.updateOne(
                        filter,
                        { $set: { ...transformed, deletedAt: new Date(transformed.deletedAt as string) } },
                        { upsert: true }
                    );
                } else {
                    // Upsert the record
                    await collection.updateOne(
                        filter,
                        { $set: transformed },
                        { upsert: true }
                    );
                }
                break;
            }
            
            case 'delete': {
                // Hard delete from MongoDB
                await collection.deleteOne(filter);
                break;
            }
        }
        
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Sync multiple records in batch
 */
export async function syncBatch(
    client: MongoClient,
    tableName: SyncableTable,
    records: Record<string, unknown>[],
    operation: 'insert' | 'update' | 'delete' = 'update'
): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
    const conflicts = 0; // Conflicts are tracked per record, not in batch
    
    for (const record of records) {
        const result = await syncRecord(client, tableName, record, operation);
        
        if (result.success) {
            if (operation === 'delete') {
                recordsDeleted++;
            } else if (operation === 'insert') {
                recordsCreated++;
            } else {
                recordsUpdated++;
            }
        } else {
            errors.push({
                tableName,
                recordId: (record.id || record._id || 'unknown') as string | number,
                error: result.error || 'Unknown error',
                timestamp: new Date(),
                operation: operation === 'insert' ? 'create' : operation === 'delete' ? 'delete' : 'update',
            });
        }
    }
    
    return {
        tableName,
        status: errors.length === 0 ? 'success' : errors.length < records.length ? 'error' : 'error',
        recordsProcessed: records.length,
        recordsCreated,
        recordsUpdated,
        recordsDeleted,
        conflicts,
        errors,
        duration: Date.now() - startTime,
    };
}

/**
 * Sync all records for a table from Supabase to MongoDB
 */
export async function syncTable(
    supabaseClient: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.39.0').createClient>,
    mongoClient: MongoClient,
    tableName: SyncableTable,
    userId?: string,
    lastSyncAt?: Date
): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: SyncError[] = [];
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsDeleted = 0;
    let conflicts = 0; // Accumulated from batch results
    
    try {
        // Build query
        let query = supabaseClient
            .from(tableName)
            .select('*');
        
        if (userId) {
            query = query.eq('user_id', userId);
        }
        
        // Only sync records updated after lastSyncAt
        if (lastSyncAt) {
            query = query.gte('updated_at', lastSyncAt.toISOString());
        }
        
        // Exclude soft-deleted records (unless we want to sync deletions)
        query = query.is('deleted_at', null);
        
        const { data: records, error: fetchError } = await query;
        
        if (fetchError) {
            throw new Error(`Failed to fetch records: ${fetchError.message}`);
        }
        
        if (!records || records.length === 0) {
            return {
                tableName,
                status: 'success',
                recordsProcessed: 0,
                recordsCreated: 0,
                recordsUpdated: 0,
                recordsDeleted: 0,
                conflicts: 0,
                errors: [],
                duration: Date.now() - startTime,
            };
        }
        
        // Process in batches
        const batches: Record<string, unknown>[][] = [];
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            batches.push(records.slice(i, i + BATCH_SIZE) as Record<string, unknown>[]);
        }
        
        for (const batch of batches) {
            const batchResult = await syncBatch(mongoClient, tableName, batch, 'update');
            recordsCreated += batchResult.recordsCreated;
            recordsUpdated += batchResult.recordsUpdated;
            recordsDeleted += batchResult.recordsDeleted;
            conflicts += batchResult.conflicts;
            errors.push(...batchResult.errors);
        }
        
        return {
            tableName,
            status: errors.length === 0 ? 'success' : 'error',
            recordsProcessed: records.length,
            recordsCreated,
            recordsUpdated,
            recordsDeleted,
            conflicts,
            errors,
            duration: Date.now() - startTime,
        };
    } catch (error) {
        return {
            tableName,
            status: 'error',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [{
                tableName,
                recordId: 'all',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
                operation: 'read',
            }],
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Sync a single record by ID
 */
export async function syncRecordById(
    supabaseClient: ReturnType<typeof import('https://esm.sh/@supabase/supabase-js@2.39.0').createClient>,
    mongoClient: MongoClient,
    tableName: SyncableTable,
    recordId: string | number,
    userId?: string
): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
        let query = supabaseClient
            .from(tableName)
            .select('*')
            .eq('id', recordId);
        
        if (userId) {
            query = query.eq('user_id', userId);
        }
        
        const { data: record, error: fetchError } = await query.single();
        
        if (fetchError) {
            throw new Error(`Failed to fetch record: ${fetchError.message}`);
        }
        
        if (!record) {
            return {
                tableName,
                status: 'error',
                recordsProcessed: 0,
                recordsCreated: 0,
                recordsUpdated: 0,
                recordsDeleted: 0,
                conflicts: 0,
                errors: [{
                    tableName,
                    recordId,
                    error: 'Record not found',
                    timestamp: new Date(),
                    operation: 'read',
                }],
                duration: Date.now() - startTime,
            };
        }
        
        const result = await syncRecord(mongoClient, tableName, record as Record<string, unknown>, 'update');
        
        if (result.success) {
            return {
                tableName,
                status: 'success',
                recordsProcessed: 1,
                recordsCreated: 0,
                recordsUpdated: 1,
                recordsDeleted: 0,
                conflicts: 0,
                errors: [],
                duration: Date.now() - startTime,
            };
        } else {
            return {
                tableName,
                status: 'error',
                recordsProcessed: 1,
                recordsCreated: 0,
                recordsUpdated: 0,
                recordsDeleted: 0,
                conflicts: 0,
                errors: [{
                    tableName,
                    recordId,
                    error: result.error || 'Unknown error',
                    timestamp: new Date(),
                    operation: 'update',
                }],
                duration: Date.now() - startTime,
            };
        }
    } catch (error) {
        return {
            tableName,
            status: 'error',
            recordsProcessed: 0,
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            conflicts: 0,
            errors: [{
                tableName,
                recordId,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date(),
                operation: 'read',
            }],
            duration: Date.now() - startTime,
        };
    }
}
