import { Dumbbell, Flame, Zap, TrendingUp, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { calculateStreak, estimateEnergy } from '@/utils/calculations';
import { EmptyState } from '@/components/common/EmptyState';
import { useNavigate } from 'react-router-dom';
import { staggerContainer, slideUp, prefersReducedMotion } from '@/utils/animations';
import { useCountUp } from '@/hooks/useCountUp';
import { hasEnoughWorkoutsForAverages } from '@/utils/analyticsHelpers';
import { logger } from '@/utils/logger';
import { useMemo } from 'react';

export function StatsCarousel() {
  const { workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const navigate = useNavigate();

  // Safe workouts array with fallback
  const safeWorkouts = useMemo(() => {
    try {
      return Array.isArray(workouts) ? workouts : [];
    } catch {
      return [];
    }
  }, [workouts]);

  // Safe profile with fallback
  const safeProfile = useMemo(() => {
    try {
      return profile || null;
    } catch {
      return null;
    }
  }, [profile]);

  // Calculate values with error handling (hooks must be called unconditionally)
  const totalVolumeRaw = useMemo(() => {
    try {
      return safeWorkouts.reduce((sum, w) => {
        const volume = w?.totalVolume;
        return sum + (typeof volume === 'number' && !isNaN(volume) ? volume : 0);
      }, 0);
    } catch {
      return 0;
    }
  }, [safeWorkouts]);
  
  const totalVolume = useMemo(() => {
    try {
      return isNaN(totalVolumeRaw) || !isFinite(totalVolumeRaw) ? 0 : Math.max(0, totalVolumeRaw);
    } catch {
      return 0;
    }
  }, [totalVolumeRaw]);
  
  const workoutDates = useMemo(() => {
    try {
      return safeWorkouts.map(w => {
        try {
          const date = w?.date;
          if (!date) {return null;}
          const dateObj = new Date(date);
          return isNaN(dateObj.getTime()) ? null : dateObj;
        } catch {
          return null;
        }
      }).filter((d): d is Date => d !== null);
    } catch {
      return [];
    }
  }, [safeWorkouts]);

  const streak = useMemo(() => {
    try {
      return calculateStreak(workoutDates);
    } catch (err) {
      logger.warn('[StatsCarousel] Error calculating streak:', err);
      return 0;
    }
  }, [workoutDates]);

  const energyRaw = useMemo(() => {
    try {
      return estimateEnergy(safeWorkouts);
    } catch (err) {
      logger.warn('[StatsCarousel] Error estimating energy:', err);
      return 0;
    }
  }, [safeWorkouts]);

  const energy = useMemo(() => {
    try {
      return isNaN(energyRaw) || !isFinite(energyRaw) ? 0 : Math.max(0, energyRaw);
    } catch {
      return 0;
    }
  }, [energyRaw]);

  // Only calculate change percentages if user has enough workouts for meaningful averages
  const hasEnoughWorkouts = useMemo(() => {
    try {
      return hasEnoughWorkoutsForAverages(safeWorkouts);
    } catch {
      return false;
    }
  }, [safeWorkouts]);
  
  const previousVolumeRaw = useMemo(() => {
    try {
      if (hasEnoughWorkouts && safeWorkouts.length > 1) {
        const halfLength = Math.floor(safeWorkouts.length / 2);
        return safeWorkouts.slice(0, halfLength).reduce((sum, w) => {
          const volume = w?.totalVolume;
          return sum + (typeof volume === 'number' && !isNaN(volume) ? volume : 0);
        }, 0);
      }
      return totalVolume * 0.95;
    } catch {
      return totalVolume * 0.95;
    }
  }, [hasEnoughWorkouts, safeWorkouts, totalVolume]);

  const previousVolume = useMemo(() => {
    try {
      return isNaN(previousVolumeRaw) || !isFinite(previousVolumeRaw) ? 0 : Math.max(0, previousVolumeRaw);
    } catch {
      return 0;
    }
  }, [previousVolumeRaw]);

  const volumeChangeRaw = useMemo(() => {
    try {
      if (hasEnoughWorkouts && previousVolume > 0) {
        const change = ((totalVolume - previousVolume) / previousVolume) * 100;
        return isNaN(change) || !isFinite(change) ? 0 : change;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [hasEnoughWorkouts, previousVolume, totalVolume]);

  const volumeChange = useMemo(() => {
    try {
      return isNaN(volumeChangeRaw) || !isFinite(volumeChangeRaw) ? 0 : volumeChangeRaw;
    } catch {
      return 0;
    }
  }, [volumeChangeRaw]);

  const previousEnergyRaw = useMemo(() => {
    try {
      if (hasEnoughWorkouts && safeWorkouts.length > 1) {
        const halfLength = Math.floor(safeWorkouts.length / 2);
        return estimateEnergy(safeWorkouts.slice(0, halfLength));
      }
      return energy * 0.88;
    } catch (err) {
      logger.warn('[StatsCarousel] Error calculating previous energy:', err);
      return energy * 0.88;
    }
  }, [hasEnoughWorkouts, safeWorkouts, energy]);

  const previousEnergy = useMemo(() => {
    try {
      return isNaN(previousEnergyRaw) || !isFinite(previousEnergyRaw) ? 0 : Math.max(0, previousEnergyRaw);
    } catch {
      return 0;
    }
  }, [previousEnergyRaw]);

  const energyChangeRaw = useMemo(() => {
    try {
      if (hasEnoughWorkouts && previousEnergy > 0) {
        const change = ((energy - previousEnergy) / previousEnergy) * 100;
        return isNaN(change) || !isFinite(change) ? 0 : change;
      }
      return 0;
    } catch {
      return 0;
    }
  }, [hasEnoughWorkouts, previousEnergy, energy]);

  const energyChange = useMemo(() => {
    try {
      return isNaN(energyChangeRaw) || !isFinite(energyChangeRaw) ? 0 : energyChangeRaw;
    } catch {
      return 0;
    }
  }, [energyChangeRaw]);

  // All hooks must be called before any conditional returns
  const shouldReduceMotion = useMemo(() => {
    try {
      return prefersReducedMotion();
    } catch {
      return false;
    }
  }, []);

  // Safe useCountUp hooks - must be called unconditionally
  const volumeCount = useCountUp(totalVolume, 0, { duration: 1.5, decimals: 0 });

  const energyCount = useCountUp(energy, 0, { duration: 1.5, decimals: 0 });

  // Safe navigation handler
  const handleNavigate = () => {
    try {
      navigate('/log-workout');
    } catch (err) {
      logger.error('[StatsCarousel] Navigation error:', err);
      try {
        window.location.href = '/log-workout';
      } catch (fallbackErr) {
        logger.error('[StatsCarousel] Fallback navigation also failed:', fallbackErr);
      }
    }
  };

  // Early return AFTER all hooks
  if (safeWorkouts.length === 0) {
    return (
      <div className="w-full px-5 pb-2">
        <EmptyState
          icon={Dumbbell}
          title="No workouts yet"
          description="Start logging your workouts to see your stats and track your progress."
          action={
            <button
              onClick={handleNavigate}
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
            {volumeCount?.formattedValue || String(Math.round(totalVolume))}{' '}
            <span className="text-sm font-normal text-gray-400">
              {safeProfile?.preferredUnit || 'kg'}
            </span>
          </p>
          {volumeChange !== 0 && (
            <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{volumeChange > 0 ? '+' : ''}{Math.round(volumeChange)}%</span>
            </div>
          )}
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
            {streak} <span className="text-sm font-normal text-gray-400">Workouts</span>
          </p>
          <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
            <Plus className="w-3.5 h-3.5" />
            <span>Active</span>
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
            {energyCount?.formattedValue || String(Math.round(energy))} <span className="text-sm font-normal text-gray-400">kcal</span>
          </p>
          {energyChange !== 0 && (
            <div className="flex items-center gap-1 bg-primary/10 w-fit px-1.5 py-0.5 rounded text-primary text-xs font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{energyChange > 0 ? '+' : ''}{Math.round(energyChange)}%</span>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}

