import { WorkoutExercise } from '@/types/exercise';
import { cn } from '@/utils/cn';

interface SupersetNavigationCardsProps {
  currentExerciseId: string;
  groupExercises: WorkoutExercise[];
  groupType: 'superset' | 'circuit';
  onExerciseClick?: (exerciseId: string) => void;
}

export function SupersetNavigationCards({
  currentExerciseId,
  groupExercises,
  groupType: _groupType,
  onExerciseClick,
}: SupersetNavigationCardsProps) {
  const currentIndex = groupExercises.findIndex((ex) => ex.id === currentExerciseId);
  const currentExercise = groupExercises[currentIndex];

  if (!currentExercise || groupExercises.length === 0) {
    return null;
  }

  const getSetInfo = (exercise: WorkoutExercise) => {
    const completedSets = exercise.sets.filter((s) => s.completed).length;
    const totalSets = exercise.sets.length;
    const currentSet = completedSets + 1;
    return { currentSet, totalSets, completedSets };
  };


  return (
    <div className="w-full overflow-x-auto no-scrollbar pb-2">
      <div className="flex items-center gap-3 w-max pl-4 pr-4">
        {/* Current Exercise */}
        <div className="relative flex flex-col items-start gap-1 p-3 pr-8 rounded-xl bg-surface-light dark:bg-surface-dark border-2 border-primary shadow-lg min-w-[140px]">
          <div className="absolute top-2 right-2 size-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase text-primary tracking-wider">Current</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            {currentExercise.exerciseName}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Set {getSetInfo(currentExercise).currentSet}/{getSetInfo(currentExercise).totalSets}
          </span>
        </div>

        {/* Next and Upcoming Exercises */}
        {groupExercises.slice(currentIndex + 1).map((exercise, idx) => {
          const setInfo = getSetInfo(exercise);
          const isNext = idx === 0;
          
          return (
            <div
              key={exercise.id}
              onClick={() => onExerciseClick?.(exercise.id)}
              className={cn(
                'group relative flex flex-col items-start gap-1 p-3 pr-4 rounded-xl bg-surface-light dark:bg-surface-dark border min-w-[140px] transition-opacity cursor-pointer',
                isNext
                  ? 'border-slate-200 dark:border-white/10 opacity-100'
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              )}
            >
              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                {isNext ? 'Next' : 'Up Next'}
              </span>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-tight">
                {exercise.exerciseName}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Set {setInfo.currentSet}/{setInfo.totalSets}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

