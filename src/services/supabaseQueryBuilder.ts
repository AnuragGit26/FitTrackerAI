/**
 * Supabase Query Builder Helpers
 * 
 * Centralized helpers that enforce user_id in all Supabase queries and storage operations.
 * These helpers ensure proper user-based data isolation and security.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { requireUserId, validateUserId } from '@/utils/userIdValidation';
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js';

/**
 * Creates a user-scoped query builder that automatically includes user_id filter
 * 
 * @param client - The Supabase client instance
 * @param tableName - The table name to query
 * @param userId - REQUIRED: The user ID to scope the query to
 * @returns A PostgrestQueryBuilder with user_id filter pre-applied
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export function userScopedQuery<T = any>(
  client: SupabaseClient,
  tableName: string,
  userId: string
): PostgrestQueryBuilder<T> {
  const validatedUserId = requireUserId(userId, {
    functionName: 'userScopedQuery',
    additionalInfo: { tableName },
  });

  // For exercises table: fetch both library exercises (user_id IS NULL) and user's custom exercises
  if (tableName === 'exercises') {
    return client
      .from(tableName)
      .or(`user_id.is.null,user_id.eq.${validatedUserId}`) as PostgrestQueryBuilder<T>;
  }

  // For all other tables, filter by user_id
  return client
    .from(tableName)
    .eq('user_id', validatedUserId) as PostgrestQueryBuilder<T>;
}

/**
 * Creates a user-scoped storage client that ensures user_id is in storage paths
 * 
 * @param client - The Supabase client instance
 * @param bucketName - The storage bucket name
 * @param userId - REQUIRED: The user ID to scope storage operations to
 * @returns An object with storage methods that automatically prefix paths with user_id
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export function userScopedStorage(
  client: SupabaseClient,
  bucketName: string,
  userId: string
) {
  const validatedUserId = requireUserId(userId, {
    functionName: 'userScopedStorage',
    additionalInfo: { bucketName },
  });

  const storage = client.storage.from(bucketName);

  /**
   * Upload a file with user_id prefix in path
   */
  const upload = async (
    path: string,
    file: File | Blob | ArrayBuffer | FileList,
    options?: {
      cacheControl?: string;
      contentType?: string;
      upsert?: boolean;
      duplex?: string;
    }
  ) => {
    // Ensure path starts with user_id/
    const userScopedPath = path.startsWith(`${validatedUserId}/`)
      ? path
      : `${validatedUserId}/${path}`;
    
    return storage.upload(userScopedPath, file, options);
  };

  /**
   * Remove files with user_id prefix in path
   */
  const remove = async (paths: string[]) => {
    // Ensure all paths start with user_id/
    const userScopedPaths = paths.map(path =>
      path.startsWith(`${validatedUserId}/`)
        ? path
        : `${validatedUserId}/${path}`
    );
    
    return storage.remove(userScopedPaths);
  };

  /**
   * Get public URL for a file with user_id prefix
   */
  const getPublicUrl = (path: string) => {
    const userScopedPath = path.startsWith(`${validatedUserId}/`)
      ? path
      : `${validatedUserId}/${path}`;
    
    return storage.getPublicUrl(userScopedPath);
  };

  /**
   * List files in user's directory
   */
  const list = (path?: string, options?: { limit?: number; offset?: number; sortBy?: { column?: string; order?: 'asc' | 'desc' } }) => {
    const userScopedPath = path
      ? path.startsWith(`${validatedUserId}/`)
        ? path
        : `${validatedUserId}/${path}`
      : `${validatedUserId}/`;
    
    return storage.list(userScopedPath, options);
  };

  /**
   * Download a file with user_id prefix
   */
  const download = (path: string) => {
    const userScopedPath = path.startsWith(`${validatedUserId}/`)
      ? path
      : `${validatedUserId}/${path}`;
    
    return storage.download(userScopedPath);
  };

  return {
    upload,
    remove,
    getPublicUrl,
    list,
    download,
    // Expose the underlying storage client for advanced operations
    _storage: storage,
  };
}

/**
 * Builds a user-scoped query with proper filtering for special tables
 * Handles composite keys and special cases (muscle_statuses, settings, sleep_logs, recovery_logs, user_profiles)
 * 
 * @param client - The Supabase client instance
 * @param tableName - The table name to query
 * @param userId - REQUIRED: The user ID to scope the query to
 * @param additionalFilters - Optional additional filter conditions
 * @returns A PostgrestQueryBuilder with user_id filter pre-applied
 */
export function buildUserScopedQuery<T = any>(
  client: SupabaseClient,
  tableName: string,
  userId: string,
  additionalFilters?: {
    id?: string | number;
    muscle?: string;
    key?: string;
    date?: string | Date;
  }
): PostgrestQueryBuilder<T> {
  const validatedUserId = requireUserId(userId, {
    functionName: 'buildUserScopedQuery',
    additionalInfo: { tableName, additionalFilters },
  });

  let query = client.from(tableName);

  // Handle special tables with composite keys
  if (tableName === 'user_profiles') {
    // user_profiles uses user_id as primary key
    query = query.eq('user_id', validatedUserId) as PostgrestQueryBuilder<T>;
  } else if (tableName === 'muscle_statuses' && additionalFilters?.muscle) {
    // muscle_statuses uses (user_id, muscle) as composite key
    query = query
      .eq('user_id', validatedUserId)
      .eq('muscle', additionalFilters.muscle) as PostgrestQueryBuilder<T>;
  } else if (tableName === 'settings' && additionalFilters?.key) {
    // settings uses (user_id, key) as composite key
    query = query
      .eq('user_id', validatedUserId)
      .eq('key', additionalFilters.key) as PostgrestQueryBuilder<T>;
  } else if (tableName === 'sleep_logs' && additionalFilters?.date) {
    // sleep_logs uses (user_id, date) as composite key
    const dateStr = additionalFilters.date instanceof Date
      ? additionalFilters.date.toISOString().split('T')[0]
      : typeof additionalFilters.date === 'string'
      ? additionalFilters.date.split('T')[0]
      : String(additionalFilters.date);
    query = query
      .eq('user_id', validatedUserId)
      .eq('date', dateStr) as PostgrestQueryBuilder<T>;
  } else if (tableName === 'recovery_logs' && additionalFilters?.date) {
    // recovery_logs uses (user_id, date) as composite key
    const dateStr = additionalFilters.date instanceof Date
      ? additionalFilters.date.toISOString().split('T')[0]
      : typeof additionalFilters.date === 'string'
      ? additionalFilters.date.split('T')[0]
      : String(additionalFilters.date);
    query = query
      .eq('user_id', validatedUserId)
      .eq('date', dateStr) as PostgrestQueryBuilder<T>;
  } else if (tableName === 'exercises') {
    // exercises: library exercises (user_id IS NULL) or user's custom exercises
    if (additionalFilters?.id) {
      // Check if it's a custom exercise by checking if user_id matches
      query = query.or(`user_id.is.null,user_id.eq.${validatedUserId}`).eq('id', additionalFilters.id) as PostgrestQueryBuilder<T>;
    } else {
      query = query.or(`user_id.is.null,user_id.eq.${validatedUserId}`) as PostgrestQueryBuilder<T>;
    }
  } else {
    // Standard tables: filter by user_id and optionally by id
    query = query.eq('user_id', validatedUserId) as PostgrestQueryBuilder<T>;
    if (additionalFilters?.id) {
      query = query.eq('id', additionalFilters.id) as PostgrestQueryBuilder<T>;
    }
  }

  return query as PostgrestQueryBuilder<T>;
}

