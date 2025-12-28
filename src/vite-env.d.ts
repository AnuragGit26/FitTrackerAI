/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Auth0 Authentication (Required)
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  
  // Supabase Configuration (Required)
  // Support both VITE_ and REACT_APP_ prefixes for backward compatibility
  readonly VITE_SUPABASE_URL?: string;
  readonly REACT_APP_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  readonly REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string;
  
  // Google Gemini AI API Key (Optional - for AI insights)
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

