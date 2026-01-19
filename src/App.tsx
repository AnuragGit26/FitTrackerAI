import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { dataSync } from '@/services/dataSync';
import { initializeDefaultTemplates } from '@/services/templateLibrary';
import { workoutEventTracker } from '@/services/workoutEventTracker';
import { muscleImageCache } from '@/services/muscleImageCache';
import { notificationService } from '@/services/notificationService';
import { dataService } from '@/services/dataService';
import { getFirestoreDiagnostics, forceFirestoreOnline } from '@/services/firebaseConfig';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AnimatedPage } from '@/components/common/AnimatedPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RouteLoader } from '@/components/common/RouteLoader';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { analytics } from '@/utils/analytics';
import { seedWorkoutLogs } from '@/utils/seedWorkoutLogs';
import { cacheVersionService } from '@/services/cacheVersionService';
import { logger } from '@/utils/logger';

// Lazy load route components for code splitting
// Pages with default exports: LogWorkout, WorkoutSummary, EditWorkout, WorkoutHistory
// Pages with named exports only: all others
const Home = lazy(() => import('@/pages/Home').then(m => ({ default: m.Home })));
const LogWorkout = lazy(() => import('@/pages/LogWorkout'));
const CreateCustomExercise = lazy(() => import('@/pages/CreateCustomExercise').then(m => ({ default: m.CreateCustomExercise })));
const WorkoutTemplates = lazy(() => import('@/pages/WorkoutTemplates').then(m => ({ default: m.WorkoutTemplates })));
const CreateTemplate = lazy(() => import('@/pages/CreateTemplate').then(m => ({ default: m.CreateTemplate })));
const Analytics = lazy(() => import('@/pages/Analytics').then(m => ({ default: m.Analytics })));
const Insights = lazy(() => import('@/pages/Insights').then(m => ({ default: m.Insights })));
const Rest = lazy(() => import('@/pages/Rest').then(m => ({ default: m.Rest })));
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })));
const Trash = lazy(() => import('@/pages/Trash').then(m => ({ default: m.Trash })));
const Planner = lazy(() => import('@/pages/Planner').then(m => ({ default: m.Planner })));
const SleepRecovery = lazy(() => import('@/pages/SleepRecovery').then(m => ({ default: m.SleepRecovery })));
const WorkoutSummary = lazy(() => import('@/pages/WorkoutSummary'));
const WorkoutHistory = lazy(() => import('@/pages/WorkoutHistory'));
const EditWorkout = lazy(() => import('@/pages/EditWorkout'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('@/pages/SignUp').then(m => ({ default: m.SignUp })));

// Component to handle OAuth callback - Firebase handles this automatically
function SsoCallbackHandler() {
  const { loading, currentUser } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/login" replace />;
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
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

        // PARALLEL INITIALIZATION: Run independent tasks concurrently
        // This significantly reduces initialization time
        const [settingsResult] = await Promise.allSettled([
          // Load settings - needed by many components
          loadSettings(),

          // Initialize database and exercise library - independent
          exerciseLibrary.initialize(),

          // Start data synchronization service - independent
          Promise.resolve().then(() => dataSync.initialize()),

          // Preload muscle images in background - independent, non-blocking
          muscleImageCache.preloadAllImages().catch((error) => {
            logger.warn('Failed to preload muscle images:', error);
          }),

          // Clear expired muscle image cache - independent, non-blocking
          muscleImageCache.clearExpiredCache().catch((error) => {
            logger.warn('Failed to clear expired muscle image cache:', error);
          }),
        ]);

        // Check if settings loaded successfully
        if (settingsResult.status === 'rejected') {
          logger.error('Failed to load settings', settingsResult.reason);
        }

        // USER-DEPENDENT INITIALIZATION: These require user to be loaded
        // User might not be available yet (loaded in AppRoutes), so we check
        const user = useUserStore.getState().profile;
        if (user?.id) {
          // Initialize workout event tracker (notifications pulled after Firebase auth in AppRoutes)
          await workoutEventTracker.initialize(user.id).catch((error) => {
            logger.warn('Failed to initialize workout event tracker:', error);
          });
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
              // Wait for service worker to be active before registering background sync
              if ('sync' in registration) {
                try {
                  // Ensure service worker is active before registering background sync
                  if (registration.active) {
                    await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('workout-reminder-sync');
                  } else if (registration.installing) {
                    // Wait for installation to complete
                    registration.installing.addEventListener('statechange', async () => {
                      if (registration.active && 'sync' in registration) {
                        try {
                          await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('workout-reminder-sync');
                        } catch (error) {
                          logger.warn('[SW] Background sync registration failed:', error);
                        }
                      }
                    });
                  } else if (registration.waiting) {
                    // Service worker is waiting, activate it
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    // Wait a bit for activation, then register
                    setTimeout(async () => {
                      if (registration.active && 'sync' in registration) {
                        try {
                          await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('workout-reminder-sync');
                        } catch (error) {
                          logger.warn('[SW] Background sync registration failed:', error);
                        }
                      }
                    }, 1000);
                  }
                } catch (error) {
                  logger.warn('[SW] Background sync registration failed:', error);
                }
              }
              
              // Register periodic sync for recovery checks (if supported)
              // Wait for service worker to be active before registering periodic sync
              if ('periodicSync' in registration) {
                try {
                  // Ensure service worker is active before registering periodic sync
                  if (registration.active) {
                    await (registration as ServiceWorkerRegistration & { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('recovery-check', {
                      minInterval: 60 * 60 * 1000, // 1 hour
                    });
                  } else if (registration.installing) {
                    // Wait for installation to complete
                    registration.installing.addEventListener('statechange', async () => {
                      if (registration.active && 'periodicSync' in registration) {
                        try {
                          await (registration as ServiceWorkerRegistration & { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('recovery-check', {
                            minInterval: 60 * 60 * 1000, // 1 hour
                          });
                        } catch (error) {
                          logger.warn('[SW] Periodic sync registration failed:', error);
                        }
                      }
                    });
                  } else if (registration.waiting) {
                    // Service worker is waiting, activate it
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    // Wait a bit for activation, then register
                    setTimeout(async () => {
                      if (registration.active && 'periodicSync' in registration) {
                        try {
                          await (registration as ServiceWorkerRegistration & { periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync.register('recovery-check', {
                            minInterval: 60 * 60 * 1000, // 1 hour
                          });
                        } catch (error) {
                          logger.warn('[SW] Periodic sync registration failed:', error);
                        }
                      }
                    }, 1000);
                  }
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
                logger.error('[SW] Service Worker registration failed:', error);
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
            const user = useUserStore.getState().profile;
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
  }, [loadSettings]);

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
        className="flex items-center justify-center h-screen bg-gray-50 dark:bg-background-dark"
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
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <VercelAnalytics />
        <SpeedInsights />
        <OfflineIndicator />
        <InstallPrompt />
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { currentUser, loading } = useAuth();
  const initializeUser = useUserStore((state) => state.initializeUser);

  // Helper function to wait for Firestore to be ready
  async function waitForFirestoreReady(maxWaitMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const diagnostics = getFirestoreDiagnostics();
      if (diagnostics.isInitialized && diagnostics.networkEnabled) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  }

  // Sync user store with Firebase user when authenticated
  useEffect(() => {
    if (!loading && currentUser) {
      const userId = currentUser.uid;

      // Extract first name from display name (if available)
      const firstName = currentUser.displayName?.split(' ')[0] || null;

      initializeUser({
        id: userId,
        firstName,
        username: currentUser.displayName || currentUser.email?.split('@')[0] || null,
        emailAddresses: currentUser.email ? [{ emailAddress: currentUser.email }] : [],
      }).then(async () => {
        logger.info('[App.tsx] User initialized with Firebase UID:', userId);

        dataService.enableSync(true);

        // Initialize workout event tracker for this user
        workoutEventTracker.initialize(userId).catch((error) => {
          logger.error('Failed to initialize workout event tracker', error);
        });

        // Initialize default templates after user is loaded
        try {
          await initializeDefaultTemplates(userId);
        } catch (error) {
          logger.error('Failed to initialize templates', error);
        }

        // Wait for Firestore to be ready before attempting sync
        const firestoreReady = await waitForFirestoreReady(5000);
        if (!firestoreReady) {
          logger.warn('Firestore not ready after 5s, will attempt sync anyway...');
        }

        const isOnline = typeof navigator === 'undefined' || navigator.onLine;
        if (isOnline) {
          try {
            // Explicitly force online before bootstrap
            await forceFirestoreOnline();
            logger.info('[App] Firestore forced online before bootstrap');
          } catch (error) {
            logger.warn('Failed to force Firestore online before bootstrap:', error);
          }

          try {
            const { syncMetadataService } = await import('@/services/syncMetadataService');
            const metadata = await syncMetadataService.getLocalMetadata('workouts', userId);
            const shouldBootstrap = !metadata?.lastPushAt;

            if (shouldBootstrap) {
              logger.info('[App] Starting bootstrap sync...');
              const { firestoreSyncService } = await import('@/services/firestoreSyncService');
              await firestoreSyncService.sync(userId, {
                direction: 'push',
                forceFullSync: true,
                tables: [
                  'workouts',
                  'exercises',
                  'workout_templates',
                  'planned_workouts',
                  'muscle_statuses',
                  'user_profiles',
                  'settings',
                  'sleep_logs',
                  'recovery_logs',
                  'error_logs',
                ],
              });
              logger.info('[App] Bootstrap sync completed successfully');
            }
          } catch (error) {
            logger.warn('Failed to bootstrap Firestore sync on login:', error);
            // Don't block login on sync failure
          }
        }

        // Pull notifications (Note: MongoDB/Supabase will be removed in Phase 6)
        // This is temporary until we fully migrate to Firestore
        await notificationService.pullFromMongoDB(userId)
          .then(() => {
            // Start periodic notification pulling (every hour)
            notificationService.startPeriodicPull(userId, 60);
          })
          .catch((error) => {
            logger.warn('Failed to pull notifications:', error);
          });
      }).catch((err) => {
        logger.error('Failed to initialize user', err);
      });
    }
  }, [loading, currentUser, initializeUser]);

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
          !loading && currentUser ? (
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
          !loading && currentUser ? (
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
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Onboarding />
                      </Suspense>
                    </ErrorBoundary>
                  </AnimatedPage>
                </ProtectedRoute>
              }
            />
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
              path="/trash"
              element={
                <ProtectedRoute>
                  <AnimatedPage>
                    <ErrorBoundary>
                      <Suspense fallback={<RouteLoader />}>
                        <Trash />
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

  // Show loading while Firebase auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return currentUser ? protectedRoutes : publicRoutes;
}

export default App;

