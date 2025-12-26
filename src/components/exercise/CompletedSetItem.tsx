import { WorkoutSet } from '@/types/exercise';
import { getIntensityLabel } from '@/utils/rpeHelpers';
import { cn } from '@/utils/cn';
import { Edit } from 'lucide-react';

interface CompletedSetItemProps {
  set: WorkoutSet;
  unit: 'kg' | 'lbs';
  onEdit?: () => void;
}

export function CompletedSetItem({
  set,
  unit,
  onEdit,
}: CompletedSetItemProps) {
  const intensityLabel = set.rpe ? getIntensityLabel(set.rpe) : null;

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-transparent p-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:border-white/5">
      <div className="flex items-center gap-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
          {set.setNumber}
        </div>
        <div className="flex flex-col">
          <span className="text-slate-900 dark:text-white font-medium text-lg">
            {set.weight || 0}{unit}{' '}
            <span className="text-slate-400 mx-1">×</span> {set.reps || 0}
          </span>
          {intensityLabel && (
            <span
              className="text-slate-500 dark:text-slate-400 text-xs"
              style={{ color: intensityLabel.color === 'primary' ? '#0df269' : undefined }}
            >
              RPE {set.rpe?.toFixed(1)} • {intensityLabel.label}
            </span>
          )}
        </div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors"
          aria-label={`Edit set ${set.setNumber}`}
        >
          <Edit className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

