import { Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { WorkoutExercise } from '@/types/exercise';
import { formatWeight } from '@/utils/calculations';
import { cn } from '@/utils/cn';
import { cardHover, prefersReducedMotion } from '@/utils/animations';

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  unit: 'kg' | 'lbs';
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ExerciseCard = memo(function ExerciseCard({ exercise, unit, onEdit, onDelete }: ExerciseCardProps) {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.div 
      className="bg-white dark:bg-surface-dark rounded-lg border border-gray-100 dark:border-border-dark p-4"
      variants={shouldReduceMotion ? {} : cardHover}
      initial="rest"
      whileHover="hover"
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-gray-100">
            {exercise.exerciseName}
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Total Volume: {formatWeight(exercise.totalVolume, unit)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <motion.button
              onClick={onEdit}
              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
              aria-label="Edit exercise"
              whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              onClick={onDelete}
              className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
              aria-label="Delete exercise"
              whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {exercise.sets.map((set, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded text-sm',
              set.completed
                ? 'bg-primary/10 dark:bg-primary/20'
                : 'bg-gray-50 dark:bg-surface-dark-light/50'
            )}
          >
            <span className="font-medium text-slate-500 dark:text-gray-400">
              Set {set.setNumber}
            </span>
            <span className="text-slate-900 dark:text-gray-100">
              {set.reps} × {set.weight !== undefined ? formatWeight(set.weight, unit) : 'N/A'}
              {set.completed && (
                <span className="ml-2 text-primary">✓</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

