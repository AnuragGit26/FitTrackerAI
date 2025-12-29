import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
const LogWorkout = lazy(() => import('@/pages/LogWorkout'));
const CreateCustomExercise = lazy(() => import('@/pages/CreateCustomExercise').then(m => ({ default: m.CreateCustomExercise })));
const WorkoutTemplates = lazy(() => import('@/pages/WorkoutTemplates').then(m => ({ default: m.WorkoutTemplates })));
const CreateTemplate = lazy(() => import('@/pages/CreateTemplate').then(m => ({ default: m.CreateTemplate })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Insights = lazy(() => import('@/pages/Insights').then(m => ({ default: m.Insights })));
const Rest = lazy(() => import('@/pages/Rest').then(m => ({ default: m.Rest })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const SleepRecovery = lazy(() => import('@/pages/SleepRecovery').then(m => ({ default: m.SleepRecovery })));
const WorkoutSummary = lazy(() => import('@/pages/WorkoutSummary').then(m => ({ default: m.WorkoutSummary })));
const WorkoutHistory = lazy(() => import('@/pages/WorkoutHistory').then(m => ({ default: m.WorkoutHistory })));
const EditWorkout = lazy(() => import('@/pages/EditWorkout').then(m => ({ default: m.EditWorkout })));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('@/pages/SignUp').then(m => ({ default: m.SignUp })));

// Component to handle OAuth callback - Auth0 handles this automatically
function SsoCallbackHandler() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const initializeUser = useUserStore((state) => state.initializeUser);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const settings = useSettingsStore((state) => state.settings);

  // Global error handlers for Auth0 debugging
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const errorMsg = event.message || String(event.error);
      if (errorMsg.includes('auth0') || errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = event.reason?.message || String(event.reason);
      if (errorMsg.includes('auth0') || errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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
          // In dev mode with injectManifest, VitePWA serves it at /dev-sw.js?dev-sw
          // In prod, it's at /sw.js after build
          const isDev = import.meta.env.DEV;
          const swPath = isDev ? '/dev-sw.js?dev-sw' : '/sw.js';
          const swOptions = isDev 
            ? { scope: '/' as const, type: 'module' as const }
            : { scope: '/' as const };
          
          // Check if service worker file exists before registering
          fetch(swPath, { method: 'HEAD' })
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Service worker file not found: ${swPath}`);
              }
              return navigator.serviceWorker.register(swPath, swOptions);
            })
            .then(async (registration) => {
              
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
              // Only log error if it's not a 404 (file not found)
              if (!error.message?.includes('not found') && !error.message?.includes('404')) {
                console.error('[SW] Service Worker registration failed:', error);
              }
              // In dev mode, this might fail initially - that's okay, it will work after VitePWA builds it
            });
          
          // Listen for service worker messages
          // Note: AI_INSIGHTS_READY messages are handled by swCommunication utility
          navigator.serviceWorker.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'AI_REFRESH_CHECK') {
              // The refresh service will handle this automatically
            }
            
            if (event.data && event.data.type === 'CHECK_WORKOUT_REMINDERS') {
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
            await seedWorkoutLogs(targetUserId);
          };
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
        <SpeedInsights />
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
  const { isAuthenticated, isLoading, user: auth0User, error: auth0Error, getAccessTokenSilently } = useAuth0();
  const initializeUser = useUserStore((state) => state.initializeUser);



  // Sync user store with Auth0 user when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && auth0User) {
      initializeUser({
        id: auth0User.sub || auth0User.email || 'user-unknown',
        firstName: auth0User.given_name || auth0User.nickname || null,
        username: auth0User.nickname || auth0User.name || null,
        emailAddresses: auth0User.email ? [{ emailAddress: auth0User.email }] : [],
      }).then(() => {
        const userId = auth0User.sub || auth0User.email || 'user-unknown';
        // Initialize workout event tracker for this user
        workoutEventTracker.initialize(userId).catch((error) => {
          logger.error('Failed to initialize workout event tracker', error);
        });
        
        // Initialize default templates after user is loaded
        initializeDefaultTemplates(userId).catch((error) => {
          logger.error('Failed to initialize templates', error);
        });
      }).catch((err) => {
      });
    } else if (!isLoading && !isAuthenticated) {
    }
  }, [isLoading, isAuthenticated, auth0User, initializeUser, auth0Error]);

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
          !isLoading && isAuthenticated ? (
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
          !isLoading && isAuthenticated ? (
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
            <Route
              path="/sleep-recovery"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <SleepRecovery />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout-summary/:workoutId"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <WorkoutSummary />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workout-history"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <WorkoutHistory />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-workout/:workoutId"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <EditWorkout />
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

  // Show loading while Auth0 is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? protectedRoutes : publicRoutes;
}

export default App;

