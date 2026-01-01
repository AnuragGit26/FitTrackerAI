import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Sanitizes a string for use in Supabase Storage keys
 * Replaces invalid characters with underscores
 * Supabase Storage keys can contain: alphanumeric, hyphens, underscores, forward slashes, periods
 */
function sanitizeStorageKey(key: string): string {
  return key
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Allow: alphanumeric, hyphen, underscore, forward slash, period
      if (
        (code >= 48 && code <= 57) || // 0-9
        (code >= 65 && code <= 90) || // A-Z
        (code >= 97 && code <= 122) || // a-z
        char === '-' ||
        char === '_' ||
        char === '/' ||
        char === '.'
      ) {
        return char;
      }
      return '_';
    })
    .join('');
}

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
  // Sanitize userId to ensure it's valid for storage keys (e.g., replace | with _)
  const sanitizedUserId = sanitizeStorageKey(userId);
  
  /**
   * Prepends user_id to a file path
   */
  function getUserScopedPath(filePath: string): string {
    // Remove leading slash if present
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    
    // Sanitize the file path as well
    const sanitizedPath = sanitizeStorageKey(cleanPath);
    
    // If path already starts with sanitizedUserId, return as-is
    if (sanitizedPath.startsWith(`${sanitizedUserId}/`)) {
      return sanitizedPath;
    }
    
    // Otherwise, prepend sanitized userId
    return `${sanitizedUserId}/${sanitizedPath}`;
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
      const scopedPath = path ? getUserScopedPath(path) : sanitizedUserId;
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
export function userScopedQuery<T = Record<string, unknown>>(
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

