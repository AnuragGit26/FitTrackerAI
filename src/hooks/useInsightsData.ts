import { useState, useEffect, useCallback, useRef } from 'react';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMuscleRecovery } from './useMuscleRecovery';
import { analyticsService } from '@/services/analyticsService';
import { aiService } from '@/services/aiService';
import { aiChangeDetector } from '@/services/aiChangeDetector';
import { aiRefreshService } from '@/services/aiRefreshService';
import { aiCallManager } from '@/services/aiCallManager';
import { swCommunication } from '@/services/swCommunication';
import { backgroundAIFetcher } from '@/services/backgroundAIFetcher';
import {
  ProgressAnalysis,
  SmartAlerts,
  WorkoutRecommendations,
} from '@/types/insights';
import { Workout } from '@/types/workout';
import { MuscleStatus } from '@/types/muscle';
import { PersonalRecord, StrengthProgression } from '@/types/analytics';
import { getDateRange, filterWorkoutsByDateRange } from '@/utils/analyticsHelpers';

export function useInsightsData() {
  const { workouts, loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();
  const { muscleStatuses, isLoading: isMuscleRecoveryLoading } = useMuscleRecovery();
  const [isLoading, setIsLoading] = useState(true);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [progressAnalysis, setProgressAnalysis] = useState<ProgressAnalysis | null>(null);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlerts | null>(null);
  const [workoutRecommendations, setWorkoutRecommendations] = useState<WorkoutRecommendations | null>(null);
  const isLoadingRef = useRef(false);
  const lastFingerprintRef = useRef<string | null>(null);
  const swListenerCleanupRef = useRef<(() => void) | null>(null);
  

  // Load cached data immediately on mount
  useEffect(() => {
    async function loadCachedData() {
      if (!profile) {
        setIsLoading(false);
        return;
      }

      // Wait for muscle recovery to finish so we calculate the correct fingerprint
      if (isMuscleRecoveryLoading) {
        return;
      }

      try {
        await loadWorkouts(profile.id);

        const { start: monthStart } = getDateRange('30d');
        const previousMonthStart = new Date(monthStart);
        previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

        const currentMonthWorkouts = filterWorkoutsByDateRange(workouts, '30d');
        const metrics = await analyticsService.getAllMetrics(currentMonthWorkouts, '30d');
        const personalRecords = analyticsService.getPersonalRecords(currentMonthWorkouts);

        // Get fingerprint for cache lookup
        const fingerprint = aiChangeDetector.getFingerprint(
          currentMonthWorkouts,
          muscleStatuses,
          metrics.consistencyScore,
          personalRecords
        );

        // Try to load cached data
        const [cachedProgress, cachedAlerts, cachedRecommendations] = await Promise.all([
          aiCallManager.getCached<ProgressAnalysis>(fingerprint, 'progress'),
          aiCallManager.getCached<SmartAlerts>(fingerprint, 'insights'),
          aiCallManager.getCached<WorkoutRecommendations>(fingerprint, 'recommendations'),
        ]);

        // If we have any cached data, show it immediately
        if (cachedProgress || cachedAlerts || cachedRecommendations) {
          let dataWasSet = false;
          
          if (cachedProgress) {
            setProgressAnalysis(cachedProgress);
            dataWasSet = true;
          }
          if (cachedAlerts) {
            setSmartAlerts(cachedAlerts);
            dataWasSet = true;
          }
          if (cachedRecommendations) {
            // Skip old format cached data (check if first prediction has 'muscle' property which indicates old format)
            const firstPred = cachedRecommendations.recoveryPredictions?.[0];
            if (firstPred && 'muscle' in firstPred && !('dayLabel' in firstPred)) {
              console.warn('[useInsightsData] Old format detected in cached recommendations, skipping');
              // Don't set cached data, let it regenerate
            } else {
              setWorkoutRecommendations(cachedRecommendations);
              dataWasSet = true;
            }
          }
          
          // Only mark as loaded if we actually set some data
          if (dataWasSet) {
            setIsLoading(false);
            lastFingerprintRef.current = fingerprint;
          } else {
            // All cached data was invalid/old format, keep loading state
            setIsLoading(true);
          }
        } else {
          // No cached data, keep loading state
          setIsLoading(true);
        }
      } catch (error) {
        console.error('Failed to load cached data:', error);
        setIsLoading(false);
      }
    }

    loadCachedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isMuscleRecoveryLoading]);

  // Listen for service worker messages
  useEffect(() => {
    // Cleanup previous listener
    if (swListenerCleanupRef.current) {
      swListenerCleanupRef.current();
    }

    // Register handler for AI insights ready
    const unsubscribeReady = swCommunication.onAIInsightsReady(async (data) => {
      const { fingerprint, results } = data;

      // Only update if fingerprint matches current
      if (fingerprint === lastFingerprintRef.current) {
        if (results.progress && typeof results.progress === 'object' && results.progress !== null) {
          const progress = results.progress as ProgressAnalysis;
          setProgressAnalysis(progress);
          await aiCallManager.setCached(fingerprint, 'progress', progress);
        }
        if (results.insights && typeof results.insights === 'object' && results.insights !== null) {
          const insights = results.insights as SmartAlerts;
          setSmartAlerts(insights);
          await aiCallManager.setCached(fingerprint, 'insights', insights);
        }
        if (results.recommendations && typeof results.recommendations === 'object' && results.recommendations !== null) {
          const recommendations = results.recommendations as WorkoutRecommendations;
          // Fix old format if detected (has 'muscle' property instead of 'dayLabel')
          const firstPred = recommendations.recoveryPredictions?.[0];
          if (firstPred && 'muscle' in firstPred && !('dayLabel' in firstPred)) {
            // Old format detected - skip it and let the main service regenerate
            console.warn('[useInsightsData] Old format detected in SW recommendations, skipping');
            // Don't set the old format data, but continue with state updates
          } else {
            setWorkoutRecommendations(recommendations);
            await aiCallManager.setCached(fingerprint, 'recommendations', recommendations);
          }
        }

        setLastUpdated(new Date());
        setIsBackgroundFetching(false);
        setIsLoading(false);
      }
    });

    // Register handler for errors
    const unsubscribeError = swCommunication.onAIInsightsError((data) => {
      console.error('[useInsightsData] Background fetch error:', data);
      setIsBackgroundFetching(false);
      setIsLoading(false);
    });

    // Store cleanup function
    swListenerCleanupRef.current = () => {
      unsubscribeReady();
      unsubscribeError();
    };

    // Cleanup on unmount
    return () => {
      if (swListenerCleanupRef.current) {
        swListenerCleanupRef.current();
        swListenerCleanupRef.current = null;
      }
    };
  }, []);

  // Direct fetch fallback (when SW not available)
  const loadInsightsDirectly = useCallback(async (
    currentMonthWorkouts: Workout[],
    _previousMonthWorkouts: Workout[],
    muscleStatuses: MuscleStatus[],
    personalRecords: PersonalRecord[],
    strengthProgression: StrengthProgression[],
    volumeTrend: Array<{ date: string; totalVolume: number }>,
    metrics: { consistencyScore: number; workoutCount: number; symmetryScore: number; focusDistribution: { legs: number; push: number; pull: number } },
    previousMetrics: { consistencyScore: number; workoutCount: number },
    readinessScore: number,
    fingerprint: string
  ) => {
    try {
      // Helper function to add timeout to individual promises
      const withTimeout = <T,>(promise: Promise<T | null>, timeoutMs: number, fallback: T | null): Promise<T | null> => {
        return Promise.race([
          promise.catch((error) => {
            console.error('AI insight request failed:', error);
            return fallback;
          }),
          new Promise<T | null>((resolve) => {
            setTimeout(() => {
              console.warn(`AI insight request timeout after ${timeoutMs}ms, using fallback`);
              resolve(fallback);
            }, timeoutMs);
          }),
        ]);
      };

      // Generate insights using refresh service (handles 24hr rule and new workout detection)
      const progressPromise = aiRefreshService.refreshIfNeeded(
        'progress',
        fingerprint,
        () => aiService.generateProgressAnalysis(
          currentMonthWorkouts,
          personalRecords,
          strengthProgression,
          volumeTrend,
          metrics.consistencyScore,
          previousMetrics.consistencyScore,
          metrics.workoutCount,
          previousMetrics.workoutCount
        ),
        profile?.id,
        1
      ).catch((error) => {
        console.error('Failed to load progress analysis:', error);
        return null;
      });

      const alertsPromise = aiRefreshService.refreshIfNeeded(
        'insights',
        fingerprint,
        () => aiService.generateSmartAlerts(currentMonthWorkouts, muscleStatuses, readinessScore),
        profile?.id,
        1
      ).catch((error) => {
        console.error('Failed to load smart alerts:', error);
        return null;
      });

      const recommendationsPromise = aiRefreshService.refreshIfNeeded(
        'recommendations',
        fingerprint,
        () => aiService.generateWorkoutRecommendations(
          currentMonthWorkouts,
          muscleStatuses,
          readinessScore,
          metrics.symmetryScore,
          metrics.focusDistribution,
          profile?.experienceLevel || 'intermediate',
          settings.baseRestInterval || 48
        ),
        profile?.id,
        1
      ).catch((error) => {
        console.error('Failed to load workout recommendations:', error);
        return null;
      });

      // Wait for all with individual 120-second timeouts
      const [progress, alerts, recommendations] = await Promise.all([
        withTimeout(progressPromise, 120000, null),
        withTimeout(alertsPromise, 120000, null),
        withTimeout(recommendationsPromise, 120000, null),
      ]);

      setProgressAnalysis(progress);
      setSmartAlerts(alerts);
      setWorkoutRecommendations(recommendations);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load insights directly:', error);
      setProgressAnalysis(null);
      setSmartAlerts(null);
      setWorkoutRecommendations(null);
    } finally {
      setIsLoading(false);
      setIsBackgroundFetching(false);
      isLoadingRef.current = false;
    }
  }, [
    profile?.id, 
    profile?.experienceLevel, 
    settings.baseRestInterval
  ]);

  const loadInsights = useCallback(async () => {
    if (!profile || isLoadingRef.current) {
      if (!profile) setIsLoading(false);
      return;
    }

    // Wait for dependencies to be ready before proceeding
    if (isMuscleRecoveryLoading) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setIsBackgroundFetching(true);
    
    try {
      await loadWorkouts(profile.id);

      // Get fresh workouts from store after loadWorkouts completes (store updates synchronously)
      const loadedWorkouts = useWorkoutStore.getState().workouts;

      const { start: monthStart } = getDateRange('30d');
      const previousMonthStart = new Date(monthStart);
      previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

      const currentMonthWorkouts = filterWorkoutsByDateRange(loadedWorkouts, '30d');
      const previousMonthWorkouts = loadedWorkouts.filter(
        (w) => {
          const workoutDate = new Date(w.date);
          return workoutDate >= previousMonthStart && workoutDate < monthStart;
        }
      );

      const metrics = await analyticsService.getAllMetrics(currentMonthWorkouts, '30d');
      const previousMetrics = await analyticsService.getAllMetrics(previousMonthWorkouts, '30d');

      const volumeTrend = analyticsService.calculateVolumeTrend(currentMonthWorkouts, '30d');
      const personalRecords = analyticsService.getPersonalRecords(currentMonthWorkouts);
      const strengthProgression = analyticsService.calculateStrengthProgression(currentMonthWorkouts);

      // Calculate readiness score inline to avoid dependency issues
      const readinessScore = muscleStatuses.length === 0 
        ? 85 
        : Math.round(muscleStatuses.reduce((sum, m) => sum + m.recoveryPercentage, 0) / muscleStatuses.length);

      // Get fingerprint for caching (same for all insight types)
      const fingerprint = aiChangeDetector.getFingerprint(
        currentMonthWorkouts,
        muscleStatuses,
        metrics.consistencyScore,
        personalRecords
      );

      // Skip if fingerprint hasn't changed (prevents unnecessary re-fetches)
      if (lastFingerprintRef.current === fingerprint && progressAnalysis && smartAlerts && workoutRecommendations) {
        setIsLoading(false);
        setIsBackgroundFetching(false);
        isLoadingRef.current = false;
        return;
      }

      lastFingerprintRef.current = fingerprint;

      // Check if service worker is available for background fetch
      const swAvailable = swCommunication.isServiceWorkerAvailable();
      
      if (swAvailable) {
        // Trigger background fetch via service worker
        await backgroundAIFetcher.triggerBackgroundFetch(
          {
            currentMonthWorkouts,
            previousMonthWorkouts,
            muscleStatuses,
            personalRecords,
            strengthProgression,
            volumeTrend,
            metrics,
            previousMetrics,
            readinessScore,
            userLevel: profile?.experienceLevel || 'intermediate',
            baseRestInterval: settings.baseRestInterval || 48,
          },
          profile.id,
          ['progress', 'insights', 'recommendations']
        );
        
        // Don't set loading to false here - wait for SW message
        // But if we have cached data, we already showed it, so loading can be false
        if (progressAnalysis || smartAlerts || workoutRecommendations) {
          setIsLoading(false);
        }
      } else {
        // Fallback to direct fetch if SW not available
        console.warn('[useInsightsData] Service worker not available, using direct fetch');
        await loadInsightsDirectly(
          currentMonthWorkouts,
          previousMonthWorkouts,
          muscleStatuses,
          personalRecords,
          strengthProgression,
          volumeTrend,
          metrics,
          previousMetrics,
          readinessScore,
          fingerprint
        );
      }

    } catch (error) {
      console.error('Failed to load insights:', error);
      setIsLoading(false);
      setIsBackgroundFetching(false);
      isLoadingRef.current = false;
    }
  }, [
    profile,
    settings.baseRestInterval,
    muscleStatuses,
    loadWorkouts,
    isMuscleRecoveryLoading,
    loadInsightsDirectly,
    progressAnalysis,
    smartAlerts,
    workoutRecommendations
  ]);

  useEffect(() => {
    // Only load insights when dependencies are ready
    // Wait for muscle recovery to finish AND ensure we have at least attempted to load workouts
    if (!isMuscleRecoveryLoading && profile && (workouts.length > 0 || muscleStatuses.length > 0)) {
      // Only proceed if we have some data loaded (workouts or muscle statuses indicate initialization)
      loadInsights();
    }
  }, [loadInsights, isMuscleRecoveryLoading, profile, workouts.length, muscleStatuses.length]);

  const refreshInsights = useCallback(() => {
    loadInsights();
  }, [loadInsights]);

  const getTimeSinceUpdate = useCallback((): string => {
    const minutes = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1m ago';
    return `${minutes}m ago`;
  }, [lastUpdated]);

  return {
    progressAnalysis,
    smartAlerts,
    workoutRecommendations,
    isLoading,
    isBackgroundFetching,
    lastUpdated,
    getTimeSinceUpdate,
    refreshInsights,
  };
}

