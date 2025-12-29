import { useNavigate } from 'react-router-dom';
import { Timer, Signal, ChevronRight, Bot, CheckCircle2, Activity, Dumbbell, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useWorkoutStore } from '@/store/workoutStore';
import { useEffect, useMemo } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { scaleIn, prefersReducedMotion } from '@/utils/animations';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import { workoutAnalysisService } from '@/services/workoutAnalysisService';

export function AIFocusCard() {
  const navigate = useNavigate();
  const { insights, isLoading, generateInsights } = useAIInsights();
  const { workouts } = useWorkoutStore();

  useEffect(() => {
    if (workouts.length > 0) {
      generateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.length]);

  // Analyze workout patterns to check if workout completed today
  const patternAnalysis = useMemo(() => {
    if (workouts.length === 0) return null;
    return workoutAnalysisService.analyzeWorkoutPatterns(workouts);
  }, [workouts]);

  const hasWorkoutToday = patternAnalysis?.hasWorkoutToday ?? false;
  const todayWorkout = patternAnalysis?.todayWorkout ?? null;

  // Show loading skeleton while insights are being generated
  if (isLoading && workouts.length > 0) {
    return (
      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-slate-900 dark:text-white text-lg font-bold">Today&apos;s Focus</h2>
        </div>
        <div className="rounded-2xl bg-surface-dark p-5">
          <Skeleton height={120} className="rounded-xl" />
        </div>
      </div>
    );
  }

  // Show empty state only if not loading and no data
  if (workouts.length === 0 || (!isLoading && !insights?.recommendations?.[0])) {
    return (
      <div className="px-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="text-slate-900 dark:text-white text-lg font-bold">Today&apos;s Focus</h2>
        </div>
        <div className="rounded-2xl bg-surface-dark p-6">
          <EmptyState
            icon={Bot}
            title="No recommendations yet"
            description="Log a few workouts to get personalized AI recommendations based on your training patterns."
            action={
              <button
                onClick={() => navigate('/log-workout')}
                className="px-4 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Start Logging Workouts
              </button>
            }
            className="py-8"
          />
        </div>
      </div>
    );
  }

  // Clean AI-generated text to remove markdown formatting and gibberish
  const cleanedTitle = cleanPlainTextResponse(insights.recommendations[0] || '');
  const cleanedDescription = cleanPlainTextResponse(insights.analysis || 'Based on your recent training patterns and recovery status.');

  // Determine recommendation type from title
  const getRecommendationType = (title: string): 'rest' | 'cardio' | 'strength' | 'light_activity' => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('rest') || lowerTitle.includes('recovery') || lowerTitle.includes('rest day')) {
      return 'rest';
    }
    if (lowerTitle.includes('cardio') || lowerTitle.includes('running') || lowerTitle.includes('cycling')) {
      return 'cardio';
    }
    if (lowerTitle.includes('strength') || lowerTitle.includes('weight') || lowerTitle.includes('lifting')) {
      return 'strength';
    }
    return 'light_activity';
  };

  const recommendationType = getRecommendationType(cleanedTitle);
  
  // Get icon and label based on type
  const getTypeIcon = () => {
    if (hasWorkoutToday) return CheckCircle2;
    switch (recommendationType) {
      case 'rest':
        return Moon;
      case 'cardio':
        return Activity;
      case 'strength':
        return Dumbbell;
      default:
        return Activity;
    }
  };

  const getTypeLabel = () => {
    if (hasWorkoutToday) return 'Workout Completed';
    switch (recommendationType) {
      case 'rest':
        return 'Rest Day';
      case 'cardio':
        return 'Cardio';
      case 'strength':
        return 'Strength Training';
      default:
        return 'Light Activity';
    }
  };

  const TypeIcon = getTypeIcon();
  const typeLabel = getTypeLabel();

  const shouldReduceMotion = prefersReducedMotion();

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-5 h-5 text-primary" />
        <h2 className="text-slate-900 dark:text-white text-lg font-bold">Today&apos;s Focus</h2>
      </div>
      <motion.div
        className={`relative overflow-hidden rounded-2xl bg-surface-dark shadow-lg group cursor-pointer ${
          hasWorkoutToday ? 'border-2 border-primary/30' : ''
        }`}
        onClick={() => navigate('/insights')}
        variants={shouldReduceMotion ? {} : scaleIn}
        initial="hidden"
        animate="visible"
        whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-surface-dark via-surface-dark/80 to-transparent"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(13,242,105,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(13,242,105,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="relative p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1.5 ${
              hasWorkoutToday 
                ? 'bg-primary/20 text-primary border border-primary/30' 
                : 'bg-primary text-background-dark'
            }`}>
              <TypeIcon className="w-3 h-3" />
              {typeLabel}
            </div>
            <ChevronRight className="text-white/50 w-5 h-5" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-white mb-1">
              {hasWorkoutToday ? 'Great Work Today!' : cleanedTitle || 'Recommended Workout'}
            </h3>
            <p className="text-gray-300 text-sm max-w-[80%] leading-relaxed">
              {cleanedDescription}
            </p>
          </div>
          {hasWorkoutToday && todayWorkout && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-1.5 text-primary text-xs">
                <Activity className="w-3 h-3" />
                <span className="font-medium">
                  {todayWorkout.exercises.length} exercise{todayWorkout.exercises.length !== 1 ? 's' : ''} • {todayWorkout.totalDuration} min
                </span>
              </div>
              {todayWorkout.totalVolume > 0 && (
                <div className="flex items-center gap-1.5 text-primary/80 text-xs">
                  <Dumbbell className="w-3 h-3" />
                  <span>{Math.round(todayWorkout.totalVolume)}kg volume</span>
                </div>
              )}
            </div>
          )}
          {!hasWorkoutToday && (
            <div className="flex items-center gap-4 mt-1">
              {insights.tip && (
                <div className="flex items-start gap-1.5 bg-primary/10 px-2 py-1.5 rounded-lg border border-primary/20">
                  <Bot className="text-primary w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="text-primary/90 text-xs leading-relaxed">{insights.tip}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

