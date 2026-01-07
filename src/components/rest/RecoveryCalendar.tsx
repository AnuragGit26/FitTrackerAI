import { useMemo } from 'react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_RECOVERY_SETTINGS } from '@/types/muscle';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, differenceInHours, isAfter } from 'date-fns';

export function RecoveryCalendar() {
  const { muscleStatuses } = useMuscleRecovery();
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();
  const today = useMemo(() => new Date(), []);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate recovery status for each day based on workout history
  const dayStatuses = useMemo(() => {
    if (!profile || muscleStatuses.length === 0) {
      // Default to ready if no data
      return daysInMonth.map((day) => ({
        date: day,
        recoveryPercentage: 85,
        isReady: true,
        needsRest: false,
      }));
    }

    return daysInMonth.map((day) => {
      const isFuture = isAfter(day, today);

      if (isFuture) {
        // For future days, project recovery based on current status
        // Assume recovery continues to improve if no workouts are scheduled
        const avgRecovery = muscleStatuses.length > 0
          ? Math.round(
              muscleStatuses.reduce((sum, s) => sum + s.recoveryPercentage, 0) /
                muscleStatuses.length
            )
          : 85;
        
        // Project that recovery improves over time (simplified)
        const daysFromNow = Math.ceil((day.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const projectedRecovery = Math.min(100, avgRecovery + (daysFromNow * 5));
        
        return {
          date: day,
          recoveryPercentage: projectedRecovery,
          isReady: projectedRecovery >= 75,
          needsRest: projectedRecovery < 50,
        };
      }

      // For past and current days, calculate actual recovery
      let totalRecovery = 0;
      let count = 0;

      muscleStatuses.forEach((status) => {
        if (!status.lastWorked) {
          // If never worked, always ready
          totalRecovery += 100;
          count++;
          return;
        }

        const lastWorked = status.lastWorked instanceof Date 
          ? status.lastWorked 
          : new Date(status.lastWorked);

        // Check if there was a workout on this day that would reset recovery
        const workoutOnDay = workouts.find((w) => {
          const workoutDate = new Date(w.date);
          return (
            workoutDate.getDate() === day.getDate() &&
            workoutDate.getMonth() === day.getMonth() &&
            workoutDate.getFullYear() === day.getFullYear()
          );
        });

        if (workoutOnDay) {
          // If there was a workout on this day, recovery starts at 0
          totalRecovery += 0;
          count++;
          return;
        }

        // Calculate recovery on this specific date
        const hoursSinceWorkout = differenceInHours(day, lastWorked);
        
        if (hoursSinceWorkout < 0) {
          // This date is before the last workout, use current status
          totalRecovery += status.recoveryPercentage;
          count++;
          return;
        }

        // Calculate what recovery would have been on this date
        // Note: Recovery calculation logic is applied below

        // Adjust for the specific date
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

      const avgRecovery = count > 0 ? Math.round(totalRecovery / count) : 85;

      return {
        date: day,
        recoveryPercentage: avgRecovery,
        isReady: avgRecovery >= 75,
        needsRest: avgRecovery < 50,
      };
    });
  }, [daysInMonth, muscleStatuses, workouts, profile, settings.baseRestInterval, today]);

  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const monthName = format(today, 'MMMM');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold leading-tight">{monthName} Schedule</h3>
        <div className="flex gap-2 text-xs font-medium text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Ready
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            Rest
          </span>
        </div>
      </div>
      <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4">
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {weekDays.map((day, index) => (
            <div key={index} className="text-xs text-slate-400 font-bold uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month start (Monday = 1, Sunday = 0) */}
          {Array.from({
            length: monthStart.getDay() === 0 ? 6 : (monthStart.getDay() + 6) % 7,
          }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {dayStatuses.map((dayStatus) => {
            const isCurrentDay = isToday(dayStatus.date);
            const isReady = dayStatus.isReady;
            const needsRest = dayStatus.needsRest;

            return (
              <div
                key={dayStatus.date.toISOString()}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative
                  ${
                    isCurrentDay
                      ? 'bg-primary text-background-dark font-bold ring-2 ring-primary ring-offset-2 dark:ring-offset-background-dark ring-offset-background-light'
                      : 'bg-slate-200 dark:bg-white/10'
                  }
                  ${!isCurrentDay && (isReady || needsRest) ? 'border border-transparent hover:border-slate-400 transition-colors' : ''}
                `}
              >
                <span
                  className={
                    isCurrentDay
                      ? 'text-background-dark'
                      : 'text-slate-900 dark:text-white'
                  }
                >
                  {format(dayStatus.date, 'd')}
                </span>
                {!isCurrentDay && (isReady || needsRest) && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isReady ? 'bg-primary' : needsRest ? 'bg-warning' : 'bg-caution'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

