import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { usePlannedWorkoutStore } from '@/store/plannedWorkoutStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { PlannerHeader } from '@/components/planner/PlannerHeader';
import { CalendarView } from '@/components/planner/CalendarView';
import { DateAgenda } from '@/components/planner/DateAgenda';
import { PlanWorkoutModal } from '@/components/planner/PlanWorkoutModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/hooks/useToast';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';

export function Planner() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const {
    plannedWorkouts,
    selectedDate,
    viewMode,
    isLoading,
    loadPlannedWorkoutsByDateRange,
    setSelectedDate,
    setViewMode,
    deletePlannedWorkout,
  } = usePlannedWorkoutStore();
  const { success, error: showError } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Load planned workouts based on view mode
  useEffect(() => {
    if (!profile?.id) {
    return;
  }

    const loadWorkouts = async () => {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        // custom
        startDate = currentDate;
        endDate = addDays(currentDate, 7);
      }

      await loadPlannedWorkoutsByDateRange(profile.id, startDate, endDate);
    };

    loadWorkouts();
  }, [profile?.id, currentDate, viewMode, loadPlannedWorkoutsByDateRange]);

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

  const handleDeleteWorkout = async (plannedWorkout: PlannedWorkout) => {
    if (!confirm('Are you sure you want to delete this planned workout?')) {
      return;
    }

    try {
      await deletePlannedWorkout(plannedWorkout.id);
      success('Planned workout deleted');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to delete planned workout');
    }
  };

  if (isLoading && plannedWorkouts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-background-light dark:bg-background-dark">
      <PlannerHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSearchClick={() => {}}
        onMoreClick={() => {}}
      />

      <CalendarView
        currentDate={currentDate}
        selectedDate={selectedDate}
        viewMode={viewMode}
        plannedWorkouts={plannedWorkouts}
        onDateSelect={setSelectedDate}
        onCurrentDateChange={setCurrentDate}
      />

      <DateAgenda
        selectedDate={selectedDate}
        plannedWorkouts={plannedWorkouts}
        onStartWorkout={handleStartWorkout}
        onDeleteWorkout={handleDeleteWorkout}
        onAddWorkout={() => setIsPlanModalOpen(true)}
      />

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsPlanModalOpen(true)}
        className="fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full bg-primary text-background-dark shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <PlanWorkoutModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}

