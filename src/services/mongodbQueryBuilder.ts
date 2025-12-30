/**
 * MongoDB Query Builder Helpers
 * 
 * Centralized helpers that enforce userId in all MongoDB queries.
 * These helpers ensure proper user-based data isolation and security.
 */

import { Model, FilterQuery, QueryOptions } from 'mongoose';
import { requireUserId } from '@/utils/userIdValidation';
import type { SyncableTable } from '@/types/sync';

/**
 * Creates a user-scoped filter that automatically includes userId
 * 
 * @param userId - REQUIRED: The user ID to scope the query to
 * @param tableName - The table/collection name
 * @param additionalFilters - Optional additional filter conditions
 * @returns A MongoDB filter query with userId filter pre-applied
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export function userScopedFilter<T = Record<string, unknown>>(
    userId: string,
    tableName: SyncableTable,
    additionalFilters?: {
        id?: string | number;
        muscle?: string;
        key?: string;
        date?: string | Date;
        updatedAt?: Date;
    }
): FilterQuery<T> {
    const validatedUserId = requireUserId(userId, {
        functionName: 'userScopedFilter',
        additionalInfo: { tableName, additionalFilters },
    });

    const baseFilter: FilterQuery<T> = {
        deletedAt: null,
    } as FilterQuery<T>;

    // Handle special tables with composite keys
    if (tableName === 'user_profiles') {
        // user_profiles uses userId as primary key
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
    } else if (tableName === 'muscle_statuses') {
        // muscle_statuses uses (userId, muscle) as composite key
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
        if (additionalFilters?.muscle) {
            (baseFilter as Record<string, unknown>).muscle = additionalFilters.muscle;
        }
    } else if (tableName === 'settings') {
        // settings uses (userId, key) as composite key
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
        if (additionalFilters?.key) {
            (baseFilter as Record<string, unknown>).key = additionalFilters.key;
        }
    } else if (tableName === 'sleep_logs') {
        // sleep_logs uses (userId, date) as composite key
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
        if (additionalFilters?.date) {
            const dateStr = additionalFilters.date instanceof Date
                ? additionalFilters.date.toISOString().split('T')[0]
                : typeof additionalFilters.date === 'string'
                ? additionalFilters.date.split('T')[0]
                : String(additionalFilters.date);
            (baseFilter as Record<string, unknown>).date = new Date(dateStr);
        }
    } else if (tableName === 'recovery_logs') {
        // recovery_logs uses (userId, date) as composite key
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
        if (additionalFilters?.date) {
            const dateStr = additionalFilters.date instanceof Date
                ? additionalFilters.date.toISOString().split('T')[0]
                : typeof additionalFilters.date === 'string'
                ? additionalFilters.date.split('T')[0]
                : String(additionalFilters.date);
            (baseFilter as Record<string, unknown>).date = new Date(dateStr);
        }
    } else if (tableName === 'exercises') {
        // exercises: library exercises (userId IS NULL) or user's custom exercises
        (baseFilter as Record<string, unknown>).$or = [
            { userId: null },
            { userId: validatedUserId },
        ];
        if (additionalFilters?.id) {
            (baseFilter as Record<string, unknown>).id = additionalFilters.id;
        }
    } else {
        // Standard tables: filter by userId
        (baseFilter as Record<string, unknown>).userId = validatedUserId;
        if (additionalFilters?.id) {
            // For tables with numeric IDs, convert to number if needed
            if (tableName === 'workouts' || tableName === 'error_logs') {
                (baseFilter as Record<string, unknown>)._id = additionalFilters.id;
            } else {
                (baseFilter as Record<string, unknown>).id = additionalFilters.id;
            }
        }
    }

    // Add updatedAt filter for incremental sync
    if (additionalFilters?.updatedAt) {
        (baseFilter as Record<string, unknown>).updatedAt = {
            $gt: additionalFilters.updatedAt instanceof Date 
                ? additionalFilters.updatedAt 
                : new Date(additionalFilters.updatedAt),
        };
    }

    return baseFilter;
}

/**
 * Creates a user-scoped query with proper filtering for special tables
 * 
 * @param model - The Mongoose model instance
 * @param userId - REQUIRED: The user ID to scope the query to
 * @param tableName - The table/collection name
 * @param additionalFilters - Optional additional filter conditions
 * @returns A Mongoose query with userId filter pre-applied
 */
export function userScopedQuery<T extends Document>(
    model: Model<T>,
    userId: string,
    tableName: SyncableTable,
    additionalFilters?: {
        id?: string | number;
        muscle?: string;
        key?: string;
        date?: string | Date;
        updatedAt?: Date;
    }
) {
    const filter = userScopedFilter<T>(userId, tableName, additionalFilters);
    return model.find(filter);
}

/**
 * Find one document with user scope
 */
export function userScopedFindOne<T extends Document>(
    model: Model<T>,
    userId: string,
    tableName: SyncableTable,
    additionalFilters?: {
        id?: string | number;
        muscle?: string;
        key?: string;
        date?: string | Date;
    }
) {
    const filter = userScopedFilter<T>(userId, tableName, additionalFilters);
    return model.findOne(filter);
}

/**
 * Count documents with user scope
 */
export function userScopedCount<T extends Document>(
    model: Model<T>,
    userId: string,
    tableName: SyncableTable,
    additionalFilters?: {
        id?: string | number;
        muscle?: string;
        key?: string;
        date?: string | Date;
        updatedAt?: Date;
    }
) {
    const filter = userScopedFilter<T>(userId, tableName, additionalFilters);
    return model.countDocuments(filter);
}

/**
 * Build query options for sorting and limiting
 */
export function buildQueryOptions(options?: {
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
    skip?: number;
}): QueryOptions {
    const queryOptions: QueryOptions = {};

    if (options?.sort) {
        queryOptions.sort = {
            [options.sort.field]: options.sort.order === 'asc' ? 1 : -1,
        };
    }

    if (options?.limit) {
        queryOptions.limit = options.limit;
    }

    if (options?.skip) {
        queryOptions.skip = options.skip;
    }

    return queryOptions;
}

