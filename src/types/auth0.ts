/**
 * TypeScript types for Auth0 Management API
 */

export interface Auth0UserMetadata {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  weight?: number; // in kg
  height?: number; // in cm
  goals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  equipment?: string[];
  workoutFrequency?: number;
  preferredUnit?: 'kg' | 'lbs';
  defaultRestTime?: number;
}

export interface Auth0User {
  user_id: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  user_metadata?: Auth0UserMetadata;
  app_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface Auth0UpdateUserRequest {
  email?: string;
  name?: string;
  picture?: string;
  user_metadata?: Auth0UserMetadata;
  app_metadata?: Record<string, unknown>;
}

export interface Auth0DelegationTokenRequest {
  client_id: string;
  grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer';
  id_token: string;
  target: string;
  api_type: 'auth0';
  scope?: string;
}

export interface Auth0DelegationTokenResponse {
  id_token?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface Auth0ManagementApiError {
  statusCode: number;
  error: string;
  message: string;
  errorCode?: string;
}

export interface Auth0SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime?: Date;
  error?: string;
}

