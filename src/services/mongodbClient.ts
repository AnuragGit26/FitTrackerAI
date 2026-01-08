/**
 * @deprecated MongoDB Client is no longer used in the client-side codebase.
 * All database operations now go through Supabase PostgreSQL.
 * MongoDB sync is handled by Supabase Edge Functions.
 * 
 * This file is kept for backward compatibility but should not be imported.
 * Remove all imports of this file and use Supabase client instead.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mongodbClient: any = null;
