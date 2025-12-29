import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireUserId } from '@/utils/userIdValidation';

// Require Supabase URL - support both VITE_ and REACT_APP_ prefixes for backward compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL;
if (!supabaseUrl) {
    throw new Error(
        'VITE_SUPABASE_URL (or REACT_APP_SUPABASE_URL) is required. Please add it to your .env file.\n' +
        'Get your URL from: https://supabase.com/dashboard/project/_/settings/api'
    );
}

// Try all possible env var names for backward compatibility
const supabaseAnonKey = 
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
    import.meta.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
    throw new Error(
        'Supabase anonymous key is not set. Please add one of the following to your .env file:\n' +
        '  - VITE_SUPABASE_ANON_KEY\n' +
        '  - VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY\n' +
        '  - REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY\n' +
        'Get your key from: https://supabase.com/dashboard/project/_/settings/api'
    );
}

let supabaseClient: SupabaseClient | null = null;

/**
 * Get base Supabase client (without authentication)
 * WARNING: This should only be used for operations that don't require user context.
 * For user-scoped operations, use getSupabaseClientWithAuth() instead.
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseAnonKey) {
        throw new Error(
            'Supabase anonymous key is not configured. Please set one of the following in your .env file:\n' +
            '  - VITE_SUPABASE_ANON_KEY\n' +
            '  - VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY\n' +
            '  - REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY\n' +
            'Get your key from: https://supabase.com/dashboard/project/_/settings/api'
        );
    }

    if (!supabaseClient) {
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            db: {
                schema: 'public',
            },
            global: {
                headers: {
                    'x-client-info': 'fittrackai-web',
                },
            },
        });
    }

    return supabaseClient;
}

/**
 * Get Supabase client with user authentication context
 * REQUIRES userId parameter - validates and ensures user_id is included in all requests
 * 
 * @param userId - REQUIRED: The user ID to authenticate with
 * @returns Supabase client configured with user context
 * @throws {UserIdValidationError} If userId is missing or invalid
 */
export async function getSupabaseClientWithAuth(userId: string): Promise<SupabaseClient> {
    // Validate userId before proceeding
    const validatedUserId = requireUserId(userId, {
        functionName: 'getSupabaseClientWithAuth',
        additionalInfo: { operation: 'supabase_client_creation' },
    });

    const client = getSupabaseClient();

    // Set realtime auth
    client.realtime.setAuth(validatedUserId);

    // Note: User ID enforcement is handled at the query level via:
    // 1. userScopedQuery() helper which adds .eq('user_id', userId) filters
    // 2. getSupabaseClientWithAuth() requires userId parameter (validated)
    // 3. All queries must use userScopedQuery() or manually add user_id filters
    // The PostgREST API automatically converts .eq('user_id', userId) to ?user_id=eq.{userId} in URLs

    return client;
}

export function resetSupabaseClient(): void {
    supabaseClient = null;
}
