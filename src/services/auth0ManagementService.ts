/**
 * Auth0 Management API Service
 * Handles user profile updates to Auth0 using Management API
 * 
 * Note: Requires Auth0 Action setup for delegation token generation
 * or a custom backend endpoint that handles Management API calls
 */

import type {
  Auth0User,
  Auth0UpdateUserRequest,
  Auth0DelegationTokenResponse,
  Auth0ManagementApiError,
  Auth0UserMetadata,
} from '@/types/auth0';
import { logger } from '@/utils/logger';
import type { UserProfile } from '@/store/userStore';

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
// const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID; // Unused
const MANAGEMENT_API_AUDIENCE = import.meta.env.VITE_AUTH0_MANAGEMENT_API_AUDIENCE || `https://${AUTH0_DOMAIN}/api/v2/`;
const DELEGATION_ENDPOINT = import.meta.env.VITE_AUTH0_DELEGATION_ENDPOINT;

interface DelegationTokenCache {
  token: string;
  expiresAt: number;
}

class Auth0ManagementService {
  private delegationTokenCache: DelegationTokenCache | null = null;
  private readonly TOKEN_CACHE_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Get delegation token for Management API access
   * This requires an Auth0 Action or custom endpoint
   */
  private async getDelegationToken(accessToken: string): Promise<string> {
    // Check cache first
    if (this.delegationTokenCache && this.delegationTokenCache.expiresAt > Date.now()) {
      return this.delegationTokenCache.token;
    }

    if (!DELEGATION_ENDPOINT) {
      throw new Error(
        'Auth0 delegation endpoint not configured. Please set VITE_AUTH0_DELEGATION_ENDPOINT in your .env file.\n' +
        'This endpoint should be created via Auth0 Actions to exchange user tokens for Management API tokens.'
      );
    }

    try {
      const response = await fetch(DELEGATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          target: MANAGEMENT_API_AUDIENCE,
          scope: 'update:users read:users',
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: Failed to get delegation token`;
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          
          // Provide more helpful error messages for common issues
          if (response.status === 500 && errorMessage.includes('Server configuration error')) {
            errorMessage = `${errorMessage}\n\nPlease ensure the following environment variables are set in your Vercel project:\n- AUTH0_DOMAIN\n- AUTH0_M2M_CLIENT_ID\n- AUTH0_M2M_CLIENT_SECRET`;
          } else if (response.status === 401) {
            errorMessage = `Authentication failed: ${errorMessage}. The access token may be invalid or expired.`;
          }
        } catch {
          // If JSON parsing fails, use the status text
          errorMessage = `HTTP ${response.status} ${response.statusText}: Failed to get delegation token`;
        }
        throw new Error(errorMessage);
      }

      const data: Auth0DelegationTokenResponse = await response.json();
      
      if (!data.access_token) {
        throw new Error('Delegation token response missing access_token');
      }

      // Cache the token (default to 1 hour if expires_in not provided)
      const expiresIn = (data.expires_in || 3600) * 1000;
      this.delegationTokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + expiresIn - this.TOKEN_CACHE_BUFFER,
      };

      return data.access_token;
    } catch (error) {
      logger.error('Failed to get Auth0 delegation token', error);
      throw error;
    }
  }

  /**
   * Get user ID from Auth0 user object
   */
  private getUserId(auth0User: { sub?: string; email?: string }): string {
    if (!auth0User.sub && !auth0User.email) {
      throw new Error('Auth0 user missing sub or email');
    }
    return auth0User.sub || auth0User.email || '';
  }

  /**
   * Map UserProfile to Auth0 user_metadata
   */
  // @ts-expect-error - Unused but kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _mapProfileToMetadata(profile: UserProfile): Auth0UserMetadata {
    return {
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      height: profile.height,
      goals: profile.goals,
      experienceLevel: profile.experienceLevel,
      equipment: profile.equipment,
      workoutFrequency: profile.workoutFrequency,
      preferredUnit: profile.preferredUnit,
      defaultRestTime: profile.defaultRestTime,
    };
  }

  /**
   * Update user profile in Auth0
   */
  async updateUserProfile(
    auth0User: { sub?: string; email?: string },
    accessToken: string,
    profile: Partial<UserProfile>
  ): Promise<Auth0User> {
    if (!AUTH0_DOMAIN) {
      throw new Error('VITE_AUTH0_DOMAIN is not configured');
    }

    const userId = this.getUserId(auth0User);
    const managementToken = await this.getDelegationToken(accessToken);

    const updateRequest: Auth0UpdateUserRequest = {};

    // Update name if provided
    if (profile.name !== undefined) {
      updateRequest.name = profile.name;
    }

    // Update picture if provided
    if (profile.profilePicture !== undefined) {
      updateRequest.picture = profile.profilePicture;
    }

    // Update user_metadata with profile data
    const currentMetadata: Auth0UserMetadata = {};
    if (profile.age !== undefined) currentMetadata.age = profile.age;
    if (profile.gender !== undefined) currentMetadata.gender = profile.gender;
    if (profile.weight !== undefined) currentMetadata.weight = profile.weight;
    if (profile.height !== undefined) currentMetadata.height = profile.height;
    if (profile.goals !== undefined) currentMetadata.goals = profile.goals;
    if (profile.experienceLevel !== undefined) currentMetadata.experienceLevel = profile.experienceLevel;
    if (profile.equipment !== undefined) currentMetadata.equipment = profile.equipment;
    if (profile.workoutFrequency !== undefined) currentMetadata.workoutFrequency = profile.workoutFrequency;
    if (profile.preferredUnit !== undefined) currentMetadata.preferredUnit = profile.preferredUnit;
    if (profile.defaultRestTime !== undefined) currentMetadata.defaultRestTime = profile.defaultRestTime;

    if (Object.keys(currentMetadata).length > 0) {
      updateRequest.user_metadata = currentMetadata;
    }

    try {
      const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify(updateRequest),
      });

      if (!response.ok) {
        const error: Auth0ManagementApiError = await response.json().catch(() => ({
          statusCode: response.status,
          error: 'Unknown error',
          message: `HTTP ${response.status}: Failed to update user profile`,
        }));

        logger.error('Auth0 Management API error', error);
        throw new Error(error.message || `Failed to update Auth0 profile: ${response.statusText}`);
      }

      const updatedUser: Auth0User = await response.json();
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update Auth0 user profile', error);
      throw error;
    }
  }

  /**
   * Update user metadata only (faster for metadata-only updates)
   */
  async updateUserMetadata(
    auth0User: { sub?: string; email?: string },
    accessToken: string,
    metadata: Auth0UserMetadata
  ): Promise<Auth0User> {
    if (!AUTH0_DOMAIN) {
      throw new Error('VITE_AUTH0_DOMAIN is not configured');
    }

    const userId = this.getUserId(auth0User);
    const managementToken = await this.getDelegationToken(accessToken);

    try {
      const response = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify({
          user_metadata: metadata,
        }),
      });

      if (!response.ok) {
        const error: Auth0ManagementApiError = await response.json().catch(() => ({
          statusCode: response.status,
          error: 'Unknown error',
          message: `HTTP ${response.status}: Failed to update user metadata`,
        }));

        logger.error('Auth0 Management API error', error);
        throw new Error(error.message || `Failed to update Auth0 metadata: ${response.statusText}`);
      }

      const updatedUser: Auth0User = await response.json();
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update Auth0 user metadata', error);
      throw error;
    }
  }

  /**
   * Update user picture
   */
  async updateUserPicture(
    auth0User: { sub?: string; email?: string },
    accessToken: string,
    pictureUrl: string
  ): Promise<Auth0User> {
    return this.updateUserProfile(auth0User, accessToken, { profilePicture: pictureUrl });
  }

  /**
   * Clear cached delegation token (useful for testing or forced refresh)
   */
  clearTokenCache(): void {
    this.delegationTokenCache = null;
  }
}

export const auth0ManagementService = new Auth0ManagementService();

