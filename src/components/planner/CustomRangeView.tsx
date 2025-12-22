import { useState, useMemo } from 'react';
import { startOfDay, addDays, eachDayOfInterval, isSameDay, format } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';
import { cn } from '@/utils/cn';
import { usePlannedWorkoutStore } from '@/store/plannedWorkoutStore';

interface CustomRangeViewProps {
  startDate: Date;
  selectedDate: Date;
  plannedWorkouts: PlannedWorkout[];
  onDateSelect: (date: Date) => void;
}

export function CustomRangeView({ startDate, selectedDate, plannedWorkouts, onDateSelect }: CustomRangeViewProps) {
  const { customDays, setCustomDays } = usePlannedWorkoutStore();
  const [localDays, setLocalDays] = useState(customDays);

  const endDate = useMemo(() => {
    return addDays(startDate, localDays - 1);
  }, [startDate, localDays]);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
  }, [startDate, endDate]);

  const today = new Date();

  const getPlannedWorkoutsForDate = (date: Date): PlannedWorkout[] => {
    return plannedWorkouts.filter((pw) => {
      const scheduledDate = new Date(pw.scheduledDate);
      return isSameDay(scheduledDate, date) && !pw.isCompleted;
    });
  };

  const handleDaysChange = (newDays: number) => {
    if (newDays >= 1 && newDays <= 90) {
      setLocalDays(newDays);
      setCustomDays(newDays);
    }
  };

  return (
    <div className="px-4 pb-4 border-b border-white/5">
      {/* Custom Range Controls */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-white">Days:</label>
          <input
            type="number"
            min="1"
            max="90"
            value={localDays}
            onChange={(e) => handleDaysChange(parseInt(e.target.value) || 7)}
            className="w-16 px-2 py-1 rounded bg-surface-dark border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <h2 className="text-base font-bold text-white">
          {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {days.map((day, index) => {
          const dayWorkouts = getPlannedWorkoutsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isSameDay(day, today);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                'h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-colors relative',
                isSelected
                  ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/30 scale-110'
                  : isTodayDate
                    ? 'bg-surface-dark text-white'
                    : 'text-white hover:bg-surface-dark'
              )}
            >
              {format(day, 'd')}
              {dayWorkouts.length > 0 && (
                <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

