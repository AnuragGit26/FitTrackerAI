import { useNavigate } from 'react-router-dom';
import { Timer, Signal, ChevronRight, Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAIInsights } from '@/hooks/useAIInsights';
import { useWorkoutStore } from '@/store/workoutStore';
import { useEffect } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { scaleIn, prefersReducedMotion } from '@/utils/animations';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';

export function AIFocusCard() {
  const navigate = useNavigate();
  const { insights, generateInsights } = useAIInsights();
  const { workouts } = useWorkoutStore();

  useEffect(() => {
    if (workouts.length > 0) {
      generateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts.length]);

  if (workouts.length === 0 || !insights?.recommendations?.[0]) {
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

  const recommendation = {
    title: cleanedTitle || 'Recommended Workout',
    description: cleanedDescription,
    duration: 45,
    intensity: 'High Intensity',
  };

  const shouldReduceMotion = prefersReducedMotion();

  return (
    <div className="px-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-5 h-5 text-primary" />
        <h2 className="text-slate-900 dark:text-white text-lg font-bold">Today&apos;s Focus</h2>
      </div>
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-surface-dark shadow-lg group cursor-pointer"
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
            <div className="bg-primary text-background-dark text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
              Recommended
            </div>
            <ChevronRight className="text-white/50 w-5 h-5" />
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-bold text-white mb-1">{recommendation.title}</h3>
            <p className="text-gray-300 text-sm max-w-[80%] leading-relaxed">
              {recommendation.description}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <Timer className="text-primary w-[18px] h-[18px]" />
              <span className="text-white text-xs font-medium">{recommendation.duration} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Signal className="text-primary w-[18px] h-[18px]" />
              <span className="text-white text-xs font-medium">{recommendation.intensity}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

