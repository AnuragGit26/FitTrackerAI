import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export async function getSupabaseClientWithAuth(userId?: string): Promise<SupabaseClient> {
    const client = getSupabaseClient();

    if (userId) {
        client.realtime.setAuth(userId);
    }

    return client;
}

export function resetSupabaseClient(): void {
    supabaseClient = null;
}
