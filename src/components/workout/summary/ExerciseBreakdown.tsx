import { useState } from 'react';
import { ExerciseComparison } from '@/types/workoutSummary';
import { useUserStore } from '@/store/userStore';

interface ExerciseBreakdownProps {
  comparisons: ExerciseComparison[];
}

export function ExerciseBreakdown({ comparisons }: ExerciseBreakdownProps) {
  const { profile } = useUserStore();
  const unit = profile?.preferredUnit ?? 'kg';
  const [openExercises, setOpenExercises] = useState<Set<string>>(
    new Set([comparisons?.[0]?.exerciseId].filter(Boolean) as string[])
  );

  const toggleExercise = (exerciseId: string, e?: React.MouseEvent | React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpenExercises((prev) => {
      const newOpen = new Set(prev);
      if (newOpen.has(exerciseId)) {
        newOpen.delete(exerciseId);
      } else {
        newOpen.add(exerciseId);
      }
      return newOpen;
    });
  };

  const formatSetData = (set: ExerciseComparison['setComparisons'][0]) => {
    if (!set.current.weight && !set.current.reps) return 'N/A';
    const weight = set.current.weight ? `${set.current.weight}${unit}` : '';
    const reps = set.current.reps ? ` x ${set.current.reps}` : '';
    return `${weight}${reps}`;
  };

  const formatPreviousSetData = (set: ExerciseComparison['setComparisons'][0]) => {
    if (!set.previous) return '-';
    const weight = set.previous.weight ? `${set.previous.weight}${unit}` : '';
    const reps = set.previous.reps ? ` x ${set.previous.reps}` : '';
    return `${weight}${reps}` || '-';
  };

  const formatDelta = (set: ExerciseComparison['setComparisons'][0]) => {
    if (!set.delta) return null;
    const parts: string[] = [];
    if (set.delta.weight && set.delta.weight !== 0) {
      parts.push(`${set.delta.weight > 0 ? '+' : ''}${set.delta.weight}${unit}`);
    }
    if (set.delta.reps && set.delta.reps !== 0) {
      parts.push(`${set.delta.reps > 0 ? '+' : ''}${set.delta.reps} rep${Math.abs(set.delta.reps) !== 1 ? 's' : ''}`);
    }
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getVolumeChangeBadge = (comparison: ExerciseComparison) => {
    if (!comparison.volumeChange) return null;
    if (comparison.volumeChange > 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary">
          +{Math.round(comparison.volumeChange)}{unit} Vol
        </span>
      );
    }
    if (comparison.volumeChange === 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-white/10 text-slate-500 dark:text-gray-300">
          Same Vol
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500">
        {Math.round(comparison.volumeChange)}{unit} Vol
      </span>
    );
  };

  const getBestSetText = (comparison: ExerciseComparison) => {
    if (!comparison.bestSet) return null;
    const weight = comparison.bestSet.weight ? `${comparison.bestSet.weight}${unit}` : '';
    const reps = comparison.bestSet.reps ? ` x ${comparison.bestSet.reps}` : '';
    return `${weight}${reps}`;
  };

  if (!comparisons || comparisons.length === 0) {
    return (
      <div className="px-4 pb-6">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No exercise data available
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Exercise Breakdown</h3>
      </div>
      <div className="flex flex-col gap-3">
        {(comparisons ?? []).map((comparison) => {
          const isOpen = openExercises.has(comparison.exerciseId);
          const hasPreviousData = (comparison.setComparisons ?? []).some((s) => s.previous);

          return (
            <details
              key={comparison.exerciseId}
              className="flex flex-col rounded-xl border border-gray-200 dark:border-[#316847] bg-white dark:bg-[#162e21] group overflow-hidden"
              open={isOpen}
            >
              <summary 
                className="flex cursor-pointer items-center justify-between p-4 bg-gray-50 dark:bg-white/5 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 list-none"
                onClick={(e) => {
                  e.preventDefault();
                  toggleExercise(comparison.exerciseId, e);
                }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="size-10 rounded-lg bg-gray-200 dark:bg-[#316847] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-gray-500 dark:text-gray-300">
                      fitness_center
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-white text-sm font-bold leading-tight truncate">
                      {comparison.exerciseName}
                    </p>
                    <p className="text-slate-500 dark:text-gray-400 text-xs">
                      {(comparison.currentSets?.length ?? 0)} Set{(comparison.currentSets?.length ?? 0) !== 1 ? 's' : ''}
                      {comparison.bestSet && ` • Best: ${getBestSetText(comparison)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getVolumeChangeBadge(comparison)}
                  <div
                    className={`text-slate-400 transition-transform duration-300 flex items-center ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </summary>
              <div className="p-4 border-t border-gray-200 dark:border-[#316847] bg-white dark:bg-[#162e21]">
                {hasPreviousData ? (
                  <>
                    {/* Comparison Row Header */}
                    <div className="grid grid-cols-6 text-[10px] uppercase tracking-wider text-slate-400 dark:text-gray-500 font-medium mb-2 pl-2">
                      <div className="col-span-1">Set</div>
                      <div className="col-span-2 text-center">Previous</div>
                      <div className="col-span-2 text-center text-primary">Today</div>
                      <div className="col-span-1 text-right">Delta</div>
                    </div>
                    {/* Sets Data */}
                    <div className="flex flex-col gap-2">
                      {(comparison.setComparisons ?? []).map((set) => (
                        <div
                          key={set.setNumber}
                          className="grid grid-cols-6 items-center bg-gray-50 dark:bg-black/20 rounded p-2 text-xs"
                        >
                          <div className="col-span-1 font-bold text-slate-500 dark:text-gray-400">
                            {set.setNumber}
                          </div>
                          <div className="col-span-2 text-center text-slate-500 dark:text-gray-400">
                            {formatPreviousSetData(set)}
                          </div>
                          <div className="col-span-2 text-center font-bold text-slate-900 dark:text-white">
                            {formatSetData(set)}
                          </div>
                          <div className="col-span-1 text-right font-bold text-primary text-[10px]">
                            {formatDelta(set) || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-gray-400 text-center italic">
                    No previous workout data available for comparison.
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-[#316847] flex justify-between items-center">
                  {comparison.estimated1RM && (
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Est. 1RM:{' '}
                      <span className="text-slate-900 dark:text-white font-medium">
                        {comparison.estimated1RM.toFixed(1)}{unit}
                      </span>
                    </span>
                  )}
                  <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                    View History{' '}
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

