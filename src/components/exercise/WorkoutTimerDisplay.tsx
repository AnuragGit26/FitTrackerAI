import { useWorkoutStore } from '@/store/workoutStore';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';

interface WorkoutTimerDisplayProps {
  className?: string;
}

export function WorkoutTimerDisplay({ className }: WorkoutTimerDisplayProps) {
  const workoutTimerStartTime = useWorkoutStore((state) => state.workoutTimerStartTime);
  const { formattedTime } = useWorkoutDuration(workoutTimerStartTime);

  if (!workoutTimerStartTime) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-lg">
        timer
      </span>
      <span className="text-slate-600 dark:text-slate-300 text-sm font-medium tabular-nums">
        {formattedTime}
      </span>
    </div>
  );
}

