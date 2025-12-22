import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getWeeklyWorkoutDays } from '@/utils/analyticsHelpers';
import { Workout } from '@/types/workout';
import { prefersReducedMotion } from '@/utils/animations';

interface ConsistencyHeatmapProps {
  workouts: Workout[];
}

export function ConsistencyHeatmap({ workouts }: ConsistencyHeatmapProps) {
  const weeklyDays = useMemo(() => getWeeklyWorkoutDays(workouts), [workouts]);

  const consistencyScore = useMemo(() => {
    const totalDays = weeklyDays.flat().length;
    const workoutDays = weeklyDays.flat().filter(Boolean).length;
    return totalDays > 0 ? Math.round((workoutDays / totalDays) * 100) : 0;
  }, [weeklyDays]);

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base text-gray-900 dark:text-white">Consistency</h3>
        <div className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
          {consistencyScore}%
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between mb-1 px-1">
          {dayLabels.map((day, i) => (
            <span key={i} className="text-[10px] w-6 text-center text-gray-500">
              {day}
            </span>
          ))}
        </div>
        {weeklyDays.map((week, weekIndex) => (
          <div key={weekIndex} className="flex justify-between gap-1">
            {week.map((hasWorkout, dayIndex) => {
              const shouldReduceMotion = prefersReducedMotion();
              return (
                <motion.div
                  key={dayIndex}
                  className={`w-6 h-6 rounded ${
                    hasWorkout
                      ? 'bg-primary shadow-[0_0_8px_rgba(13,242,105,0.6)]'
                      : 'bg-gray-200 dark:bg-white/5'
                  }`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: (weekIndex * 7 + dayIndex) * 0.03,
                    duration: 0.2 
                  }}
                  whileHover={hasWorkout && !shouldReduceMotion ? { 
                    scale: 1.2,
                    boxShadow: '0 0 12px rgba(13,242,105,0.8)'
                  } : {}}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

