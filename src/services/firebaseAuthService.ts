import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as firebaseUpdateProfile,
  updateEmail,
  updatePassword,
  User,
  AuthError,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebaseConfig';
import { logger } from '@/utils/logger';

export interface FirebaseAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  providerData: {
    providerId: string;
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
  }[];
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export class FirebaseAuthService {
  private auth: Auth;
  private googleProvider: GoogleAuthProvider;
  private appleProvider: OAuthProvider;

  constructor() {
    this.auth = getFirebaseAuth();

    // Configure Google provider
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      prompt: 'select_account',
    });
    this.googleProvider.addScope('profile');
    this.googleProvider.addScope('email');

    // Configure Apple provider
    this.appleProvider = new OAuthProvider('apple.com');
    this.appleProvider.addScope('email');
    this.appleProvider.addScope('name');
  }

  /**
   * Get the current Firebase user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Convert Firebase User to our custom interface
   */
  private convertUser(user: User): FirebaseAuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      providerData: user.providerData.map(provider => ({
        providerId: provider.providerId,
        uid: provider.uid,
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoURL,
      })),
    };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseAuthUser | null) => void): Unsubscribe {
    return onAuthStateChanged(this.auth, (user) => {
      if (user) {
        callback(this.convertUser(user));
      } else {
        callback(null);
      }
    });
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail({ email, password, displayName }: SignUpData): Promise<FirebaseAuthUser> {
    try {
      logger.log('[FirebaseAuth] Signing up with email:', email);

      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Update profile with display name if provided
      if (displayName) {
        await firebaseUpdateProfile(user, { displayName });
        logger.log('[FirebaseAuth] Display name set:', displayName);
      }

      // Send email verification
      await sendEmailVerification(user);
      logger.log('[FirebaseAuth] Verification email sent to:', email);

      logger.log('[FirebaseAuth] Sign up successful:', user.uid);
      return this.convertUser(user);
    } catch (error) {
      logger.error('[FirebaseAuth] Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail({ email, password }: SignInData): Promise<FirebaseAuthUser> {
    try {
      logger.log('[FirebaseAuth] Signing in with email:', email);

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      logger.log('[FirebaseAuth] Sign in successful:', user.uid);
      return this.convertUser(user);
    } catch (error) {
      logger.error('[FirebaseAuth] Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<FirebaseAuthUser> {
    try {
      logger.log('[FirebaseAuth] Signing in with Google');

      const userCredential = await signInWithPopup(this.auth, this.googleProvider);
      const user = userCredential.user;

      logger.log('[FirebaseAuth] Google sign in successful:', user.uid);
      return this.convertUser(user);
    } catch (error) {
      logger.error('[FirebaseAuth] Google sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple(): Promise<FirebaseAuthUser> {
    try {
      logger.log('[FirebaseAuth] Signing in with Apple');

      const userCredential = await signInWithPopup(this.auth, this.appleProvider);
      const user = userCredential.user;

      logger.log('[FirebaseAuth] Apple sign in successful:', user.uid);
      return this.convertUser(user);
    } catch (error) {
      logger.error('[FirebaseAuth] Apple sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      logger.log('[FirebaseAuth] Signing out');
      await firebaseSignOut(this.auth);
      logger.log('[FirebaseAuth] Sign out successful');
    } catch (error) {
      logger.error('[FirebaseAuth] Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      logger.log('[FirebaseAuth] Sending password reset email to:', email);
      await sendPasswordResetEmail(this.auth, email);
      logger.log('[FirebaseAuth] Password reset email sent');
    } catch (error) {
      logger.error('[FirebaseAuth] Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }

    if (user.emailVerified) {
      logger.log('[FirebaseAuth] Email already verified');
      return;
    }

    try {
      logger.log('[FirebaseAuth] Sending verification email');
      await sendEmailVerification(user);
      logger.log('[FirebaseAuth] Verification email sent');
    } catch (error) {
      logger.error('[FirebaseAuth] Send verification email error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user profile (display name and/or photo URL)
   */
  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      logger.log('[FirebaseAuth] Updating profile:', data);
      await firebaseUpdateProfile(user, data);
      logger.log('[FirebaseAuth] Profile updated successfully');
    } catch (error) {
      logger.error('[FirebaseAuth] Update profile error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user email
   */
  async updateUserEmail(newEmail: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      logger.log('[FirebaseAuth] Updating email to:', newEmail);
      await updateEmail(user, newEmail);
      await sendEmailVerification(user);
      logger.log('[FirebaseAuth] Email updated, verification email sent');
    } catch (error) {
      logger.error('[FirebaseAuth] Update email error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(newPassword: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user signed in');
    }

    try {
      logger.log('[FirebaseAuth] Updating password');
      await updatePassword(user, newPassword);
      logger.log('[FirebaseAuth] Password updated successfully');
    } catch (error) {
      logger.error('[FirebaseAuth] Update password error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Check if a user is signed in
   */
  isSignedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Wait for auth to be ready (useful for initialization)
   */
  async waitForAuth(timeoutMs: number = 5000): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        reject(new Error('Auth initialization timeout'));
      }, timeoutMs);

      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });
  }

  /**
   * Handle Firebase Auth errors and convert to user-friendly messages
   */
  private handleAuthError(error: unknown): Error {
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case 'auth/email-already-in-use':
          return new Error('This email is already registered. Please sign in instead.');
        case 'auth/invalid-email':
          return new Error('Please enter a valid email address.');
        case 'auth/weak-password':
          return new Error('Password should be at least 6 characters long.');
        case 'auth/user-not-found':
          return new Error('No account found with this email. Please sign up first.');
        case 'auth/wrong-password':
          return new Error('Incorrect password. Please try again.');
        case 'auth/too-many-requests':
          return new Error('Too many failed attempts. Please try again later.');
        case 'auth/user-disabled':
          return new Error('This account has been disabled. Please contact support.');
        case 'auth/operation-not-allowed':
          return new Error('This sign-in method is not enabled. Please contact support.');
        case 'auth/popup-closed-by-user':
          return new Error('Sign-in popup was closed before completing. Please try again.');
        case 'auth/cancelled-popup-request':
          return new Error('Another sign-in attempt is in progress.');
        case 'auth/popup-blocked':
          return new Error('Pop-up blocked by browser. Please allow pop-ups for this site.');
        case 'auth/requires-recent-login':
          return new Error('This operation requires recent authentication. Please sign in again.');
        case 'auth/invalid-credential':
          return new Error('Invalid credentials. Please check your email and password.');
        case 'auth/network-request-failed':
          return new Error('Network error. Please check your internet connection.');
        default:
          logger.error('[FirebaseAuth] Unhandled auth error:', authError.code, authError.message);
          return new Error(`Authentication error: ${authError.message}`);
      }
    }

    return error instanceof Error ? error : new Error('Unknown authentication error');
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
