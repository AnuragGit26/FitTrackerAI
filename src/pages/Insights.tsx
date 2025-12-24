import { useState, useEffect } from 'react';
import { Bot, RefreshCw, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { InsightsTabNavigation } from '@/components/insights/InsightsTabNavigation';
import { useInsightsData } from '@/hooks/useInsightsData';
import { useUserStore } from '@/store/userStore';
import { Skeleton } from '@/components/common/Skeleton';
import { BreakthroughCard } from '@/components/insights/BreakthroughCard';
import { PerformanceTrendsCards } from '@/components/insights/PerformanceTrendsCards';
import { VolumeTrendChart } from '@/components/insights/VolumeTrendChart';
import { AttentionNeededSection } from '@/components/insights/AttentionNeededSection';
import { TrainingPatternsSection } from '@/components/insights/TrainingPatternsSection';
import { SystemStatusCard } from '@/components/insights/SystemStatusCard';
import { CriticalAlertsCard } from '@/components/insights/CriticalAlertsCard';
import { SuggestionsSection } from '@/components/insights/SuggestionsSection';
import { NutritionTimingTimeline } from '@/components/insights/NutritionTimingTimeline';
import { ReadinessScoreHeader } from '@/components/insights/ReadinessScoreHeader';
import { RecommendedWorkoutCard } from '@/components/insights/RecommendedWorkoutCard';
import { MuscleBalanceSection } from '@/components/insights/MuscleBalanceSection';
import { CorrectiveExercisesCarousel } from '@/components/insights/CorrectiveExercisesCarousel';
import { PredictedRecoveryChart } from '@/components/insights/PredictedRecoveryChart';
import { staggerContainerSlow, prefersReducedMotion } from '@/utils/animations';

type View = 'progress' | 'alerts' | 'recommendations';

export function Insights() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('progress');
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const { profile } = useUserStore();
  const {
    progressAnalysis,
    smartAlerts,
    workoutRecommendations,
    isLoading,
    getTimeSinceUpdate,
    refreshInsights,
  } = useInsightsData();

  // Check if profile is incomplete
  useEffect(() => {
    if (profile) {
      const isIncomplete = !profile.name || !profile.age || !profile.gender || !profile.experienceLevel;
      // Check if user has dismissed the prompt in this session
      const hasDismissed = sessionStorage.getItem('profilePromptDismissed') === 'true';
      setShowProfilePrompt(isIncomplete && !hasDismissed);
    }
  }, [profile]);

  const handleDismissProfilePrompt = () => {
    setShowProfilePrompt(false);
    sessionStorage.setItem('profilePromptDismissed', 'true');
  };

  const handleGoToProfile = () => {
    setShowProfilePrompt(false);
    sessionStorage.setItem('profilePromptDismissed', 'true');
    navigate('/profile');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
        <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-3 justify-between border-b border-gray-200 dark:border-[#316847]">
          <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] flex-1">AI Insights</h2>
        </div>
        <InsightsTabNavigation currentView={view} onViewChange={setView} />
        <div className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full">
          <Skeleton height={120} className="rounded-xl" />
          <Skeleton height={80} className="rounded-xl" />
          <Skeleton height={200} className="rounded-xl" />
          <Skeleton height={150} className="rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-3 justify-between border-b border-gray-200 dark:border-[#316847]">
        <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] flex-1">AI Insights</h2>
        <div className="flex items-center justify-end gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <Bot className="w-4 h-4 text-primary" />
          <p className="text-primary text-xs font-bold uppercase tracking-wider shrink-0">
            Updated {getTimeSinceUpdate()}
          </p>
          <button
            onClick={refreshInsights}
            className="ml-1 p-1 hover:bg-primary/20 rounded transition-colors"
            aria-label="Refresh insights"
          >
            <RefreshCw className="w-3 h-3 text-primary" />
          </button>
        </div>
      </div>

      <InsightsTabNavigation currentView={view} onViewChange={setView} />

      {/* Profile Completion Prompt */}
      {showProfilePrompt && (
        <div className="p-4 max-w-md mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 relative"
          >
            <button
              onClick={handleDismissProfilePrompt}
              className="absolute top-3 right-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3 items-start pr-6">
              <div className="shrink-0 bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full text-blue-600 dark:text-blue-400">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-blue-900 dark:text-blue-100 font-bold text-base mb-1">
                  Complete Your Profile
                </h3>
                <p className="text-blue-700 dark:text-blue-200 text-sm mb-3">
                  To get the most accurate AI insights and recommendations, please complete your profile with your age, gender, and experience level.
                </p>
                <button
                  onClick={handleGoToProfile}
                  className="text-blue-900 dark:text-blue-100 font-semibold text-sm hover:underline"
                >
                  Go to Profile →
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {view === 'progress' && progressAnalysis && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              variants={prefersReducedMotion() ? {} : staggerContainerSlow}
              className="flex flex-col gap-6"
            >
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <BreakthroughCard breakthrough={progressAnalysis.breakthrough} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <PerformanceTrendsCards
                    consistencyScore={progressAnalysis.consistencyScore}
                    consistencyChange={progressAnalysis.consistencyChange}
                    workoutCount={progressAnalysis.workoutCount}
                    workoutCountChange={progressAnalysis.workoutCountChange}
                  />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <VolumeTrendChart
                    currentVolume={progressAnalysis.volumeTrend.current}
                    previousVolume={progressAnalysis.volumeTrend.previous}
                    changePercent={progressAnalysis.volumeTrend.changePercent}
                    weeklyData={progressAnalysis.volumeTrend.weeklyData}
                  />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <AttentionNeededSection
                    plateaus={progressAnalysis.plateaus}
                    formChecks={progressAnalysis.formChecks}
                  />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <TrainingPatternsSection patterns={progressAnalysis.trainingPatterns} />
                </motion.div>
            </motion.div>
          )}

          {view === 'alerts' && smartAlerts && (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              variants={prefersReducedMotion() ? {} : staggerContainerSlow}
              className="flex flex-col gap-6"
            >
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <SystemStatusCard alerts={smartAlerts} />
                </motion.div>
                <div className="w-full h-px bg-gray-200 dark:bg-white/5 mx-4" />
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <CriticalAlertsCard alerts={smartAlerts.criticalAlerts} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <SuggestionsSection suggestions={smartAlerts.suggestions} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <NutritionTimingTimeline events={smartAlerts.nutritionEvents} />
                </motion.div>
            </motion.div>
          )}

          {view === 'recommendations' && workoutRecommendations && (
            <motion.div
              key="recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              variants={prefersReducedMotion() ? {} : staggerContainerSlow}
              className="flex flex-col gap-6"
            >
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <ReadinessScoreHeader recommendations={workoutRecommendations} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <RecommendedWorkoutCard workout={workoutRecommendations.recommendedWorkout} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <MuscleBalanceSection imbalances={workoutRecommendations.muscleBalance.imbalances} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <CorrectiveExercisesCarousel exercises={workoutRecommendations.correctiveExercises} />
                </motion.div>
                <motion.div variants={prefersReducedMotion() ? {} : {}}>
                  <PredictedRecoveryChart predictions={workoutRecommendations.recoveryPredictions} />
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
