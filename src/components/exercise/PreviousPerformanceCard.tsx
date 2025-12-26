import { WorkoutSet } from '@/types/exercise';
import { PreviousWorkoutData } from '@/services/workoutHistoryService';
import { formatWorkoutDate, formatWeightReps, formatSetsForGrid } from '@/utils/workoutHistoryHelpers';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PreviousPerformanceCardProps {
  previousWorkout: PreviousWorkoutData | null;
  currentSetNumber: number;
  onBeatLast?: () => void;
}

export function PreviousPerformanceCard({
  previousWorkout,
  currentSetNumber,
  onBeatLast,
}: PreviousPerformanceCardProps) {
  if (!previousWorkout || previousWorkout.sets.length === 0) {
    return null;
  }

  const formattedSets = formatSetsForGrid(previousWorkout.sets);
  const maxSets = Math.max(formattedSets.length, 3); // Show at least 3 columns

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Previous Performance
        </h3>
        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {formatWorkoutDate(previousWorkout.date)}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-[#316847] bg-surface-light dark:bg-surface-dark shadow-sm">
        <div
          className={cn(
            'grid divide-x divide-slate-100 dark:divide-white/5',
            `grid-cols-${maxSets}`
          )}
          style={{
            gridTemplateColumns: `repeat(${maxSets}, 1fr)`,
          }}
        >
          {Array.from({ length: maxSets }, (_, index) => {
            const setNumber = index + 1;
            const set = formattedSets.find((s) => s.setNumber === setNumber);
            const isHighlighted = setNumber === currentSetNumber;

            return (
              <div
                key={setNumber}
                className={cn(
                  'flex flex-col items-center justify-center py-3 px-2',
                  isHighlighted &&
                    'bg-primary/5 dark:bg-primary/5'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] uppercase font-bold mb-1 flex items-center gap-1',
                    isHighlighted
                      ? 'text-primary'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  Set {setNumber}
                  {isHighlighted && (
                    <TrendingUp className="w-2.5 h-2.5" />
                  )}
                </span>
                <div className="flex items-baseline gap-1">
                  {set ? (
                    <>
                      <span
                        className={cn(
                          'text-lg font-bold',
                          isHighlighted
                            ? 'text-primary'
                            : 'text-slate-700 dark:text-slate-200'
                        )}
                      >
                        {set.weight || 0}kg
                      </span>
                      <span className="text-xs text-slate-400">
                        ×{set.reps || 0}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-500">
                      -
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="flex size-1.5 rounded-full bg-primary"></span>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {(() => {
                const currentSet = formattedSets.find(
                  (s) => s.setNumber === currentSetNumber
                );
                if (currentSet) {
                  return formatWeightReps(currentSet.weight, currentSet.reps);
                }
                return 'No previous data for this set';
              })()}
            </span>
          </div>
          {onBeatLast && (
            <button
              onClick={onBeatLast}
              className="flex items-center gap-1 rounded-md bg-slate-200 dark:bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Beat Last
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

