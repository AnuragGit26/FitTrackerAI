/**
 * Prisma Query Builder Helpers
 * 
 * Centralized helpers that enforce userId in all Prisma queries.
 * These helpers ensure proper user-based data isolation and security.
 */

import { requireUserId } from '@/utils/userIdValidation';
import type { SyncableTable } from '@/types/sync';
import type { Prisma } from '@prisma/client';

/**
 * Creates a user-scoped filter that automatically includes userId
 * Returns Prisma where clause objects
 * 
 * @param userId - REQUIRED: The user ID to scope the query to
 * @param tableName - The table/collection name
 * @param additionalFilters - Optional additional filter conditions
 * @returns A Prisma where clause with userId filter pre-applied
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
): Prisma.JsonObject {
    const validatedUserId = requireUserId(userId, {
        functionName: 'userScopedFilter',
        additionalInfo: { tableName, additionalFilters },
    });

    const baseFilter: Record<string, unknown> = {
        deletedAt: null,
    };

    // Handle special tables with composite keys
    if (tableName === 'user_profiles') {
        // user_profiles uses userId as primary key
        baseFilter.userId = validatedUserId;
    } else if (tableName === 'muscle_statuses') {
        // muscle_statuses uses (userId, muscle) as composite key
        baseFilter.userId = validatedUserId;
        if (additionalFilters?.muscle) {
            baseFilter.muscle = additionalFilters.muscle;
        }
    } else if (tableName === 'settings') {
        // settings uses (userId, key) as composite key
        baseFilter.userId = validatedUserId;
        if (additionalFilters?.key) {
            baseFilter.key = additionalFilters.key;
        }
    } else if (tableName === 'sleep_logs') {
        // sleep_logs uses (userId, date) as composite key
        baseFilter.userId = validatedUserId;
        if (additionalFilters?.date) {
            const dateValue = additionalFilters.date instanceof Date
                ? additionalFilters.date
                : typeof additionalFilters.date === 'string'
                    ? new Date(additionalFilters.date.split('T')[0])
                    : new Date(String(additionalFilters.date));
            baseFilter.date = dateValue;
        }
    } else if (tableName === 'recovery_logs') {
        // recovery_logs uses (userId, date) as composite key
        baseFilter.userId = validatedUserId;
        if (additionalFilters?.date) {
            const dateValue = additionalFilters.date instanceof Date
                ? additionalFilters.date
                : typeof additionalFilters.date === 'string'
                    ? new Date(additionalFilters.date.split('T')[0])
                    : new Date(String(additionalFilters.date));
            baseFilter.date = dateValue;
        }
    } else if (tableName === 'exercises') {
        // exercises: library exercises (userId IS NULL) or user's custom exercises
        baseFilter.OR = [
            { userId: null },
            { userId: validatedUserId },
        ];
        if (additionalFilters?.id) {
            baseFilter.exerciseId = additionalFilters.id;
        }
    } else {
        // Standard tables: filter by userId
        baseFilter.userId = validatedUserId;
        if (additionalFilters?.id) {
            // For Prisma, use the appropriate ID field
            if (tableName === 'workouts' || tableName === 'error_logs') {
                baseFilter.id = additionalFilters.id;
            } else {
                // For tables with string IDs (like templates)
                const idField = tableName === 'workout_templates' ? 'templateId' :
                    tableName === 'planned_workouts' ? 'plannedWorkoutId' :
                        tableName === 'notifications' ? 'notificationId' :
                            'id';
                baseFilter[idField] = additionalFilters.id;
            }
        }
    }

    // Add updatedAt filter for incremental sync
    if (additionalFilters?.updatedAt) {
        baseFilter.updatedAt = {
            gt: additionalFilters.updatedAt instanceof Date
                ? additionalFilters.updatedAt
                : new Date(additionalFilters.updatedAt),
        };
    }

    return baseFilter as Prisma.JsonObject;
}

/**
 * Build Prisma query options for sorting and limiting
 */
export function buildPrismaQueryOptions(options?: {
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
    skip?: number;
}): {
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
    skip?: number;
} {
    const queryOptions: {
        orderBy?: Record<string, 'asc' | 'desc'>;
        take?: number;
        skip?: number;
    } = {};

    if (options?.sort) {
        queryOptions.orderBy = {
            [options.sort.field]: options.sort.order,
        };
    }

    if (options?.limit) {
        queryOptions.take = options.limit;
    }

    if (options?.skip) {
        queryOptions.skip = options.skip;
    }

    return queryOptions;
}
