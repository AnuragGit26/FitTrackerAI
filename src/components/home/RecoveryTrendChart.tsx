import { useMemo, memo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateRecoveryTrendData } from '@/utils/recoveryHelpers';
import { motion } from 'framer-motion';
import { slideUp, prefersReducedMotion } from '@/utils/animations';
import { TrendingUp } from 'lucide-react';

function RecoveryTrendChartComponent() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();

  const chartData = useMemo(() => {
    if (isLoading || !profile) {
      return [];
    }

    return calculateRecoveryTrendData(
      muscleStatuses,
      profile.experienceLevel,
      settings.baseRestInterval || 48
    );
  }, [muscleStatuses, isLoading, profile, settings.baseRestInterval]);

  const shouldReduceMotion = prefersReducedMotion();

  if (isLoading || chartData.length === 0) {
    return (
      <motion.div
        className="rounded-2xl bg-white dark:bg-surface-dark-light p-5 shadow-sm border border-gray-200 dark:border-surface-dark-light"
        variants={shouldReduceMotion ? {} : slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
            7-Day Recovery Trend
          </p>
        </div>
        <div className="h-32 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-2xl bg-white dark:bg-surface-dark-light p-5 shadow-sm border border-gray-200 dark:border-surface-dark-light"
      variants={shouldReduceMotion ? {} : slideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
          7-Day Recovery Trend
        </p>
      </div>
      
      <div className="w-full h-32 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="recoveryTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0df269" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0df269" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="currentColor" 
              strokeOpacity={0.1}
              vertical={false}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              hide
            />
            <Area
              type="monotone"
              dataKey="recovery"
              stroke="#0df269"
              strokeWidth={2}
              fill="url(#recoveryTrendGradient)"
              dot={false}
              activeDot={{ r: 3, fill: '#0df269' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export const RecoveryTrendChart = memo(RecoveryTrendChartComponent);

