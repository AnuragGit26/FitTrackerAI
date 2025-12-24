import { useMemo } from 'react';
import { AlertTriangle, Lightbulb, Info, ChevronRight, Sparkles } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { generateRecoveryInsights } from '@/utils/recoveryHelpers';
import { motion } from 'framer-motion';
import { slideUp, prefersReducedMotion } from '@/utils/animations';
import { useNavigate } from 'react-router-dom';

export function RecoveryInsightsCard() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const navigate = useNavigate();

  const insights = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) {
      return [];
    }
    return generateRecoveryInsights(muscleStatuses);
  }, [muscleStatuses, isLoading]);

  const shouldReduceMotion = prefersReducedMotion();

  const getIcon = (type: 'warning' | 'recommendation' | 'info') => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'recommendation':
        return Lightbulb;
      case 'info':
        return Info;
    }
  };

  const getIconColor = (type: 'warning' | 'recommendation' | 'info') => {
    switch (type) {
      case 'warning':
        return 'text-warning';
      case 'recommendation':
        return 'text-primary';
      case 'info':
        return 'text-blue-500';
    }
  };

  const getBgColor = (type: 'warning' | 'recommendation' | 'info') => {
    switch (type) {
      case 'warning':
        return 'bg-warning/10';
      case 'recommendation':
        return 'bg-primary/10';
      case 'info':
        return 'bg-blue-500/10';
    }
  };

  if (isLoading || insights.length === 0) {
    return (
      <motion.div
        className="rounded-2xl bg-white dark:bg-surface-dark-light p-5 shadow-sm border border-gray-200 dark:border-surface-dark-light"
        variants={shouldReduceMotion ? {} : slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
            Smart Insights
          </p>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {isLoading ? 'Analyzing recovery data...' : 'All systems optimal. Keep up the great work!'}
        </p>
      </motion.div>
    );
  }

  const primaryInsight = insights[0];

  if (!primaryInsight) return null;

  const Icon = getIcon(primaryInsight.type);

  return (
    <motion.div
      className="rounded-2xl bg-white dark:bg-surface-dark-light p-5 shadow-sm border border-gray-200 dark:border-surface-dark-light cursor-pointer group"
      variants={shouldReduceMotion ? {} : slideUp}
      initial="hidden"
      animate="visible"
      onClick={() => navigate('/insights')}
      whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
            Smart Insights
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
      </div>

      <div className={`flex items-start gap-3 p-3 rounded-lg ${getBgColor(primaryInsight.type)}`}>
        <Icon className={`w-5 h-5 ${getIconColor(primaryInsight.type)} shrink-0 mt-0.5`} />
        <p className="text-slate-900 dark:text-white text-sm leading-relaxed flex-1">
          {primaryInsight.message}
        </p>
      </div>

      {insights.length > 1 && (
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-3 text-center">
          {insights.length - 1} more insight{insights.length - 1 === 1 ? '' : 's'} available
        </p>
      )}
    </motion.div>
  );
}

