import { useState, useEffect } from 'react';
import { workoutHistoryService, PreviousWorkoutData } from '@/services/workoutHistoryService';
import { useUserStore } from '@/store/userStore';
import { cn } from '@/utils/cn';

interface PreviousWorkoutTableProps {
  exerciseId: string;
  className?: string;
}

export function PreviousWorkoutTable({ exerciseId, className }: PreviousWorkoutTableProps) {
  const { profile } = useUserStore();
  const [previousWorkout, setPreviousWorkout] = useState<PreviousWorkoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !exerciseId) {
      setIsLoading(false);
      return;
    }

    const loadPreviousWorkout = async () => {
      try {
        const data = await workoutHistoryService.getLastWorkoutForExercise(profile.id, exerciseId);
        setPreviousWorkout(data);
      } catch (error) {
        console.error('Failed to load previous workout:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreviousWorkout();
  }, [profile?.id, exerciseId]);

  if (isLoading || !previousWorkout || (previousWorkout.sets ?? []).length === 0) {
    return null;
  }

  const completedSets = (previousWorkout.sets ?? []).filter((s) => s.completed);
  const bestSet = completedSets.reduce((best, set) => {
    const setVolume = (set.weight || 0) * (set.reps || 0);
    const bestVolume = (best.weight || 0) * (best.reps || 0);
    return setVolume > bestVolume ? set : best;
  }, completedSets[0]);

  const summaryText = bestSet
    ? `${completedSets.length} sets @ ${bestSet.weight || 0}kg (Best)`
    : `${completedSets.length} sets`;

  return (
    <details className={cn('group flex flex-col rounded-xl border border-slate-200 dark:border-[#316847] bg-surface-light dark:bg-surface-dark px-4 py-1 shadow-sm', className)}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 py-3 list-none">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400 dark:text-[#90cba8]" style={{ fontSize: '20px' }}>
            history
          </span>
          <p className="text-slate-600 dark:text-slate-200 text-sm font-medium leading-normal">
            Last Time: {summaryText}
          </p>
        </div>
        <span
          className="material-symbols-outlined text-slate-400 dark:text-[#90cba8] transition-transform duration-200 group-open:rotate-180"
          style={{ fontSize: '20px' }}
        >
          expand_more
        </span>
      </summary>
      <div className="pb-3 pt-1 pl-8">
        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
          <thead>
            <tr className="text-xs uppercase tracking-wider">
              <th className="pb-2 font-medium">Set</th>
              <th className="pb-2 font-medium">kg</th>
              <th className="pb-2 font-medium">Reps</th>
              <th className="pb-2 font-medium">RPE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {completedSets.map((set) => (
              <tr key={set.setNumber}>
                <td className="py-1">{set.setNumber}</td>
                <td className="py-1">{set.weight || '-'}</td>
                <td className="py-1">{set.reps || '-'}</td>
                <td className="py-1">{set.rpe ? set.rpe.toFixed(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

