import { getFirebaseAuth } from './firebaseConfig';
import { signInWithCustomToken, User as FirebaseUser, signOut } from 'firebase/auth';

interface CustomTokenCache {
  token: string;
  expiresAt: number;
}

/**
 * Firebase Authentication Bridge
 *
 * Bridges Auth0 authentication with Firebase Authentication using custom tokens.
 * This allows the app to use Auth0 as the primary authentication provider while
 * still being able to authenticate with Firebase/Firestore for data access.
 */
export class FirebaseAuthBridge {
  private customTokenCache: Map<string, CustomTokenCache> = new Map();
  private readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer before expiry
  private readonly TOKEN_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes (Firebase tokens valid for 1 hour)

  /**
   * Authenticate with Firebase using Auth0 token
   *
   * This method exchanges an Auth0 JWT token for a Firebase custom token via the backend API,
   * then signs into Firebase with that custom token. The custom token is cached for 55 minutes
   * to minimize API calls.
   *
   * @param auth0Token - The Auth0 JWT access token
   * @param userId - The user ID (Auth0 sub claim)
   * @returns Promise<FirebaseUser> - The authenticated Firebase user
   * @throws Error if authentication fails
   */
  async authenticateWithAuth0(auth0Token: string, userId: string): Promise<FirebaseUser> {
    try {
      // Check if we have a valid cached token
      const cached = this.customTokenCache.get(userId);
      if (cached && cached.expiresAt > Date.now() + this.TOKEN_EXPIRY_BUFFER) {
        console.log('[FirebaseAuthBridge] Using cached custom token for user:', userId);
        try {
          const auth = getFirebaseAuth();
          const userCredential = await signInWithCustomToken(auth, cached.token);
          console.log('[FirebaseAuthBridge] Successfully signed in with cached token');
          return userCredential.user;
        } catch (error) {
          // Token might be invalid, clear cache and try fresh
          console.warn('[FirebaseAuthBridge] Cached token failed, fetching new token:', error);
          this.customTokenCache.delete(userId);
        }
      }

      // Request custom token from backend API
      console.log('[FirebaseAuthBridge] Requesting new custom token from backend for user:', userId);
      const response = await fetch('/api/auth/firebase-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth0Token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Failed to get Firebase custom token: ${response.status} - ${errorData.error || response.statusText}`
        );
      }

      const { customToken } = await response.json();
      if (!customToken) {
        throw new Error('No custom token received from backend');
      }

      // Cache the token (expires in 55 minutes to be safe)
      this.customTokenCache.set(userId, {
        token: customToken,
        expiresAt: Date.now() + this.TOKEN_CACHE_DURATION,
      });
      console.log('[FirebaseAuthBridge] Custom token cached for user:', userId);

      // Sign into Firebase with custom token
      const auth = getFirebaseAuth();
      const userCredential = await signInWithCustomToken(auth, customToken);
      console.log('[FirebaseAuthBridge] Successfully signed into Firebase');

      return userCredential.user;
    } catch (error) {
      console.error('[FirebaseAuthBridge] Error authenticating with Firebase:', error);
      throw error;
    }
  }

  /**
   * Sign out from Firebase
   * Also clears the custom token cache
   */
  async signOut(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      this.customTokenCache.clear();
      console.log('[FirebaseAuthBridge] Signed out from Firebase and cleared token cache');
    } catch (error) {
      console.error('[FirebaseAuthBridge] Error signing out from Firebase:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated with Firebase
   */
  isAuthenticated(): boolean {
    const auth = getFirebaseAuth();
    return auth.currentUser !== null;
  }

  /**
   * Get current Firebase user
   */
  getCurrentUser(): FirebaseUser | null {
    const auth = getFirebaseAuth();
    return auth.currentUser;
  }

  /**
   * Get current user's UID
   */
  getCurrentUserId(): string | null {
    const currentUser = this.getCurrentUser();
    return currentUser ? currentUser.uid : null;
  }

  /**
   * Clear the custom token cache for a specific user
   * Useful when token might be invalid or user permissions have changed
   */
  clearTokenCache(userId?: string): void {
    if (userId) {
      this.customTokenCache.delete(userId);
      console.log('[FirebaseAuthBridge] Cleared token cache for user:', userId);
    } else {
      this.customTokenCache.clear();
      console.log('[FirebaseAuthBridge] Cleared all token cache');
    }
  }

  /**
   * Wait for Firebase authentication state to be ready
   * Useful for ensuring authentication is complete before making Firestore requests
   */
  async waitForAuth(timeoutMs: number = 5000): Promise<FirebaseUser | null> {
    const auth = getFirebaseAuth();

    // If already authenticated, return immediately
    if (auth.currentUser) {
      return auth.currentUser;
    }

    // Wait for auth state to change
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Firebase authentication timeout'));
      }, timeoutMs);

      const unsubscribe = auth.onAuthStateChanged((user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
  }
}

// Export singleton instance
export const firebaseAuthBridge = new FirebaseAuthBridge();
