import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useUser, AuthenticateWithRedirectCallback, useSignIn, useSignUp } from '@clerk/clerk-react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useUserStore as getUserStore } from '@/store/userStore';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { dataSync } from '@/services/dataSync';
import { initializeDefaultTemplates } from '@/services/templateLibrary';
import { workoutEventTracker } from '@/services/workoutEventTracker';
import { muscleImageCache } from '@/services/muscleImageCache';
import { notificationService } from '@/services/notificationService';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AnimatedPage } from '@/components/common/AnimatedPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RouteLoader } from '@/components/common/RouteLoader';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { MobileOnlyModal } from '@/components/common/MobileOnlyModal';
import { analytics } from '@/utils/analytics';
import { seedWorkoutLogs } from '@/utils/seedWorkoutLogs';
import { cacheVersionService } from '@/services/cacheVersionService';
import { logger } from '@/utils/logger';

// Lazy load route components for code splitting
const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const LogWorkout = lazy(() => import('@/pages/LogWorkout').then(m => ({ default: m.LogWorkout })));
const CreateCustomExercise = lazy(() => import('@/pages/CreateCustomExercise').then(m => ({ default: m.CreateCustomExercise })));
const WorkoutTemplates = lazy(() => import('@/pages/WorkoutTemplates').then(m => ({ default: m.WorkoutTemplates })));
const CreateTemplate = lazy(() => import('@/pages/CreateTemplate').then(m => ({ default: m.CreateTemplate })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Insights = lazy(() => import('@/pages/Insights').then(m => ({ default: m.Insights })));
const Rest = lazy(() => import('@/pages/Rest').then(m => ({ default: m.Rest })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('@/pages/SignUp').then(m => ({ default: m.SignUp })));

// Component to handle OAuth callback with logging
function SsoCallbackHandler() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const navigate = useNavigate();

  // Handle OAuth callback completion - check both signIn and signUp
  useEffect(() => {
    let isAsyncPollingActive = false; // Flag to prevent setInterval from redirecting while async polling is active
    
    async function handleCallback() {
      if (!isLoaded) return;

      // Check if signIn has a completed session
      if (signIn?.status === 'complete' && signIn.createdSessionId) {
        try {
          if (setActiveSignIn) {
            await setActiveSignIn({ session: signIn.createdSessionId });
          }
          navigate('/', { replace: true });
          return;
        } catch (error) {
          // Error handled silently
        }
      }

      // Check if signUp has a completed session
      if (signUp?.status === 'complete' && signUp.createdSessionId) {
        try {
          if (setActiveSignUp) {
            await setActiveSignUp({ session: signUp.createdSessionId });
          }
          navigate('/', { replace: true });
          return;
        } catch (error) {
          // Error handled silently
        }
      }

      // Check if signUp has missing requirements - this could be from OAuth
      // Even if externalAccount is null, we should wait for AuthenticateWithRedirectCallback to process
      if (signUp?.status === 'missing_requirements') {
        const externalAccount = signUp.verifications?.externalAccount;
        const externalAccountStatus = externalAccount?.status;
        const hasExternalAccount = externalAccount !== null && externalAccount !== undefined;

        // If we're on /sso-callback and external account is null/unverified, wait for AuthenticateWithRedirectCallback to process it
        // Also check if we're coming from OAuth by checking URL params or if email is missing (which suggests OAuth)
        const isOnSsoCallback = window.location.pathname === '/sso-callback';
        const isLikelyOAuth = isOnSsoCallback || (signUp.missingFields?.includes('email_address') && !signUp.emailAddress);
        
        if (isLikelyOAuth && (externalAccountStatus === 'unverified' || externalAccountStatus === null || !hasExternalAccount)) {
          // Set flag to prevent setInterval from redirecting while async polling is active
          isAsyncPollingActive = true;
          // Wait for AuthenticateWithRedirectCallback to process the OAuth callback
          // Poll for up to 3 seconds for the status to change or email to be extracted
          let pollAttempts = 0;
          const maxPollAttempts = 30; // Reduced from 50 to 30 (3 seconds instead of 5)
          
          while (pollAttempts < maxPollAttempts) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Reduced frequency from 100ms to 200ms
            pollAttempts++;
            
            // Check if status changed - re-read from signUp to get latest state
            const currentEmail = signUp.emailAddress;
            const currentSignUpStatus = signUp.status as string;
            const currentMissingFields = signUp.missingFields;
            
            // If signup is complete, activate session immediately
            if (currentSignUpStatus === 'complete' && signUp.createdSessionId && setActiveSignUp) {
              await setActiveSignUp({ session: signUp.createdSessionId });
              navigate('/', { replace: true });
              return;
            }
            
            // If email is persisted (not in missingFields), redirect to signup page
            if (currentEmail && currentEmail !== null && currentMissingFields && !currentMissingFields.includes('email_address') && currentSignUpStatus === 'missing_requirements') {
              isAsyncPollingActive = false;
              navigate('/signup#/continue', { replace: true });
              return;
            }
          }
          
          // Clear flag after polling completes
          isAsyncPollingActive = false;
        }

        // If external account is verified or transferable, wait a bit for Clerk to process and check status again
        if (externalAccount && (externalAccount.status === 'verified' || externalAccount.status === 'transferable')) {
          // Wait for Clerk to process the verified external account
          await new Promise(resolve => setTimeout(resolve, 1000));

          // If signup is now complete, activate the session
          // Re-check signUp to get updated status (TypeScript needs this to narrow the type)
          const updatedSignUp = signUp;
          if (updatedSignUp && updatedSignUp.status === 'complete' && updatedSignUp.createdSessionId && setActiveSignUp) {
            await setActiveSignUp({ session: updatedSignUp.createdSessionId });
            navigate('/', { replace: true });
            return;
          }
        }
      }

      // Monitor for status changes (poll for up to 2 seconds, reduced frequency)
      let attempts = 0;
      const maxAttempts = 10; // Reduced from 30 to 10 (2 seconds instead of 3)
      const checkInterval = setInterval(() => {
        attempts++;

        if (signIn?.status === 'complete' && signIn.createdSessionId && setActiveSignIn) {
          clearInterval(checkInterval);
          setActiveSignIn({ session: signIn.createdSessionId }).then(() => {
            navigate('/', { replace: true });
          });
        } else if (signUp?.status === 'complete' && signUp.createdSessionId && setActiveSignUp) {
          clearInterval(checkInterval);
          setActiveSignUp({ session: signUp.createdSessionId }).then(() => {
            navigate('/', { replace: true });
          });
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          // If async polling is still active, don't redirect yet - let it complete
          if (isAsyncPollingActive) {
            return; // Don't redirect, let async polling handle it
          }
          // If signUp has missing_requirements, redirect to signup page
          if (signUp?.status === 'missing_requirements') {
            navigate('/signup#/continue', { replace: true });
          } else {
            navigate('/login', { replace: true });
          }
        }
      }, 200); // Reduced frequency from 100ms to 200ms

      return () => clearInterval(checkInterval);
    }

    handleCallback();
  }, [isLoaded, signIn, signUp, setActiveSignIn, setActiveSignUp, navigate]);

  // Monitor auth state changes
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <AuthenticateWithRedirectCallback
      redirectUrl="/"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    />
  );
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const initializeUser = useUserStore((state) => state.initializeUser);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const settings = useSettingsStore((state) => state.settings);

  useEffect(() => {
    async function init() {
      try {
        // Check version and clear cache if needed (must be first, before any other initialization)
        const cacheCleared = await cacheVersionService.checkAndClearCacheIfNeeded();
        if (cacheCleared) {
          // Page will reload, so we can return early
          return;
        }
        
        // Track app initialization
        analytics.track('app_initialized');
        
        // Initialize database and exercise library
        await exerciseLibrary.initialize();
        
        // Initialize user and settings
        await Promise.all([initializeUser(), loadSettings()]);
        
        // Initialize data synchronization
        dataSync.initialize();
        
        // Preload and cache muscle images in the background
        muscleImageCache.preloadAllImages().catch((error) => {
          console.warn('Failed to preload muscle images:', error);
        });
        
        // Clear expired muscle image cache
        muscleImageCache.clearExpiredCache().catch((error) => {
          console.warn('Failed to clear expired muscle image cache:', error);
        });
        
        // Initialize workout event tracker
        const user = getUserStore.getState().profile;
        if (user?.id) {
          await workoutEventTracker.initialize(user.id);
        }
        
        // Register service worker (enabled in both dev and prod for end-to-end testing)
        if ('serviceWorker' in navigator) {
          // Determine the service worker path based on environment
          // In dev mode with injectManifest, VitePWA serves it at /sw.js
          // In prod, it's also at /sw.js after build
          const swPath = '/sw.js';
          
          navigator.serviceWorker
            .register(swPath, { scope: '/' })
            .then(async (registration) => {
              logger.sw(`Service Worker registered (${import.meta.env.DEV ? 'DEV' : 'PROD'}):`, registration);
              
              // Check for updates periodically
              setInterval(() => {
                registration.update();
              }, 60 * 60 * 1000); // Check every hour
              
              // Handle service worker updates
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New service worker available, prompt user to refresh
                      logger.sw('New service worker available');
                    }
                  });
                }
              });
              
              // Register background sync for workout reminders
              if ('sync' in registration) {
                try {
                  await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('workout-reminder-sync');
                } catch (error) {
                  logger.warn('[SW] Background sync registration failed:', error);
                }
              }
              
              // Register periodic sync for recovery checks (if supported)
              if ('periodicSync' in registration) {
                try {
                  await (registration as ServiceWorkerRegistration & { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('recovery-check', {
                    minInterval: 60 * 60 * 1000, // 1 hour
                  });
                } catch (error) {
                  logger.warn('[SW] Periodic sync registration failed:', error);
                }
              }
              
              // Initialize notification service
              await notificationService.initialize();
            })
            .catch((error) => {
              console.error('[SW] Service Worker registration failed:', error);
              // In dev mode, this might fail initially - that's okay, it will work after first build
              if (import.meta.env.DEV) {
                logger.sw('Note: Service worker may not be available until VitePWA processes it');
              }
            });
          
          // Listen for service worker messages
          // Note: AI_INSIGHTS_READY messages are handled by swCommunication utility
          navigator.serviceWorker.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'AI_REFRESH_CHECK') {
              logger.sw('AI refresh check requested');
              // The refresh service will handle this automatically
            }
            
            if (event.data && event.data.type === 'CHECK_WORKOUT_REMINDERS') {
              logger.sw('Checking workout reminders');
              // Check and trigger any due workout reminders
              const { usePlannedWorkoutStore } = await import('@/store/plannedWorkoutStore');
              const { useUserStore } = await import('@/store/userStore');
              const { useSettingsStore } = await import('@/store/settingsStore');
              
              const user = useUserStore.getState().profile;
              const settings = useSettingsStore.getState().settings;
              
              if (user && settings.workoutReminderEnabled && settings.notificationPermission === 'granted') {
                const { plannedWorkouts } = usePlannedWorkoutStore.getState();
                const now = new Date();
                
                for (const workout of plannedWorkouts) {
                  if (workout.scheduledTime && !workout.isCompleted) {
                    const scheduledTime = new Date(workout.scheduledTime);
                    const reminderTime = new Date(scheduledTime.getTime() - (settings.workoutReminderMinutes || 30) * 60 * 1000);
                    
                    // If reminder time is within the next minute, trigger notification
                    if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60 * 1000)) {
                      await notificationService.scheduleWorkoutReminder(workout, settings.workoutReminderMinutes || 30);
                    }
                  }
                }
              }
            }
            
            if (event.data && event.data.type === 'CHECK_MUSCLE_RECOVERY') {
              logger.sw('Checking muscle recovery');
              // Trigger muscle recovery recalculation
              const { useUserStore } = await import('@/store/userStore');
              const { muscleRecoveryService } = await import('@/services/muscleRecoveryService');
              
              const user = useUserStore.getState().profile;
              if (user?.id) {
                muscleRecoveryService.recalculateAllMuscleStatuses(user.id).catch((error) => {
                  logger.error('[SW] Failed to recalculate muscle recovery', error);
                });
              }
            }
            
            // AI_INSIGHTS_READY and AI_INSIGHTS_ERROR are handled by swCommunication
            // which is imported and initialized by useInsightsData hook
          });
        }
        
        // Expose seed function in development for testing
        if (import.meta.env.DEV) {
          (window as Window & { seedWorkoutLogs?: (userId?: string) => Promise<void> }).seedWorkoutLogs = async (userId?: string) => {
            const user = getUserStore.getState().profile;
            const targetUserId = userId || user?.id || 'user-1';
            logger.log(`🌱 Seeding workout logs for user: ${targetUserId}`);
            await seedWorkoutLogs(targetUserId);
          };
          logger.log('💡 Dev tip: Run seedWorkoutLogs() in console to seed test data');
        }
      } catch (error) {
        logger.error('Failed to initialize app', error, { context: 'app_initialization' });
        const errorObj = error instanceof Error ? error : new Error(String(error));
        analytics.trackError(errorObj, { context: 'app_initialization' });
      } finally {
        setIsInitializing(false);
      }
    }

    init();

    return () => {
      dataSync.destroy();
    };
  }, [initializeUser, loadSettings]);

  useEffect(() => {
    // Apply theme
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  if (isInitializing) {
    return (
      <motion.div 
        className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div 
          className="text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <LoadingSpinner size="lg" />
          <motion.p 
            className="mt-4 text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Loading FitTrackAI...
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <VercelAnalytics />
        <MobileOnlyModal />
        <OfflineIndicator />
        <InstallPrompt />
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const initializeUser = useUserStore((state) => state.initializeUser);

  // Sync user store with Clerk user when authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      initializeUser({
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        username: clerkUser.username,
        emailAddresses: clerkUser.emailAddresses.map((ea) => ({ emailAddress: ea.emailAddress })),
      }).then(() => {
        // Initialize workout event tracker for this user
        workoutEventTracker.initialize(clerkUser.id).catch((error) => {
          logger.error('Failed to initialize workout event tracker', error);
        });
        
        // Initialize default templates after user is loaded
        initializeDefaultTemplates(clerkUser.id).catch((error) => {
          logger.error('Failed to initialize templates', error);
        });
      });
    }
  }, [isLoaded, isSignedIn, clerkUser, initializeUser]);

  // Public routes (no auth required, no layout)
  const publicRoutes = (
    <Routes location={location} key={location.pathname}>
      <Route
        path="/sso-callback"
        element={
          <SsoCallbackHandler />
        }
      />
      <Route
        path="/login"
        element={
          isLoaded && isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<RouteLoader />}>
              <Login />
            </Suspense>
          )
        }
      />
      <Route
        path="/signup"
        element={
          isLoaded && isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<RouteLoader />}>
              <SignUp />
            </Suspense>
          )
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );

  // Protected routes (auth required, with layout)
  const protectedRoutes = (
    <Layout>
      <ErrorBoundary>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Home />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/log-workout"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <LogWorkout />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-exercise"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <CreateCustomExercise />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout-templates"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <WorkoutTemplates />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-template"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <CreateTemplate />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Analytics />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Insights />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rest"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Rest />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Profile />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Planner />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
    </Layout>
  );

  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isSignedIn ? protectedRoutes : publicRoutes;
}

export default App;

