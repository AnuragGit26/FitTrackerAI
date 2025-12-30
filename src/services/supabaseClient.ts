import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Gets the Supabase URL from environment variables
 * Supports both VITE_ and REACT_APP_ prefixes for backward compatibility
 */
function getSupabaseUrl(): string {
  const url = 
    import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.REACT_APP_SUPABASE_URL;
  
  if (!url) {
    throw new Error(
      'Supabase URL is not configured. Please add VITE_SUPABASE_URL to your .env file. ' +
      'Get your URL from Supabase project settings → API.'
    );
  }
  
  return url;
}

/**
 * Gets the Supabase anonymous key from environment variables
 * Supports both VITE_ and REACT_APP_ prefixes for backward compatibility
 */
function getSupabaseAnonKey(): string {
  const key = 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    import.meta.env.REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  
  if (!key) {
    throw new Error(
      'Supabase anonymous key is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file. ' +
      'Get your key from Supabase project settings → API.'
    );
  }
  
  return key;
}

let supabaseClient: SupabaseClient | null = null;

/**
 * Creates or returns a cached Supabase client instance
 * Uses anonymous key since we're using Auth0 (not Supabase Auth)
 * The bucket is public, so no authentication is required
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  return supabaseClient;
}

/**
 * Gets an authenticated Supabase client for a specific user
 * Since we're using Auth0 and public buckets, this just returns the standard client
 * The userId parameter is used for path scoping in storage operations
 * 
 * @param userId - The user ID (from Auth0) for scoping operations
 * @returns A Supabase client instance
 */
export async function getSupabaseClientWithAuth(userId: string): Promise<SupabaseClient> {
  // Validate userId is provided
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required for Supabase operations');
  }
  
  // Return the standard client (public bucket, no auth needed)
  return getSupabaseClient();
}

