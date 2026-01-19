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

export function PlannedWorkoutsSection() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { plannedWorkouts, loadPlannedWorkoutsByDateRange } = usePlannedWorkoutStore();
  const { success, error: showError } = useToast();

  // Load upcoming planned workouts (next 7 days)
  useEffect(() => {
    if (!profile?.id) {
    return;
  }

    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    loadPlannedWorkoutsByDateRange(profile.id, today, nextWeek);
  }, [profile?.id, loadPlannedWorkoutsByDateRange]);

  const upcomingWorkouts = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    return (plannedWorkouts ?? [])
      .filter((pw) => {
        const dateObj = new Date(pw.scheduledDate);
        if (isNaN(dateObj.getTime())) {return false;}
        
        try {
          const scheduledDate = startOfDay(dateObj);
          return (
            (isAfter(scheduledDate, today) || scheduledDate.getTime() === today.getTime()) &&
            scheduledDate <= nextWeek &&
            !pw.isCompleted
          );
        } catch (e) {
          console.warn('Invalid date in planned workout:', pw.id, e);
          return false;
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledDate).getTime();
        const dateB = new Date(b.scheduledDate).getTime();
        return dateA - dateB;
      })
      .slice(0, 3); // Show max 3 upcoming workouts
  }, [plannedWorkouts]);

  const handleStartWorkout = async (plannedWorkout: PlannedWorkout) => {
    if (!profile?.id) {
    return;
  }

    try {
      const { startWorkoutFromPlanned } = useWorkoutStore.getState();
      await startWorkoutFromPlanned(plannedWorkout.id);
      success('Workout started!');
      navigate('/log-workout');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to start workout');
    }
  };

  const handleViewAll = () => {
    navigate('/planner');
  };

  const shouldReduceMotion = prefersReducedMotion();

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

