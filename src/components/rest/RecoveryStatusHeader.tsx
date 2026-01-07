import { TrendingUp, TrendingDown } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMemo } from 'react';
import { subDays, differenceInHours } from 'date-fns';
import { DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';

export function RecoveryStatusHeader() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();

  const { recoveryPercentage, trend, statusMessage } = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) {
      return {
        recoveryPercentage: 85,
        trend: 0,
        statusMessage: 'Recovery is optimal. You are ready for high intensity.',
      };
    }

    // Calculate overall recovery as average of all muscle groups
    const avgRecovery = Math.round(
      muscleStatuses.reduce((sum, status) => sum + status.recoveryPercentage, 0) /
        muscleStatuses.length
    );

    // Calculate trend by comparing current recovery with recovery 7 days ago
    // Uses the same calculation logic as calculateRecoveryStatus to ensure BaseRestInterval sync
    let trend = 0;
    if (profile && muscleStatuses.length > 0) {
      const sevenDaysAgo = subDays(new Date(), 7);
      
      let totalRecovery7DaysAgo = 0;
      let count = 0;

      muscleStatuses.forEach((status) => {
        if (!status.lastWorked) {
          totalRecovery7DaysAgo += 100;
          count++;
          return;
        }

        const lastWorked = status.lastWorked instanceof Date 
          ? status.lastWorked 
          : new Date(status.lastWorked);

        // Calculate hours between last workout and 7 days ago
        const hoursSinceWorkout7DaysAgo = differenceInHours(sevenDaysAgo, lastWorked);
        
        if (hoursSinceWorkout7DaysAgo < 0) {
          // 7 days ago was before the last workout, use current status
          totalRecovery7DaysAgo += status.recoveryPercentage;
          count++;
          return;
        }

        // Use the same calculation logic as calculateRecoveryStatus to ensure BaseRestInterval is applied
        const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
        let baseRecoveryHours = 48;
        
        if (profile.experienceLevel === 'beginner') {
          baseRecoveryHours = (recoverySettings.beginnerRestDays[status.muscle] || 2) * 24;
        } else if (profile.experienceLevel === 'intermediate') {
          baseRecoveryHours = (recoverySettings.intermediateRestDays[status.muscle] || 2) * 24;
        } else {
          baseRecoveryHours = (recoverySettings.advancedRestDays[status.muscle] || 1) * 24;
        }

        // Apply BaseRestInterval setting (same logic as calculateRecoveryStatus)
        const baseRestInterval = settings.baseRestInterval || 48;
        if (baseRestInterval !== undefined) {
          const defaultBase = 48;
          const ratio = baseRestInterval / defaultBase;
          baseRecoveryHours = baseRecoveryHours * ratio;
        }

        // Calculate workload multiplier (same as calculateRecoveryStatus)
        const workloadMultiplier = 1 + (status.workloadScore / 100);
        const adjustedRecoveryHours = baseRecoveryHours * workloadMultiplier;

        // Calculate recovery percentage for 7 days ago
        const recovery7DaysAgo = Math.min(
          100,
          Math.max(0, (hoursSinceWorkout7DaysAgo / adjustedRecoveryHours) * 100)
        );

        totalRecovery7DaysAgo += recovery7DaysAgo;
        count++;
      });

      const avgRecovery7DaysAgo = count > 0 ? Math.round(totalRecovery7DaysAgo / count) : avgRecovery;
      
      // Calculate percentage change
      if (avgRecovery7DaysAgo > 0) {
        trend = Math.round(((avgRecovery - avgRecovery7DaysAgo) / avgRecovery7DaysAgo) * 100);
      } else {
        trend = avgRecovery > 0 ? 100 : 0;
      }
    }

    let statusMessage = 'Recovery is optimal. You are ready for high intensity.';
    if (avgRecovery < 50) {
      statusMessage = 'Recovery is low. Consider taking additional rest.';
    } else if (avgRecovery < 75) {
      statusMessage = 'Recovery is moderate. Light activity recommended.';
    }

    return {
      recoveryPercentage: avgRecovery,
      trend,
      statusMessage,
    };
  }, [muscleStatuses, isLoading, profile, settings.baseRestInterval]);

  return (
    <div className="flex flex-col gap-1">
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
        System Status
      </p>
      <div className="flex items-baseline gap-3">
        <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
          {recoveryPercentage}%
        </h1>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
            trend > 0 
              ? 'text-primary bg-primary/10' 
              : 'text-warning bg-warning/10'
          }`}>
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 font-bold" />
            ) : (
              <TrendingDown className="w-4 h-4 font-bold" />
            )}
            <span className="text-sm font-bold">
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          </div>
        )}
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
        {statusMessage}
      </p>
    </div>
  );
}

