/**
 * @deprecated Prisma query API is no longer used.
 * All database operations now go through Supabase PostgreSQL.
 * MongoDB sync is handled by Supabase Edge Functions.
 * 
 * This file is kept for backward compatibility but should not be imported.
 * Remove all imports of this file and use Supabase client instead.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function prismaQuery(_model: string, _action: string, _params: unknown): Promise<any> {
    throw new Error('Prisma query API is deprecated. Use Supabase client instead.');
}
