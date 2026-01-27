import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { heroSlideUp, energyPulse, fadeIn, prefersReducedMotion } from '@/utils/animations';
import { QuickAIInsight } from './QuickAIInsight';
import type { AIInsights } from '@/hooks/useAIInsights';

interface WorkoutStartBannerProps {
  isNewWorkout: boolean;
  aiInsight: AIInsights | null;
  isLoadingInsight: boolean;
  onDismiss: () => void;
  onStartWorkout: () => void;
}

export function WorkoutStartBanner({
  aiInsight,
  isLoadingInsight,
  onDismiss,
  onStartWorkout
}: WorkoutStartBannerProps) {
  const shouldReduceMotion = prefersReducedMotion();

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      variants={shouldReduceMotion ? {} : heroSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative w-full bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 p-6 overflow-hidden border-b border-primary/20"
      role="banner"
      aria-live="polite"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,153,51,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,153,51,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-4 max-w-2xl mx-auto">
        {/* Headline */}
        <motion.h2
          variants={shouldReduceMotion ? {} : fadeIn}
          className="text-3xl md:text-4xl font-bold text-white text-center"
        >
          Ready to Dominate? 💪
        </motion.h2>

        {/* AI Insight */}
        <QuickAIInsight
          insight={aiInsight}
          isLoading={isLoadingInsight}
          variant="banner"
        />

        {/* CTA Button */}
        <motion.button
          variants={shouldReduceMotion ? {} : energyPulse}
          initial="initial"
          animate="pulse"
          onClick={() => {
            onStartWorkout();
            onDismiss();
          }}
          className="px-8 py-3 bg-primary text-background-dark font-bold text-lg rounded-xl shadow-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          aria-label="Start workout timer"
        >
          Let&apos;s Go! <Zap className="w-5 h-5" />
        </motion.button>

        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Dismiss motivation banner"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>
    </motion.div>
  );
}
