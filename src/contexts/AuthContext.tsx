import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { firebaseAuthService, FirebaseAuthUser, SignUpData, SignInData } from '@/services/firebaseAuthService';
import { logger } from '@/utils/logger';

interface AuthContextType {
  currentUser: FirebaseAuthUser | null;
  loading: boolean;
  error: Error | null;
  signUp: (data: SignUpData) => Promise<FirebaseAuthUser>;
  signIn: (data: SignInData) => Promise<FirebaseAuthUser>;
  signInWithGoogle: () => Promise<FirebaseAuthUser>;
  signInWithApple: () => Promise<FirebaseAuthUser>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfile: (data: { displayName?: string; photoURL?: string }) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    logger.log('[AuthContext] Initializing auth listener');

    // Subscribe to auth state changes
    const unsubscribe = firebaseAuthService.onAuthStateChange((user) => {
      logger.log('[AuthContext] Auth state changed:', user ? user.uid : 'null');
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      logger.log('[AuthContext] Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signUp = async (data: SignUpData): Promise<FirebaseAuthUser> => {
    try {
      setError(null);
      const user = await firebaseAuthService.signUpWithEmail(data);
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign up failed');
      setError(error);
      throw error;
    }
  };

  const signIn = async (data: SignInData): Promise<FirebaseAuthUser> => {
    try {
      setError(null);
      const user = await firebaseAuthService.signInWithEmail(data);
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign in failed');
      setError(error);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<FirebaseAuthUser> => {
    try {
      setError(null);
      const user = await firebaseAuthService.signInWithGoogle();
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Google sign in failed');
      setError(error);
      throw error;
    }
  };

  const signInWithApple = async (): Promise<FirebaseAuthUser> => {
    try {
      setError(null);
      const user = await firebaseAuthService.signInWithApple();
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Apple sign in failed');
      setError(error);
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.signOut();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Sign out failed');
      setError(error);
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.resetPassword(email);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Password reset failed');
      setError(error);
      throw error;
    }
  };

  const sendVerificationEmail = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.sendVerificationEmail();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Send verification email failed');
      setError(error);
      throw error;
    }
  };

  const updateProfile = async (data: { displayName?: string; photoURL?: string }): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.updateProfile(data);
      // Update current user state
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update profile failed');
      setError(error);
      throw error;
    }
  };

  const updateEmail = async (newEmail: string): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.updateUserEmail(newEmail);
      // User state will be updated automatically by auth state listener
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update email failed');
      setError(error);
      throw error;
    }
  };

  const updatePassword = async (newPassword: string): Promise<void> => {
    try {
      setError(null);
      await firebaseAuthService.updateUserPassword(newPassword);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update password failed');
      setError(error);
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    sendVerificationEmail,
    updateProfile,
    updateEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
