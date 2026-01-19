import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { analyticsService } from '@/services/analyticsService';
import { calculateStreak } from '@/utils/calculations';
import { DateRange, hasEnoughWorkoutsForAverages, filterWorkoutsByDateRange } from '@/utils/analyticsHelpers';
import { aiCallManager } from '@/services/aiCallManager';
import { aiService } from '@/services/aiService';
import { UnifiedDateSelector } from '@/components/analytics/UnifiedDateSelector';
import { TotalVolumeCard } from '@/components/analytics/TotalVolumeCard';
import { WorkoutStatsCards } from '@/components/analytics/WorkoutStatsCards';
import { AIInsightCard } from '@/components/analytics/AIInsightCard';
import { VolumeTrendChart } from '@/components/analytics/VolumeTrendChart';
import { CaloriesChart } from '@/components/analytics/CaloriesChart';
import { SleepTrendChart } from '@/components/analytics/SleepTrendChart';
import { RecoveryMetricsCard } from '@/components/analytics/RecoveryMetricsCard';
import { ConsistencyHeatmap } from '@/components/analytics/ConsistencyHeatmap';
import { MuscleFocusCard } from '@/components/analytics/MuscleFocusCard';
import { StrengthProgressionChart } from '@/components/analytics/StrengthProgressionChart';
import { RecentRecordsList } from '@/components/analytics/RecentRecordsList';
import { SymmetryScoreCard } from '@/components/analytics/SymmetryScoreCard';
import { MuscleActivationMap } from '@/components/analytics/MuscleActivationMap';
import { AICoachInsightCard } from '@/components/analytics/AICoachInsightCard';
import { FocusDistributionChart } from '@/components/analytics/FocusDistributionChart';
import { VolumeByMuscleChart } from '@/components/analytics/VolumeByMuscleChart';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyStateAIMessage } from '@/components/common/EmptyStateAIMessage';
import { CustomDateRangePicker } from '@/components/analytics/CustomDateRangePicker';
import { AnalyticsMetrics } from '@/types/analytics';

type View = 'progress' | 'muscle';
type TimePeriod = 'Week' | 'Month' | 'Year';

export function Analytics() {
  const [view, setView] = useState<View>('progress');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Month');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [progressInsight, setProgressInsight] = useState<string>('');
  const [muscleInsight, setMuscleInsight] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null); // Use state for async metrics loading
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
    if (profile?.id) {
      loadWorkouts(profile.id);
    }
  }, [profile?.id, loadWorkouts]);

  const filteredWorkouts = useMemo(() => {
    // If custom date range is set, use it; otherwise use the standard date range
    if (customDateRange) {
      return (workouts ?? []).filter((w) => {
        const workoutDate = new Date(w.date);
        return workoutDate >= customDateRange.start && workoutDate <= customDateRange.end;
      });
    }
    return filterWorkoutsByDateRange(workouts ?? [], dateRange);
  }, [workouts, dateRange, customDateRange]);

  // Load metrics asynchronously to include sleep/recovery data
  useEffect(() => {
    async function fetchMetrics() {
      if (!profile?.id) return;
      const data = await analyticsService.getAllMetrics(filteredWorkouts, dateRange, profile.id);
      setMetrics(data);
    }
    fetchMetrics();
  }, [filteredWorkouts, dateRange, profile?.id]);

  const hasEnoughWorkouts = useMemo(() => {
    return hasEnoughWorkoutsForAverages(workouts ?? []);
  }, [workouts]);

  const currentStreak = useMemo(() => {
    const workoutDates = (workouts ?? []).map((w) => new Date(w.date));
    return calculateStreak(workoutDates);
  }, [workouts]);

  const previousMonthVolume = useMemo(() => {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthWorkouts = (workouts ?? []).filter((w) => {
      const workoutDate = new Date(w.date);
      return workoutDate >= lastMonthStart && workoutDate <= lastMonthEnd;
    });
    return analyticsService.calculateTotalVolume(lastMonthWorkouts);
  }, [workouts]);

  const trendPercentage = useMemo(() => {
    if (!metrics || previousMonthVolume === 0) return 0;
    return Math.round(((metrics.totalVolume - previousMonthVolume) / previousMonthVolume) * 100);
  }, [metrics, previousMonthVolume]);

  const topMuscle = useMemo(() => {
    const topMuscleNames = analyticsService.getMostActiveMuscleNames(workouts ?? [], 1);
    return topMuscleNames[0] || 'chest';
  }, [workouts]);

  useEffect(() => {
    if (view === 'progress' && metrics && metrics.totalVolume > 0) {
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
          topMuscle,
          profile?.preferredUnit || 'kg'
        ),
        0
      )
        .then(setProgressInsight)
        .finally(() => {
          setIsLoadingInsights(false);
          previousMetricsRef.current = currentMetrics;
        });
    }
  }, [view, metrics, trendPercentage, topMuscle, profile]);

  useEffect(() => {
    if (view === 'muscle' && metrics && metrics.focusDistribution) {
      const topMuscleNames = analyticsService.getMostActiveMuscleNames(workouts ?? [], 2);
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
  }, [view, metrics, workouts]);

  const unit = profile?.preferredUnit || 'kg';

  if (!profile || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* View Toggle */}
      <div className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-border-dark/60">
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
            className={`relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'progress'
                ? 'text-[#050505]'
                : 'text-slate-500 dark:text-gray-300'
              }`}
          >
            Progress
          </button>
          <button
            onClick={() => setView('muscle')}
            className={`relative z-10 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'muscle'
                ? 'text-[#050505]'
                : 'text-slate-500 dark:text-gray-300'
              }`}
          >
            Muscle Groups
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'progress' ? (
          <>
            <UnifiedDateSelector
              mode="progress"
              selectedRange={dateRange}
              onRangeChange={(range) => {
                setDateRange(range);
                setCustomDateRange(null); // Clear custom range when selecting preset
              }}
              onCustomRange={() => setShowCustomDatePicker(true)}
            />
            <motion.div
              key="progress"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-4 space-y-5 max-w-2xl mx-auto">
              {workouts.length === 0 ? (
                <div className="mb-4">
                  <EmptyStateAIMessage screenName="Analytics" />
                </div>
              ) : !hasEnoughWorkouts && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Building your data:</strong> You have {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged. 
                    Averages and trends will be calculated after 7+ workouts for more accurate insights.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <TotalVolumeCard
                  totalVolume={metrics.totalVolume}
                  trendPercentage={hasEnoughWorkouts ? trendPercentage : 0}
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

              {/* Sleep & Recovery Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {metrics.sleepMetrics && metrics.sleepMetrics.sleepTrend.length > 0 && (
                  <SleepTrendChart data={metrics.sleepMetrics.sleepTrend} />
                )}
                {metrics.recoveryMetrics && metrics.recoveryMetrics.recoveryTrend.length > 0 && (
                  <RecoveryMetricsCard metrics={metrics.recoveryMetrics} />
                )}
              </div>

              {metrics.caloriesTrend && metrics.caloriesTrend.length > 0 && (
                <CaloriesChart data={metrics.caloriesTrend} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ConsistencyHeatmap workouts={filteredWorkouts} />
                <MuscleFocusCard workouts={filteredWorkouts} />
              </div>

              <StrengthProgressionChart progressions={metrics.strengthProgression} />

              <RecentRecordsList records={metrics.personalRecords} />
              </div>
            </motion.div>
          </>
        ) : (
          <motion.div
            key="muscle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <UnifiedDateSelector
              mode="muscle"
              selectedPeriod={timePeriod}
              selectedRange={dateRange}
              onPeriodChange={(period) => {
                setTimePeriod(period);
                // Convert TimePeriod to DateRange
                const rangeMap: Record<TimePeriod, DateRange> = {
                  'Week': '7d',
                  'Month': '30d',
                  'Year': '1y',
                };
                setDateRange(rangeMap[period]);
                setCustomDateRange(null);
              }}
              onRangeChange={(range) => {
                setDateRange(range);
                setCustomDateRange(null);
              }}
              onCustomRange={() => setShowCustomDatePicker(true)}
            />
            <div className="px-4 py-4 space-y-4">
              {!hasEnoughWorkouts && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Building your data:</strong> You have {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged. 
                    Muscle balance and symmetry scores will be calculated after 7+ workouts for more accurate insights.
                  </p>
                </div>
              )}
              <SymmetryScoreCard score={metrics.symmetryScore} />

              <MuscleActivationMap workouts={filteredWorkouts} />

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
              <VolumeByMuscleChart workouts={filteredWorkouts} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Date Range Picker Modal */}
      <CustomDateRangePicker
        isOpen={showCustomDatePicker}
        onClose={() => setShowCustomDatePicker(false)}
        onSelectRange={(start, end) => {
          setCustomDateRange({ start, end });
          setShowCustomDatePicker(false);
        }}
        currentRange={dateRange}
      />
    </div>
  );
}
