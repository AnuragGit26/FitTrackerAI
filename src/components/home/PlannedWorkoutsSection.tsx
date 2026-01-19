import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { usePlannedWorkoutStore } from '@/store/plannedWorkoutStore';
import { PlannedWorkoutCard } from '@/components/planner/PlannedWorkoutCard';
import { useWorkoutStore } from '@/store/workoutStore';
import { useToast } from '@/hooks/useToast';
import { addDays, isAfter, startOfDay } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';
import { slideUp, prefersReducedMotion } from '@/utils/animations';
import { logger } from '@/utils/logger';

export function PlannedWorkoutsSection() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { plannedWorkouts, loadPlannedWorkoutsByDateRange } = usePlannedWorkoutStore();
  const { success, error: showError } = useToast();

  // Safe profile with fallback
  const safeProfile = useMemo(() => {
    try {
      return profile || null;
    } catch {
      return null;
    }
  }, [profile]);

  // Safe planned workouts with fallback
  const safePlannedWorkouts = useMemo(() => {
    try {
      return Array.isArray(plannedWorkouts) ? plannedWorkouts : [];
    } catch {
      return [];
    }
  }, [plannedWorkouts]);

  // Load upcoming planned workouts (next 7 days)
  useEffect(() => {
    try {
      if (!safeProfile?.id) {
        return;
      }

      const today = startOfDay(new Date());
      if (isNaN(today.getTime())) {
        logger.warn('[PlannedWorkoutsSection] Invalid today date');
        return;
      }

      const nextWeek = addDays(today, 7);
      if (isNaN(nextWeek.getTime())) {
        logger.warn('[PlannedWorkoutsSection] Invalid nextWeek date');
        return;
      }

      loadPlannedWorkoutsByDateRange(safeProfile.id, today, nextWeek).catch(err => {
        logger.warn('[PlannedWorkoutsSection] Error loading planned workouts:', err);
      });
    } catch (err) {
      logger.error('[PlannedWorkoutsSection] Error in useEffect:', err);
    }
  }, [safeProfile?.id, loadPlannedWorkoutsByDateRange]);

  const upcomingWorkouts = useMemo(() => {
    try {
      const today = startOfDay(new Date());
      if (isNaN(today.getTime())) {
        logger.warn('[PlannedWorkoutsSection] Invalid today date in upcomingWorkouts');
        return [];
      }

      const nextWeek = addDays(today, 7);
      if (isNaN(nextWeek.getTime())) {
        logger.warn('[PlannedWorkoutsSection] Invalid nextWeek date in upcomingWorkouts');
        return [];
      }

      return safePlannedWorkouts
        .filter((pw) => {
          try {
            if (!pw || !pw.scheduledDate) {
              return false;
            }

            const dateObj = new Date(pw.scheduledDate);
            if (isNaN(dateObj.getTime())) {
              return false;
            }
            
            const scheduledDate = startOfDay(dateObj);
            if (isNaN(scheduledDate.getTime())) {
              return false;
            }

            return (
              (isAfter(scheduledDate, today) || scheduledDate.getTime() === today.getTime()) &&
              scheduledDate <= nextWeek &&
              !pw.isCompleted
            );
          } catch (e) {
            logger.warn('[PlannedWorkoutsSection] Invalid date in planned workout:', pw?.id, e);
            return false;
          }
        })
        .sort((a, b) => {
          try {
            const dateA = new Date(a.scheduledDate).getTime();
            const dateB = new Date(b.scheduledDate).getTime();
            if (isNaN(dateA) || isNaN(dateB)) {
              return 0;
            }
            return dateA - dateB;
          } catch {
            return 0;
          }
        })
        .slice(0, 3); // Show max 3 upcoming workouts
    } catch (err) {
      logger.error('[PlannedWorkoutsSection] Error calculating upcoming workouts:', err);
      return [];
    }
  }, [safePlannedWorkouts]);

  const handleStartWorkout = async (plannedWorkout: PlannedWorkout) => {
    try {
      if (!safeProfile?.id || !plannedWorkout?.id) {
        logger.warn('[PlannedWorkoutsSection] Missing profile or planned workout ID');
        return;
      }

      const { startWorkoutFromPlanned } = useWorkoutStore.getState();
      await startWorkoutFromPlanned(plannedWorkout.id);
      success('Workout started!');
      
      try {
        navigate('/log-workout');
      } catch (navErr) {
        logger.error('[PlannedWorkoutsSection] Navigation error:', navErr);
        try {
          window.location.href = '/log-workout';
        } catch (fallbackErr) {
          logger.error('[PlannedWorkoutsSection] Fallback navigation also failed:', fallbackErr);
        }
      }
    } catch (error) {
      logger.error('[PlannedWorkoutsSection] Error starting workout:', error);
      showError(error instanceof Error ? error.message : 'Failed to start workout');
    }
  };

  const handleViewAll = () => {
    try {
      navigate('/planner');
    } catch (err) {
      logger.error('[PlannedWorkoutsSection] Navigation error to planner:', err);
      try {
        window.location.href = '/planner';
      } catch (fallbackErr) {
        logger.error('[PlannedWorkoutsSection] Fallback navigation also failed:', fallbackErr);
      }
    }
  };

  const shouldReduceMotion = useMemo(() => {
    try {
      return prefersReducedMotion();
    } catch {
      return false;
    }
  }, []);

  if (upcomingWorkouts.length === 0) {
    return null;
  }

  return (
    <motion.div
      className="px-5 pb-6"
      variants={shouldReduceMotion ? {} : slideUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider">
            Upcoming Workouts
          </h3>
        </div>
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 text-primary text-sm font-medium hover:underline"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {upcomingWorkouts.map((plannedWorkout) => (
          <PlannedWorkoutCard
            key={plannedWorkout.id}
            plannedWorkout={plannedWorkout}
            onStart={() => handleStartWorkout(plannedWorkout)}
          />
        ))}
      </div>
    </motion.div>
  );
}

