import { useRestTimer } from '@/hooks/useRestTimer';

interface GroupRestTimerProps {
  duration: number; // seconds
  onComplete: () => void;
  onSkip: () => void;
  isVisible: boolean;
  groupType?: 'superset' | 'circuit';
}

export function GroupRestTimer({
  duration,
  onComplete,
  onSkip,
  isVisible,
  groupType = 'superset',
}: GroupRestTimerProps) {
  const { remaining, formattedTime, isPaused, pause, resume, addTime } = useRestTimer({
    duration,
    autoStart: true,
    onComplete,
  });
  const progressPercentage = (remaining / duration) * 100;
  const dashArray = `${progressPercentage}, 100`;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-xl bg-slate-800/50 dark:bg-black/40 border border-slate-700/50 dark:border-white/10 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="relative size-12 flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90 text-orange-500" viewBox="0 0 36 36">
              <path
                className="text-slate-700 dark:text-white/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              ></path>
              <path
                className="text-orange-500 drop-shadow-[0_0_4px_rgba(249,115,22,0.5)]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={dashArray}
                strokeWidth="4"
              ></path>
            </svg>
            <span className="material-symbols-outlined text-orange-500 text-xl">timer</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-300 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">
              {groupType === 'superset' ? 'Group Rest' : 'Circuit Rest'}
            </span>
            <span className="text-slate-100 dark:text-white text-2xl font-display font-bold tabular-nums">
              {formattedTime}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={isPaused ? resume : pause}
            className="h-10 w-10 rounded-lg bg-slate-700 dark:bg-white/10 text-white hover:bg-slate-600 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            <span className="material-symbols-outlined text-lg">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => addTime(30)}
          className="h-10 w-12 rounded-lg bg-slate-700 dark:bg-white/10 text-white font-medium hover:bg-slate-600 dark:hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Add 30 seconds"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span className="text-xs">30</span>
        </button>
        <button
          onClick={onSkip}
          className="h-10 px-4 rounded-lg bg-slate-700 dark:bg-white/10 text-white text-sm font-medium hover:bg-slate-600 dark:hover:bg-white/20 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

