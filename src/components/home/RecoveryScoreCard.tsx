import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMemo } from 'react';
import { calculateOverallRecoveryScore, calculateRecoveryTrend, getReadinessStatus } from '@/utils/recoveryHelpers';
import { motion } from 'framer-motion';
import { slideUp, prefersReducedMotion } from '@/utils/animations';

export function RecoveryScoreCard() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();

  const { score, trend, readinessStatus, statusMessage } = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) {
      return {
        score: 85,
        trend: { current: 85, previous: 85, change: 0, changePercentage: 0 },
        readinessStatus: 'ready' as const,
        statusMessage: 'Recovery is optimal. You are ready for high intensity.',
      };
    }

    const overallScore = calculateOverallRecoveryScore(muscleStatuses);
    const trendData = calculateRecoveryTrend(
      muscleStatuses,
      profile?.experienceLevel || 'intermediate',
      settings.baseRestInterval || 48
    );
    const readiness = getReadinessStatus(overallScore);

    let message = 'Recovery is optimal. You are ready for high intensity.';
    if (readiness === 'needs_rest') {
      message = 'Recovery is low. Consider taking additional rest.';
    } else if (readiness === 'recovering') {
      message = 'Recovery is moderate. Light activity recommended.';
    }

    return {
      score: overallScore,
      trend: trendData,
      readinessStatus: readiness,
      statusMessage: message,
    };
  }, [muscleStatuses, isLoading, profile?.experienceLevel, settings.baseRestInterval]);

  const shouldReduceMotion = prefersReducedMotion();
  const trendChange = trend.changePercentage;

  const getStatusColor = () => {
    if (readinessStatus === 'ready') {
    return 'text-primary';
  }
    if (readinessStatus === 'recovering') {
    return 'text-caution';
  }
    return 'text-warning';
  };

  const getStatusBgColor = () => {
    if (readinessStatus === 'ready') {
    return 'bg-primary/10';
  }
    if (readinessStatus === 'recovering') {
    return 'bg-caution/10';
  }
    return 'bg-warning/10';
  };

  const getStatusIcon = () => {
    if (readinessStatus === 'ready') {
    return CheckCircle2;
  }
    if (readinessStatus === 'recovering') {
    return Activity;
  }
    return AlertCircle;
  };

  const StatusIcon = getStatusIcon();

  return (
    <motion.div
      className="rounded-2xl bg-white dark:bg-surface-dark-light p-5 shadow-sm border border-gray-200 dark:border-surface-dark-light"
      variants={shouldReduceMotion ? {} : slideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
            Recovery Score
          </p>
        </div>
        {trendChange !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
            trendChange > 0 
              ? 'text-primary bg-primary/10' 
              : 'text-warning bg-warning/10'
          }`}>
            {trendChange > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-bold">
              {trendChange > 0 ? '+' : ''}{trendChange}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
          {score}%
        </h2>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${getStatusBgColor()}`}>
          <StatusIcon className={`w-4 h-4 ${getStatusColor()}`} />
          <span className={`text-xs font-bold ${getStatusColor()}`}>
            {readinessStatus === 'ready' ? 'Ready' : readinessStatus === 'recovering' ? 'Recovering' : 'Needs Rest'}
          </span>
        </div>
      </div>

      <div className="relative w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            readinessStatus === 'ready' 
              ? 'bg-primary' 
              : readinessStatus === 'recovering' 
              ? 'bg-caution' 
              : 'bg-warning'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
        {statusMessage}
      </p>
    </motion.div>
  );
}

