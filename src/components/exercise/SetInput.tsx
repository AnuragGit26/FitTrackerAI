import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { WorkoutSet } from '@/types/exercise';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';

interface SetInputProps {
  set: WorkoutSet;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onDelete: () => void;
  unit: 'kg' | 'lbs';
  previousSet?: WorkoutSet;
}

export function SetInput({ set, onUpdate, onDelete, unit, previousSet }: SetInputProps) {
  const [isCompleted, setIsCompleted] = useState(set.completed);

  const handleComplete = () => {
    const newCompleted = !isCompleted;
    setIsCompleted(newCompleted);
    onUpdate({ completed: newCompleted });
  };

  const incrementWeight = () => {
    const increment = unit === 'kg' ? 2.5 : 5;
    onUpdate({ weight: set.weight + increment });
  };

  const decrementWeight = () => {
    const increment = unit === 'kg' ? 2.5 : 5;
    onUpdate({ weight: Math.max(0, set.weight - increment) });
  };

  const incrementReps = () => {
    onUpdate({ reps: set.reps + 1 });
  };

  const decrementReps = () => {
    onUpdate({ reps: Math.max(1, set.reps - 1) });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isCompleted
          ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      )}
    >
      <div className="flex-shrink-0 w-8 text-center font-semibold text-gray-600 dark:text-gray-400">
        {set.setNumber}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        {/* Weight Input */}
        <div className="flex items-center gap-2">
          <button
            onClick={decrementWeight}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Decrease weight"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {set.weight.toFixed(unit === 'kg' ? 1 : 0)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{unit}</div>
          </div>
          <button
            onClick={incrementWeight}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Increase weight"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Reps Input */}
        <div className="flex items-center gap-2">
          <button
            onClick={decrementReps}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Decrease reps"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {set.reps}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">reps</div>
          </div>
          <button
            onClick={incrementReps}
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Increase reps"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleComplete}
          className={cn(
            'w-6 h-6 rounded border-2 transition-colors',
            isCompleted
              ? 'bg-primary-600 border-primary-600'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
          )}
          aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {isCompleted && (
            <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-error hover:bg-error/10 transition-colors"
          aria-label="Delete set"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

