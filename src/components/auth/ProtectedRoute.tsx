import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStore } from '@/store/userStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading: authLoading, currentUser } = useAuth();
  const { profile, isLoading: profileLoading } = useUserStore();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile to load if authenticated
  // We check if profile is null but we are expecting it (currentUser exists)
  // However, initializeUser might still be running.
  // profileLoading is true during initialization.
  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Onboarding Guard
  // If user is new (hasCompletedOnboarding === false) and not on onboarding page -> Redirect to onboarding
  if (profile?.hasCompletedOnboarding === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If user is established (hasCompletedOnboarding === true) and on onboarding page -> Redirect to home
  // Only redirect if we have a profile AND onboarding is explicitly completed
  // If profile is null or hasCompletedOnboarding is undefined, allow access to onboarding
  if (profile && profile.hasCompletedOnboarding === true && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

