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
import { aiRateLimiter } from '@/services/aiRateLimiter';
import {
  ProgressAnalysis,
  SmartAlerts,
  WorkoutRecommendations,
} from '@/types/insights';
import { getDateRange, filterWorkoutsByDateRange } from '@/utils/analyticsHelpers';

type InsightType = 'progress' | 'insights' | 'recommendations';

interface LazyLoadState {
  progress: {
    data: ProgressAnalysis | null;
    isLoading: boolean;
    isLoaded: boolean;
    error: string | null;
  };
  insights: {
    data: SmartAlerts | null;
    isLoading: boolean;
    isLoaded: boolean;
    error: string | null;
  };
  recommendations: {
    data: WorkoutRecommendations | null;
    isLoading: boolean;
    isLoaded: boolean;
    error: string | null;
  };
}

/**
 * Lazy-loading version of useInsightsData
 * Only loads data for the active tab to save API calls
 */
export function useInsightsDataLazy() {
  const { workouts, loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();
  const { muscleStatuses, isLoading: isMuscleRecoveryLoading } = useMuscleRecovery();

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [state, setState] = useState<LazyLoadState>({
    progress: { data: null, isLoading: false, isLoaded: false, error: null },
    insights: { data: null, isLoading: false, isLoaded: false, error: null },
    recommendations: { data: null, isLoading: false, isLoaded: false, error: null },
  });

  const lastFingerprintRef = useRef<string | null>(null);
  const loadingTypeRef = useRef<Set<InsightType>>(new Set());

  // Load cached data for all types on mount
  useEffect(() => {
    async function loadCachedData() {
      if (!profile || isMuscleRecoveryLoading) return;

      try {
        await loadWorkouts(profile.id);

        const currentMonthWorkouts = filterWorkoutsByDateRange(workouts, '30d');
        const metrics = await analyticsService.getAllMetrics(currentMonthWorkouts, '30d');
        const personalRecords = analyticsService.getPersonalRecords(currentMonthWorkouts);

        const fingerprint = aiChangeDetector.getFingerprint(
          currentMonthWorkouts,
          muscleStatuses,
          metrics.consistencyScore,
          personalRecords
        );

        lastFingerprintRef.current = fingerprint;

        // Load all cached data in parallel (fast, no API calls)
        const [cachedProgress, cachedAlerts, cachedRecommendations] = await Promise.all([
          aiCallManager.getCached<ProgressAnalysis>(fingerprint, 'progress'),
          aiCallManager.getCached<SmartAlerts>(fingerprint, 'insights'),
          aiCallManager.getCached<WorkoutRecommendations>(fingerprint, 'recommendations'),
        ]);

        // Update state with cached data
        setState((prev) => ({
          progress: {
            ...prev.progress,
            data: cachedProgress,
            isLoaded: !!cachedProgress,
          },
          insights: {
            ...prev.insights,
            data: cachedAlerts,
            isLoaded: !!cachedAlerts,
          },
          recommendations: {
            ...prev.recommendations,
            data: cachedRecommendations,
            isLoaded: !!cachedRecommendations,
          },
        }));
      } catch (error) {
        console.error('[useInsightsDataLazy] Failed to load cached data:', error);
      }
    }

    loadCachedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isMuscleRecoveryLoading]);

  /**
   * Load insights for a specific type
   * Only makes API call if data is not cached and not already loading
   */
  const loadInsightType = useCallback(
    async (type: InsightType) => {
      if (!profile || isMuscleRecoveryLoading || loadingTypeRef.current.has(type)) {
        return;
      }

      // Check if already loaded and fingerprint hasn't changed
      const stateKey = type === 'insights' ? 'insights' : type;
      if (state[stateKey].isLoaded && state[stateKey].data && lastFingerprintRef.current) {
        return;
      }

      // Check rate limits before making API call
      const rateLimitCheck = aiRateLimiter.canMakeCall(profile.id, type);
      if (!rateLimitCheck.allowed) {
        const retryTime = rateLimitCheck.retryAfter
          ? aiRateLimiter.formatRetryTime(rateLimitCheck.retryAfter)
          : 'later';

        setState((prev) => ({
          ...prev,
          [stateKey]: {
            ...prev[stateKey],
            error: `${rateLimitCheck.reason}. Try again in ${retryTime}.`,
            isLoading: false,
          },
        }));
        return;
      }

      loadingTypeRef.current.add(type);
      setState((prev) => ({
        ...prev,
        [stateKey]: { ...prev[stateKey], isLoading: true, error: null },
      }));

      try {
        await loadWorkouts(profile.id);
        const loadedWorkouts = useWorkoutStore.getState().workouts;

        const { start: monthStart } = getDateRange('30d');
        const previousMonthStart = new Date(monthStart);
        previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);

        const currentMonthWorkouts = filterWorkoutsByDateRange(loadedWorkouts, '30d');
        const previousMonthWorkouts = loadedWorkouts.filter((w) => {
          const workoutDate = new Date(w.date);
          return workoutDate >= previousMonthStart && workoutDate < monthStart;
        });

        const metrics = await analyticsService.getAllMetrics(currentMonthWorkouts, '30d');
        const previousMetrics = await analyticsService.getAllMetrics(previousMonthWorkouts, '30d');
        const volumeTrend = analyticsService.calculateVolumeTrend(currentMonthWorkouts, '30d');
        const personalRecords = analyticsService.getPersonalRecords(currentMonthWorkouts);
        const strengthProgression = analyticsService.calculateStrengthProgression(currentMonthWorkouts);
        const readinessScore = muscleStatuses.length === 0
          ? 85
          : Math.round(muscleStatuses.reduce((sum, m) => sum + m.recoveryPercentage, 0) / muscleStatuses.length);

        const fingerprint = aiChangeDetector.getFingerprint(
          currentMonthWorkouts,
          muscleStatuses,
          metrics.consistencyScore,
          personalRecords
        );

        lastFingerprintRef.current = fingerprint;

        let result: ProgressAnalysis | SmartAlerts | WorkoutRecommendations | null = null;

        // Load specific insight type
        switch (type) {
          case 'progress':
            result = await aiRefreshService.refreshIfNeeded(
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
              profile.id,
              1
            );
            break;

          case 'insights':
            result = await aiRefreshService.refreshIfNeeded(
              'insights',
              fingerprint,
              () => aiService.generateSmartAlerts(currentMonthWorkouts, muscleStatuses, readinessScore),
              profile.id,
              1
            );
            break;

          case 'recommendations':
            result = await aiRefreshService.refreshIfNeeded(
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
              profile.id,
              1
            );
            break;
        }

        // Record successful API call
        if (result) {
          aiRateLimiter.recordCall(profile.id, type);
        }

        setState((prev) => ({
          ...prev,
          [stateKey]: {
            data: result,
            isLoading: false,
            isLoaded: true,
            error: null,
          },
        }));

        setLastUpdated(new Date());
      } catch (error) {
        console.error(`[useInsightsDataLazy] Failed to load ${type}:`, error);
        setState((prev) => ({
          ...prev,
          [stateKey]: {
            ...prev[stateKey],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load insights',
          },
        }));
      } finally {
        loadingTypeRef.current.delete(type);
      }
    },
    [
      profile,
      settings.baseRestInterval,
      muscleStatuses,
      loadWorkouts,
      isMuscleRecoveryLoading,
      state,
    ]
  );

  const refreshInsightType = useCallback(
    async (type: InsightType) => {
      // Force reload by clearing loaded flag
      setState((prev) => ({
        ...prev,
        [type === 'insights' ? 'insights' : type]: {
          ...prev[type === 'insights' ? 'insights' : type],
          isLoaded: false,
        },
      }));
      await loadInsightType(type);
    },
    [loadInsightType]
  );

  const getTimeSinceUpdate = useCallback((): string => {
    const minutes = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1m ago';
    return `${minutes}m ago`;
  }, [lastUpdated]);

  const getUsageStats = useCallback(() => {
    if (!profile) return null;
    return aiRateLimiter.getUsageStats(profile.id);
  }, [profile]);

  return {
    progress: state.progress,
    alerts: state.insights,
    recommendations: state.recommendations,
    lastUpdated,
    getTimeSinceUpdate,
    loadInsightType,
    refreshInsightType,
    getUsageStats,
  };
}
