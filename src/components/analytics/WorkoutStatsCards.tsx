import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { slideUp, prefersReducedMotion } from '@/utils/animations';

interface WorkoutStatsCardsProps {
  workoutCount: number;
  currentStreak: number;
}

export function WorkoutStatsCards({ workoutCount, currentStreak }: WorkoutStatsCardsProps) {
  const streakDots = Array.from({ length: Math.min(currentStreak, 7) }, (_, i) => i);
  const workoutCountValue = useCountUp(workoutCount, 0, { duration: 1.5, decimals: 0 });
  const streakCountValue = useCountUp(currentStreak, 0, { duration: 1.5, decimals: 0 });
  const shouldReduceMotion = prefersReducedMotion();
  const progressWidth = Math.min((workoutCount / 20) * 100, 100);

  return (
    <>
      <motion.div 
        className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-border-dark/50 flex flex-col justify-between"
        variants={shouldReduceMotion ? {} : slideUp}
        initial="hidden"
        animate="visible"
        whileHover={shouldReduceMotion ? {} : { y: -2 }}
      >
        <div className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-1">
          Workouts
        </div>
        <div className="text-2xl font-bold">{workoutCountValue.formattedValue}</div>
        <div className="h-1 w-full bg-white dark:bg-surface-dark-light rounded-full mt-2 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressWidth}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
      <motion.div 
        className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-border-dark/50 flex flex-col justify-between"
        variants={shouldReduceMotion ? {} : slideUp}
        initial="hidden"
        animate="visible"
        whileHover={shouldReduceMotion ? {} : { y: -2 }}
      >
        <div className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-1">
          Streak
        </div>
        <div className="text-2xl font-bold text-white">
          {streakCountValue.formattedValue} <span className="text-sm text-gray-400 font-normal">Workouts</span>
        </div>
        <div className="flex gap-1 mt-2">
          {streakDots.map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            />
          ))}
        </div>
      </motion.div>
    </>
  );
}

