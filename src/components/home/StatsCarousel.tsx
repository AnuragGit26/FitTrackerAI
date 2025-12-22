import { Dumbbell, Flame, Zap, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { calculateStreak, estimateEnergy } from '@/utils/calculations';
import { EmptyState } from '@/components/common/EmptyState';
import { useNavigate } from 'react-router-dom';
import { staggerContainer, slideUp, prefersReducedMotion } from '@/utils/animations';
import { useCountUp } from '@/hooks/useCountUp';

export function StatsCarousel() {
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const navigate = useNavigate();

  // Calculate values (hooks must be called unconditionally)
  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0);
  const workoutDates = workouts.map(w => w.date);
  const streak = calculateStreak(workoutDates);
  const energy = estimateEnergy(workouts);

  const previousVolume = workouts.length > 1 
    ? workouts.slice(0, Math.floor(workouts.length / 2)).reduce((sum, w) => sum + w.totalVolume, 0)
    : totalVolume * 0.95;
  const volumeChange = previousVolume > 0 
    ? ((totalVolume - previousVolume) / previousVolume) * 100 
    : 0;

  const previousEnergy = workouts.length > 1
    ? estimateEnergy(workouts.slice(0, Math.floor(workouts.length / 2)))
    : energy * 0.88;
  const energyChange = previousEnergy > 0
    ? ((energy - previousEnergy) / previousEnergy) * 100
    : 0;

  // All hooks must be called before any conditional returns
  const shouldReduceMotion = prefersReducedMotion();
  const volumeCount = useCountUp(totalVolume, 0, { duration: 1.5, decimals: 0 });
  const energyCount = useCountUp(energy, 0, { duration: 1.5, decimals: 0 });

  // Early return AFTER all hooks
  if (workouts.length === 0) {
    return (
      <div className="w-full px-5 pb-2">
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          description="Start logging your workouts to see your stats and track your progress."
          action={
            <button
              onClick={() => navigate('/log-workout')}
              className="px-4 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Log Your First Workout
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar px-5 pb-2">
      <motion.div 
        className="flex gap-3 min-w-max"
        variants={shouldReduceMotion ? {} : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Volume Card */}
        <motion.div 
          className="flex flex-col gap-1 rounded-2xl p-4 bg-white dark:bg-surface-dark-light min-w-[140px] shadow-sm"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-5 h-5 text-primary" />
            <p className="text-slate-500 dark:text-gray-300 text-xs font-medium">Volume</p>
          </div>
          <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
            {volumeCount.formattedValue}{' '}
            <span className="text-sm font-normal text-gray-400">
              {profile?.preferredUnit || 'kg'}
            </span>
          </p>
          <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{volumeChange > 0 ? '+' : ''}{Math.round(volumeChange)}%</span>
          </div>
        </motion.div>

        {/* Streak Card */}
        <motion.div 
          className="flex flex-col gap-1 rounded-2xl p-4 bg-white dark:bg-surface-dark-light min-w-[140px] shadow-sm ring-1 ring-primary/30"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-primary" />
            <p className="text-slate-500 dark:text-gray-300 text-xs font-medium">Streak</p>
          </div>
          <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
            {streak} <span className="text-sm font-normal text-gray-400">Days</span>
          </p>
          <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
            <Plus className="w-3.5 h-3.5" />
            <span>1 day</span>
          </div>
        </motion.div>

        {/* Energy Card */}
        <motion.div 
          className="flex flex-col gap-1 rounded-2xl p-4 bg-white dark:bg-surface-dark-light min-w-[140px] shadow-sm"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <p className="text-slate-500 dark:text-gray-300 text-xs font-medium">Energy</p>
          </div>
          <p className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight">
            {energyCount.formattedValue} <span className="text-sm font-normal text-gray-400">kcal</span>
          </p>
          <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{energyChange > 0 ? '+' : ''}{Math.round(energyChange)}%</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

