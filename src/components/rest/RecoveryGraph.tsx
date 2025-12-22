import { useMemo } from 'react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateRecoveryStatus } from '@/services/recoveryCalculator';
import { DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { subDays, differenceInHours } from 'date-fns';

export function RecoveryGraph() {
  const { muscleStatuses } = useMuscleRecovery();
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();

  // Calculate historical recovery data for the last 14 days
  const historicalData = useMemo(() => {
    if (!profile || muscleStatuses.length === 0) {
      // Return default data if no data available
      return [
        { x: 0, y: 35 },
        { x: 10, y: 32 },
        { x: 20, y: 25 },
        { x: 40, y: 20 },
        { x: 60, y: 15 },
        { x: 80, y: 8 },
        { x: 100, y: 5 },
      ];
    }

    // Get recovery percentages for the last 14 days
    const daysToShow = 14;
    const dataPoints: { x: number; y: number }[] = [];
    const now = new Date();

    // Calculate average recovery for each day going backwards
    for (let i = daysToShow; i >= 0; i--) {
      const targetDate = subDays(now, i);
      const x = ((daysToShow - i) / daysToShow) * 100;

      // Calculate what recovery would have been on that date
      let totalRecovery = 0;
      let count = 0;

      muscleStatuses.forEach((status) => {
        if (!status.lastWorked) {
          totalRecovery += 100; // Ready if never worked
          count++;
          return;
        }

        const lastWorked = status.lastWorked instanceof Date 
          ? status.lastWorked 
          : new Date(status.lastWorked);

        // Calculate recovery percentage on target date
        const hoursSinceWorkout = differenceInHours(targetDate, lastWorked);
        
        if (hoursSinceWorkout < 0) {
          // Future date, use current recovery
          totalRecovery += status.recoveryPercentage;
          count++;
          return;
        }

        // For historical dates, we need to recalculate based on hours since workout at that date
        // The calculateRecoveryStatus uses current time, so we need to manually calculate
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
      // Convert recovery percentage to graph Y coordinate (0-40, inverted so higher recovery is lower on graph)
      const y = 40 - (avgRecovery / 100) * 35; // Scale to 0-35 range, then invert
      dataPoints.push({ x, y: Math.max(5, Math.min(35, y)) });
    }

    return dataPoints;
  }, [muscleStatuses, workouts, profile, settings.baseRestInterval]);

  // Convert to path string with smooth curve
  const pathData = useMemo(() => {
    if (historicalData.length === 0) return '';
    
    return historicalData
      .map((point, index) => {
        if (index === 0) return `M${point.x},${point.y}`;
        if (index === 1) return `Q${point.x},${point.y}`;
        return `T${point.x},${point.y}`;
      })
      .join(' ');
  }, [historicalData]);

  // Create area path (closed path for gradient fill)
  const areaPath = `${pathData} V40 H0 Z`;

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark via-transparent to-transparent z-10 pointer-events-none" />
      <svg
        className="w-full h-full overflow-visible preserve-3d"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          className="text-slate-500"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.2"
          x1="0"
          x2="100"
          y1="0"
          y2="0"
        />
        <line
          className="text-slate-500"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.2"
          x1="0"
          x2="100"
          y1="20"
          y2="20"
        />
        <line
          className="text-slate-500"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeWidth="0.2"
          x1="0"
          x2="100"
          y1="40"
          y2="40"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="recoveryGradient" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#0df269', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#0df269', stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Area fill */}
        {pathData && (
          <path
            d={areaPath}
            fill="url(#recoveryGradient)"
            opacity="0.2"
          />
        )}

        {/* Line */}
        {pathData && (
          <path
            className="drop-shadow-[0_0_10px_rgba(13,242,105,0.5)]"
            d={pathData}
            fill="none"
            stroke="#0df269"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
        )}
      </svg>
    </>
  );
}

