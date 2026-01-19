import { useState } from 'react';
import { Clock, Dumbbell, MoreHorizontal, Play, Calendar } from 'lucide-react';
import { PlannedWorkout, TemplateCategory } from '@/types/workout';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { isToday, format } from 'date-fns';

interface PlannedWorkoutCardProps {
  plannedWorkout: PlannedWorkout;
  onStart: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const categoryColors: Record<TemplateCategory, string> = {
  strength: 'border-primary',
  hypertrophy: 'border-primary',
  cardio: 'border-blue-400',
  home: 'border-purple-400',
  flexibility: 'border-purple-400',
};

const categoryBadgeColors: Record<TemplateCategory, string> = {
  strength: 'bg-primary/20 text-primary',
  hypertrophy: 'bg-primary/20 text-primary',
  cardio: 'bg-blue-500/20 text-blue-400',
  home: 'bg-purple-500/20 text-purple-400',
  flexibility: 'bg-purple-500/20 text-purple-400',
};

export function PlannedWorkoutCard({
  plannedWorkout,
  onStart,
  onEdit,
  onDelete,
}: PlannedWorkoutCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const borderColor = categoryColors[plannedWorkout.category] || 'border-primary';
  const badgeColor = categoryBadgeColors[plannedWorkout.category] || 'bg-primary/20 text-primary';

  const getCategoryLabel = (category: TemplateCategory): string => {
    const labels: Record<TemplateCategory, string> = {
      strength: 'Strength',
      hypertrophy: 'Hypertrophy',
      cardio: 'Cardio',
      home: 'Home Workout',
      flexibility: 'Flexibility',
    };
    return labels[category] || 'Workout';
  };

  const getMuscleInitials = (muscles: string[]): string[] => {
    return muscles.slice(0, 3).map((muscle) => {
      const words = muscle.split(' ');
      if (words.length > 1) {
        return words.map((w) => w[0].toUpperCase()).join('');
      }
      return muscle.substring(0, 2).toUpperCase();
    });
  };

  const scheduledDate = new Date(plannedWorkout.scheduledDate);
  const isScheduledToday = isToday(scheduledDate);
  const dateDisplay = isScheduledToday 
    ? 'Today' 
    : format(scheduledDate, 'MMM d, yyyy');

  return (
    <motion.div
      className={cn(
        'group relative bg-surface-dark hover:bg-surface-dark/80 transition-all rounded-2xl p-4 border-l-4 shadow-lg shadow-black/20',
        borderColor
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <span
            className={cn(
              'inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-2 uppercase tracking-wide',
              badgeColor
            )}
          >
            {getCategoryLabel(plannedWorkout.category)}
          </span>
          <h4 className="text-lg font-bold text-white leading-tight">
            {plannedWorkout.workoutName}
          </h4>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-surface-dark border border-white/10 rounded-lg shadow-lg z-10 min-w-[120px]">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span className={cn(isScheduledToday && 'font-bold text-primary')}>
            {dateDisplay}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{plannedWorkout.estimatedDuration} min</span>
        </div>
        <div className="flex items-center gap-1">
          <Dumbbell className="w-4 h-4" />
          <span>{plannedWorkout.exercises.length} exercises</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
        <div className="flex -space-x-2">
          {getMuscleInitials(plannedWorkout.musclesTargeted).map((initial, index) => (
            <div
              key={index}
              className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white font-bold border border-surface-dark"
              title={plannedWorkout.musclesTargeted[index]}
            >
              {initial}
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-primary text-background-dark text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          <Play className="w-4 h-4" />
          Start
        </button>
      </div>
    </motion.div>
  );
}

