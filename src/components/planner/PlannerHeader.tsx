import { Calendar, Search, MoreVertical } from 'lucide-react';
import { PlannerViewMode } from '@/store/plannedWorkoutStore';
import { cn } from '@/utils/cn';

interface PlannerHeaderProps {
  viewMode: PlannerViewMode;
  onViewModeChange: (mode: PlannerViewMode) => void;
  onSearchClick?: () => void;
  onMoreClick?: () => void;
}

export function PlannerHeader({
  viewMode,
  onViewModeChange,
  onSearchClick,
  onMoreClick,
}: PlannerHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm px-4 pt-6 pb-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-7 h-7 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Planner
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSearchClick}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5 text-slate-900 dark:text-white" />
          </button>
          <button
            onClick={onMoreClick}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-slate-900 dark:text-white" />
          </button>
        </div>
      </div>

      {/* View Toggle (Segmented Buttons) */}
      <div className="flex p-1 bg-surface-dark/10 dark:bg-surface-dark rounded-xl">
        <label className="flex-1 cursor-pointer">
          <input
            className="peer sr-only"
            name="view"
            type="radio"
            value="week"
            checked={viewMode === 'week'}
            onChange={() => onViewModeChange('week')}
          />
          <div
            className={cn(
              'flex items-center justify-center py-2 rounded-lg text-sm font-semibold transition-all',
              viewMode === 'week'
                ? 'bg-white dark:bg-background-dark text-slate-900 dark:text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Week
          </div>
        </label>
        <label className="flex-1 cursor-pointer">
          <input
            className="peer sr-only"
            name="view"
            type="radio"
            value="month"
            checked={viewMode === 'month'}
            onChange={() => onViewModeChange('month')}
          />
          <div
            className={cn(
              'flex items-center justify-center py-2 rounded-lg text-sm font-semibold transition-all',
              viewMode === 'month'
                ? 'bg-white dark:bg-background-dark text-slate-900 dark:text-primary shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            )}
          >
            Month
          </div>
        </label>
      </div>
    </header>
  );
}

