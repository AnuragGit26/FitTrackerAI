/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth0 Authentication (Required)
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  
  // Auth0 Management API (Optional - for profile sync)
  readonly VITE_AUTH0_MANAGEMENT_API_AUDIENCE?: string;
  readonly VITE_AUTH0_DELEGATION_ENDPOINT?: string;
  
  // Supabase Configuration (Required)
  // Support both VITE_ and REACT_APP_ prefixes for backward compatibility
  readonly VITE_SUPABASE_URL?: string;
  readonly REACT_APP_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  readonly REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  
  // Google Gemini AI API Key (Optional - for AI insights)
  readonly VITE_GEMINI_API_KEY?: string;
  
  // MongoDB Configuration (Required)
  // Use VITE_MONGODB_URI for client-side access (Vite requires VITE_ prefix)
  readonly VITE_MONGODB_URI?: string;
  readonly MONGODB_URI?: string; // Fallback for backward compatibility
  
  // Prisma Configuration (Required for Prisma Accelerate)
  // Note: Vite requires VITE_ prefix for client-side access
  readonly VITE_ORM_PRISMA_DATABASE_URL?: string;
  readonly ORM_PRISMA_DATABASE_URL?: string; // Fallback for server-side
  readonly ORM_POSTGRES_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

