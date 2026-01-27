import { useMemo } from 'react';
import { useWorkoutStore } from '@/store/workoutStore';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

export function HeatmapCalendar() {
  const { workouts } = useWorkoutStore();

  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(addDays(today, -84)); // 12 weeks ago
    const days = [];
    
    for (let i = 0; i < 84; i++) {
      const date = addDays(startDate, i);
      const workoutCount = workouts.filter((w) =>
        isSameDay(new Date(w.date), date)
      ).length;
      
      days.push({
        date,
        count: workoutCount,
      });
    }

    return days;
  }, [workouts]);

  const getIntensityColor = (count: number) => {
    if (count === 0) {return 'bg-white dark:bg-surface-dark';}
    if (count === 1) {return 'bg-primary-200 dark:bg-primary-900';}
    if (count === 2) {return 'bg-primary-400 dark:bg-primary-700';}
    return 'bg-primary-600 dark:bg-primary-500';
  };

  return (
    <div className="bg-white dark:bg-surface-dark rounded-lg p-6 border border-gray-100 dark:border-border-dark">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100 mb-4">
        Workout Frequency
      </h3>
      <div className="grid grid-cols-12 gap-1">
        {heatmapData.map((day, index) => (
          <div
            key={index}
            className={`aspect-square rounded ${getIntensityColor(day.count)}`}
            title={`${format(day.date, 'MMM d')}: ${day.count} workout${day.count !== 1 ? 's' : ''}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 text-sm text-slate-500 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-white dark:bg-surface-dark" />
          <div className="w-3 h-3 rounded bg-primary-200 dark:bg-primary-900" />
          <div className="w-3 h-3 rounded bg-primary-400 dark:bg-primary-700" />
          <div className="w-3 h-3 rounded bg-primary-600 dark:bg-primary-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

