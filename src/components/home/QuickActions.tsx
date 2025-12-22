import { useNavigate } from 'react-router-dom';
import { History, PlusCircle, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { staggerContainer, slideUp, prefersReducedMotion } from '@/utils/animations';
import { getWorkoutName } from '@/utils/workoutHelpers';

export function QuickActions() {
  const navigate = useNavigate();
  const { workouts } = useWorkoutStore();

  const lastWorkout = workouts.length > 0 ? workouts[0] : null;
  const workoutName = getWorkoutName(lastWorkout);

  const handleRepeatLast = () => {
    if (lastWorkout) {
      navigate('/log-workout', { state: { repeatWorkout: lastWorkout } });
    } else {
      navigate('/log-workout');
    }
  };

  const handleCustomWorkout = () => {
    navigate('/log-workout');
  };

  const handlePlanWorkout = () => {
    navigate('/planner');
  };

  const shouldReduceMotion = prefersReducedMotion();

  return (
    <div className="px-5 pb-6">
      <h3 className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider mb-3">
        Quick Actions
      </h3>
      <motion.div 
        className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
        variants={shouldReduceMotion ? {} : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.button
          onClick={handlePlanWorkout}
          className="flex items-center gap-3 p-3 pr-5 bg-white dark:bg-surface-dark-light rounded-xl border border-gray-100 dark:border-transparent min-w-max shadow-sm"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        >
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-slate-900 dark:text-white font-bold text-sm">Plan Workout</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Schedule ahead</p>
          </div>
        </motion.button>
        <motion.button
          onClick={handleRepeatLast}
          className="flex items-center gap-3 p-3 pr-5 bg-white dark:bg-surface-dark-light rounded-xl border border-gray-100 dark:border-transparent min-w-max shadow-sm"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        >
          <div className="size-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <History className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-slate-900 dark:text-white font-bold text-sm">
              {workoutName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Repeat last</p>
          </div>
        </motion.button>
        <motion.button
          onClick={handleCustomWorkout}
          className="flex items-center gap-3 p-3 pr-5 bg-white dark:bg-surface-dark-light rounded-xl border border-gray-100 dark:border-transparent min-w-max shadow-sm"
          variants={shouldReduceMotion ? {} : slideUp}
          whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
        >
          <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-slate-900 dark:text-white font-bold text-sm">Empty Workout</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Build custom</p>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}

