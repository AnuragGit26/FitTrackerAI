import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { analyticsService } from '@/services/analyticsService';
import { calculateStreak } from '@/utils/calculations';
import { DateRange } from '@/utils/analyticsHelpers';
import { aiCallManager } from '@/services/aiCallManager';
import { aiService } from '@/services/aiService';
import { ProgressHeader } from '@/components/analytics/ProgressHeader';
import { TotalVolumeCard } from '@/components/analytics/TotalVolumeCard';
import { WorkoutStatsCards } from '@/components/analytics/WorkoutStatsCards';
import { AIInsightCard } from '@/components/analytics/AIInsightCard';
import { VolumeTrendChart } from '@/components/analytics/VolumeTrendChart';
import { ConsistencyHeatmap } from '@/components/analytics/ConsistencyHeatmap';
import { MuscleFocusCard } from '@/components/analytics/MuscleFocusCard';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { RecentRecordsList } from '@/components/analytics/RecentRecordsList';
import { MuscleAnalyticsHeader } from '@/components/analytics/MuscleAnalyticsHeader';
import { SymmetryScoreCard } from '@/components/analytics/SymmetryScoreCard';
import { MuscleActivationMap } from '@/components/analytics/MuscleActivationMap';
import { AICoachInsightCard } from '@/components/analytics/AICoachInsightCard';
import { FocusDistributionChart } from '@/components/analytics/FocusDistributionChart';
import { VolumeByMuscleChart } from '@/components/analytics/VolumeByMuscleChart';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
<<<<<<< HEAD
import { prefersReducedMotion } from '@/utils/animations';
=======
import { fadeIn, prefersReducedMotion } from '@/utils/animations';
>>>>>>> ee369b24fdc7224128bbae3cb927419803f1da73

type View = 'progress' | 'muscle';
type DateRangeOption = '30d' | '90d' | '180d' | '1y';
type TimePeriod = 'Week' | 'Month' | 'Year';

export function Analytics() {
  const [view, setView] = useState<View>('progress');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30d');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Month');
  const [progressInsight, setProgressInsight] = useState<string>('');
  const [muscleInsight, setMuscleInsight] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const previousMetricsRef = useRef<{
    totalVolume: number;
    workoutCount: number;
    trendPercentage: number;
    topMuscle: string;
    focusDistribution?: { legs: number; push: number; pull: number };
    symmetryScore?: number;
    topMuscles?: string;
  } | null>(null);

  const { workouts, loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();

  useEffect(() => {
    if (profile) {
      loadWorkouts(profile.id);
    }
  }, [profile, loadWorkouts]);

  const metrics = useMemo(() => {
    return analyticsService.getAllMetrics(workouts, dateRange as DateRange);
  }, [workouts, dateRange]);

  const currentStreak = useMemo(() => {
    const workoutDates = workouts.map((w) => new Date(w.date));
    return calculateStreak(workoutDates);
  }, [workouts]);

  const previousMonthVolume = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      return workoutDate >= lastMonthStart && workoutDate <= lastMonthEnd;
    });
    return analyticsService.calculateTotalVolume(lastMonthWorkouts);
  }, [workouts]);

  const trendPercentage = useMemo(() => {
    if (previousMonthVolume === 0) return 0;
    return Math.round(((metrics.totalVolume - previousMonthVolume) / previousMonthVolume) * 100);
  }, [metrics.totalVolume, previousMonthVolume]);

  const topMuscle = useMemo(() => {
    const topMuscleNames = analyticsService.getMostActiveMuscleNames(workouts, 1);
    return topMuscleNames[0] || 'chest';
  }, [workouts]);

  useEffect(() => {
    if (view === 'progress' && metrics.totalVolume > 0) {
      const currentMetrics = {
        totalVolume: metrics.totalVolume,
        workoutCount: metrics.workoutCount,
        trendPercentage,
        topMuscle,
      };

      // Check if metrics changed significantly
      const hasSignificantChange = !previousMetricsRef.current ||
        Math.abs(currentMetrics.totalVolume - previousMetricsRef.current.totalVolume) / previousMetricsRef.current.totalVolume > 0.1 ||
        currentMetrics.workoutCount !== previousMetricsRef.current.workoutCount ||
        Math.abs(currentMetrics.trendPercentage - previousMetricsRef.current.trendPercentage) > 5 ||
        currentMetrics.topMuscle !== previousMetricsRef.current.topMuscle;

      if (!hasSignificantChange && previousMetricsRef.current) {
        // Try cache first
        const cacheKey = `progress:${currentMetrics.totalVolume}:${currentMetrics.workoutCount}:${currentMetrics.trendPercentage}:${currentMetrics.topMuscle}`;
        aiCallManager.getCached<string>(cacheKey, 'insights').then(cached => {
          if (cached) {
            setProgressInsight(cached);
            return;
          }
        });
        return;
      }

      setIsLoadingInsights(true);
      const cacheKey = `progress:${currentMetrics.totalVolume}:${currentMetrics.workoutCount}:${currentMetrics.trendPercentage}:${currentMetrics.topMuscle}`;

      aiCallManager.executeWithCache(
        cacheKey,
        'insights',
        () => aiService.generateProgressInsight(
          metrics.totalVolume,
          metrics.workoutCount,
          trendPercentage,
          topMuscle
        ),
        0
      )
        .then(setProgressInsight)
        .finally(() => {
          setIsLoadingInsights(false);
          previousMetricsRef.current = currentMetrics;
        });
    }
  }, [view, metrics.totalVolume, metrics.workoutCount, trendPercentage, topMuscle]);

  useEffect(() => {
    if (view === 'muscle' && metrics.focusDistribution) {
      const topMuscleNames = analyticsService.getMostActiveMuscleNames(workouts, 2);
      const currentMetrics = {
        focusDistribution: metrics.focusDistribution,
        symmetryScore: metrics.symmetryScore,
        topMuscles: topMuscleNames.join(','),
      };

      // Check if metrics changed significantly
      const hasSignificantChange = !previousMetricsRef.current ||
        !previousMetricsRef.current.focusDistribution ||
        Math.abs(currentMetrics.focusDistribution.legs - previousMetricsRef.current.focusDistribution.legs) > 5 ||
        Math.abs(currentMetrics.focusDistribution.push - previousMetricsRef.current.focusDistribution.push) > 5 ||
        Math.abs(currentMetrics.focusDistribution.pull - previousMetricsRef.current.focusDistribution.pull) > 5 ||
        Math.abs((currentMetrics.symmetryScore || 0) - (previousMetricsRef.current.symmetryScore || 0)) > 5 ||
        currentMetrics.topMuscles !== previousMetricsRef.current.topMuscles;

      if (!hasSignificantChange && previousMetricsRef.current) {
        // Try cache first
        const cacheKey = `muscle:${currentMetrics.focusDistribution.legs}:${currentMetrics.focusDistribution.push}:${currentMetrics.focusDistribution.pull}:${currentMetrics.symmetryScore}:${currentMetrics.topMuscles}`;
        aiCallManager.getCached<string>(cacheKey, 'insights').then(cached => {
          if (cached) {
            setMuscleInsight(cached);
            return;
          }
        });
        return;
      }

      setIsLoadingInsights(true);
      const cacheKey = `muscle:${currentMetrics.focusDistribution.legs}:${currentMetrics.focusDistribution.push}:${currentMetrics.focusDistribution.pull}:${currentMetrics.symmetryScore}:${currentMetrics.topMuscles}`;

      aiCallManager.executeWithCache(
        cacheKey,
        'insights',
        () => aiService.generateMuscleBalanceInsight(
          metrics.focusDistribution,
          metrics.symmetryScore,
          topMuscleNames
        ),
        0
      )
        .then(setMuscleInsight)
        .finally(() => {
          setIsLoadingInsights(false);
          if (previousMetricsRef.current) {
            previousMetricsRef.current.focusDistribution = currentMetrics.focusDistribution;
            previousMetricsRef.current.symmetryScore = currentMetrics.symmetryScore;
            previousMetricsRef.current.topMuscles = currentMetrics.topMuscles;
          } else {
            previousMetricsRef.current = {
              totalVolume: 0,
              workoutCount: 0,
              trendPercentage: 0,
              topMuscle: '',
              focusDistribution: currentMetrics.focusDistribution,
              symmetryScore: currentMetrics.symmetryScore,
              topMuscles: currentMetrics.topMuscles,
            };
          }
        });
    }
  }, [view, metrics.focusDistribution, metrics.symmetryScore, workouts]);

  const unit = profile?.preferredUnit || 'kg';

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* View Toggle */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/60">
        <div className="flex items-center justify-center gap-2 p-2 relative">
          <motion.div
            className="absolute left-2 right-2 h-[calc(100%-16px)] bg-primary rounded-lg"
            layoutId="viewToggle"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: 'calc(50% - 4px)',
              left: view === 'progress' ? '8px' : 'calc(50% + 4px)',
            }}
          />
          <button
            onClick={() => setView('progress')}
            className={`relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'progress'
                ? 'text-[#102217]'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Progress
          </button>
          <button
            onClick={() => setView('muscle')}
            className={`relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'muscle'
                ? 'text-[#102217]'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Muscle Groups
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'progress' ? (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ProgressHeader selectedRange={dateRange} onRangeChange={setDateRange} />
            <div className="p-4 space-y-5 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-3">
              <TotalVolumeCard
                totalVolume={metrics.totalVolume}
                trendPercentage={trendPercentage}
                unit={unit}
              />
              <WorkoutStatsCards workoutCount={metrics.workoutCount} currentStreak={currentStreak} />
            </div>

            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              progressInsight && <AIInsightCard insight={progressInsight} />
            )}

            <VolumeTrendChart data={metrics.volumeTrend} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ConsistencyHeatmap workouts={workouts} />
              <MuscleFocusCard workouts={workouts} />
            </div>

            <StrengthProgressionChart progressions={metrics.strengthProgression} />

            <RecentRecordsList records={metrics.personalRecords} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="muscle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MuscleAnalyticsHeader selectedPeriod={timePeriod} onPeriodChange={setTimePeriod} />
            <div className="px-4 py-4 space-y-4">
            <SymmetryScoreCard score={metrics.symmetryScore} />

            <MuscleActivationMap workouts={workouts} />

            {isLoadingInsights ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              muscleInsight && <AICoachInsightCard insight={muscleInsight} />
            )}

            <FocusDistributionChart
              legs={metrics.focusDistribution.legs}
              push={metrics.focusDistribution.push}
              pull={metrics.focusDistribution.pull}
            />

            <div className="flex items-end justify-between px-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Volume by Muscle</h3>
              <span className="text-xs font-medium text-primary cursor-pointer hover:underline">
                View All
              </span>
            </div>
            <VolumeByMuscleChart workouts={workouts} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
