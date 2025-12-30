import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Creates a user-scoped storage helper that automatically prepends user_id to paths
 * This ensures files are organized by user: {user_id}/{filename}
 * 
 * @param supabase - The Supabase client instance
 * @param bucketName - The storage bucket name (e.g., 'profile-photos')
 * @param userId - The user ID to scope storage operations to
 * @returns A storage helper with user-scoped methods
 */
export function userScopedStorage(
  supabase: SupabaseClient,
  bucketName: string,
  userId: string
) {
  /**
   * Prepends user_id to a file path
   */
  function getUserScopedPath(filePath: string): string {
    // Remove leading slash if present
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    // If path already starts with userId, return as-is
    if (cleanPath.startsWith(`${userId}/`)) {
      return cleanPath;
    }
    
    // Otherwise, prepend userId
    return `${userId}/${cleanPath}`;
  }

  return {
    /**
     * Upload a file to user-scoped storage
     */
    async upload(
      filePath: string,
      file: File | Blob,
      options?: {
        cacheControl?: string;
        contentType?: string;
        upsert?: boolean;
      }
    ) {
      const scopedPath = getUserScopedPath(filePath);
      return supabase.storage.from(bucketName).upload(scopedPath, file, {
        cacheControl: options?.cacheControl,
        contentType: options?.contentType,
        upsert: options?.upsert,
      });
    },

    /**
     * Remove files from user-scoped storage
     */
    async remove(paths: string[]) {
      const scopedPaths = paths.map(getUserScopedPath);
      return supabase.storage.from(bucketName).remove(scopedPaths);
    },

    /**
     * Get public URL for a user-scoped file
     */
    getPublicUrl(filePath: string) {
      const scopedPath = getUserScopedPath(filePath);
      return supabase.storage.from(bucketName).getPublicUrl(scopedPath);
    },

    /**
     * List files in user-scoped storage
     */
    async list(path?: string, options?: { limit?: number; offset?: number; sortBy?: { column?: string; order?: 'asc' | 'desc' } }) {
      const scopedPath = path ? getUserScopedPath(path) : userId;
      return supabase.storage.from(bucketName).list(scopedPath, options);
    },

    /**
     * Download a file from user-scoped storage
     */
    async download(filePath: string) {
      const scopedPath = getUserScopedPath(filePath);
      return supabase.storage.from(bucketName).download(scopedPath);
    },
  };
}

/**
 * Creates a user-scoped query builder for Supabase tables
 * Automatically filters queries by user_id
 * 
 * @param supabase - The Supabase client instance
 * @param tableName - The table name
 * @param userId - The user ID to scope queries to
 * @returns A query builder with user-scoped methods
 */
export function userScopedQuery<T = any>(
  supabase: SupabaseClient,
  tableName: string,
  userId: string
) {
  return {
    /**
     * Select records scoped to the user
     * Returns a chainable PostgrestQueryBuilder
     */
    select(columns = '*') {
      return supabase
        .from(tableName)
        .select(columns)
        .eq('user_id', userId);
    },

    /**
     * Insert a record with automatic user_id assignment
     */
    insert(data: Partial<T> | Partial<T>[]) {
      const records = Array.isArray(data) ? data : [data];
      const recordsWithUserId = records.map(record => ({
        ...record,
        user_id: userId,
      }));
      return supabase.from(tableName).insert(recordsWithUserId);
    },

    /**
     * Update records scoped to the user
     */
    update(data: Partial<T>) {
      return supabase
        .from(tableName)
        .update(data)
        .eq('user_id', userId);
    },

    /**
     * Delete records scoped to the user
     */
    delete() {
      return supabase
        .from(tableName)
        .delete()
        .eq('user_id', userId);
    },
  };
}

