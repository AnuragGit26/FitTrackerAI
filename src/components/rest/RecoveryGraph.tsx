import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { subDays, differenceInHours, format } from 'date-fns';

export function RecoveryGraph() {
  const { muscleStatuses } = useMuscleRecovery();
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();

  // Calculate historical recovery data for the last 14 days
  const chartData = useMemo(() => {
    const daysToShow = 14;
    const dataPoints: { date: string; recovery: number; day: string }[] = [];
    const now = new Date();

    // Generate default data if no profile or muscle statuses
    if (!profile || muscleStatuses.length === 0) {
      for (let i = daysToShow; i >= 0; i--) {
        const targetDate = subDays(now, i);
        const dayLabel = format(targetDate, 'MMM d');
        const recovery = Math.max(60, 100 - (i * 2.5)); // Default decreasing recovery
        dataPoints.push({
          date: format(targetDate, 'MM/dd'),
          recovery: Math.round(recovery),
          day: dayLabel,
        });
      }
      return dataPoints;
    }

    // Calculate average recovery for each day going backwards
    for (let i = daysToShow; i >= 0; i--) {
      const targetDate = subDays(now, i);
      const dayLabel = format(targetDate, 'MMM d');

      // Calculate what recovery would have been on that date
      let totalRecovery = 0;
      let count = 0;

      muscleStatuses.forEach((status) => {
        if (!status.lastWorked) {
          totalRecovery += 100;
          count++;
          return;
        }

        const lastWorked = status.lastWorked instanceof Date 
          ? status.lastWorked 
          : new Date(status.lastWorked);

        // Calculate recovery percentage on target date
        const hoursSinceWorkout = differenceInHours(targetDate, lastWorked);
        
        if (hoursSinceWorkout < 0) {
          totalRecovery += status.recoveryPercentage;
          count++;
          return;
        }

        // Calculate recovery for historical date
        const recoverySettings = DEFAULT_RECOVERY_SETTINGS;
        let baseRecoveryHours = 48;
        if (profile.experienceLevel === 'beginner') {
          baseRecoveryHours = (recoverySettings.beginnerRestDays[status.muscle] || 2) * 24;
        } else if (profile.experienceLevel === 'intermediate') {
          baseRecoveryHours = (recoverySettings.intermediateRestDays[status.muscle] || 2) * 24;
        } else {
          baseRecoveryHours = (recoverySettings.advancedRestDays[status.muscle] || 1) * 24;
        }

        if (settings.baseRestInterval) {
          const ratio = settings.baseRestInterval / 48;
          baseRecoveryHours = baseRecoveryHours * ratio;
        }

        const workloadMultiplier = 1 + (status.workloadScore / 100);
        const adjustedRecoveryHours = baseRecoveryHours * workloadMultiplier;
        const recoveryOnDate = Math.min(
          100,
          Math.max(0, (hoursSinceWorkout / adjustedRecoveryHours) * 100)
        );

        totalRecovery += recoveryOnDate;
        count++;
      });

      const avgRecovery = count > 0 ? totalRecovery / count : 85;
      dataPoints.push({
        date: format(targetDate, 'MM/dd'),
        recovery: Math.round(avgRecovery),
        day: dayLabel,
      });
    }

    return dataPoints;
  }, [muscleStatuses, workouts, profile, settings.baseRestInterval]);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
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
            fill="url(#recoveryGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#0df269' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

