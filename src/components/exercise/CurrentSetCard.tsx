import { useState } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { RPESlider } from './RPESlider';
import { WeightChangeBadge } from './WeightChangeBadge';
import { WorkoutSet } from '@/types/exercise';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';
import { calculateWeightChangeBadge } from '@/utils/workoutHistoryHelpers';

interface CurrentSetCardProps {
  setNumber: number;
  set: WorkoutSet;
  unit: 'kg' | 'lbs';
  targetReps?: string;
  previousWeight?: number;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onLogSet: () => void;
  disabled?: boolean;
  nextExerciseName?: string;
  isLastInSuperset?: boolean;
  showGroupRestMessage?: boolean;
}

export function CurrentSetCard({
  setNumber,
  set,
  unit,
  targetReps,
  previousWeight,
  onUpdate,
  onLogSet,
  disabled = false,
  nextExerciseName,
  isLastInSuperset = false,
  showGroupRestMessage = false,
}: CurrentSetCardProps) {
  const [weight, setWeight] = useState(() => (set.weight ?? 0).toString());
  const [reps, setReps] = useState(() => (set.reps ?? 0).toString());
  const [rpe, setRpe] = useState(() => set.rpe ?? 7.5);

  const weightChangeBadge = calculateWeightChangeBadge(
    parseFloat(weight) || 0,
    previousWeight
  );

  const shouldReduceMotion = prefersReducedMotion();

  const handleWeightChange = (value: string) => {
    setWeight(value);
    const numValue = parseFloat(value) || 0;
    onUpdate({ weight: numValue });
  };

  const handleRepsChange = (value: string) => {
    setReps(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ reps: numValue });
  };

  const handleRpeChange = (value: number) => {
    setRpe(value);
    onUpdate({ rpe: value });
  };

  const canLogSet = (set.weight && set.weight > 0) || (set.reps && set.reps > 0);

  return (
    <div className="relative mt-2 flex flex-col rounded-2xl bg-surface-light dark:bg-surface-dark p-1 shadow-lg border border-slate-100 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold">
          SET {setNumber}
        </h2>
        {targetReps && (
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Target: {targetReps} Reps
          </span>
        )}
      </div>

      {/* Inputs */}
      <div className="flex w-full items-start gap-3 px-4 py-2">
        <label className="group flex flex-1 flex-col">
          <div className="flex justify-between items-center pb-2">
            <span className="text-slate-500 dark:text-[#90cba8] text-xs font-medium uppercase tracking-wide">
              Weight ({unit})
            </span>
            {weightChangeBadge && (
              <WeightChangeBadge change={weightChangeBadge.value} />
            )}
          </div>
          <div className="relative">
            <input
              className="w-full rounded-xl bg-slate-100 dark:bg-[#102217] border-2 border-transparent focus:border-primary text-center text-3xl font-bold text-slate-900 dark:text-white h-20 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
              inputMode="decimal"
              placeholder="0"
              type="number"
              value={weight}
              onChange={(e) => handleWeightChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </label>

        <div className="flex h-20 items-center pt-6">
          <span className="text-slate-400 dark:text-slate-600 font-light text-2xl">
            ×
          </span>
        </div>

        <label className="group flex flex-1 flex-col">
          <span className="text-slate-500 dark:text-[#90cba8] text-xs font-medium uppercase tracking-wide pb-2">
            Reps
          </span>
          <div className="relative">
            <input
              className="w-full rounded-xl bg-slate-100 dark:bg-[#102217] border-2 border-transparent focus:border-primary text-center text-3xl font-bold text-slate-900 dark:text-white h-20 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
              inputMode="numeric"
              placeholder="0"
              type="number"
              value={reps}
              onChange={(e) => handleRepsChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        </label>
      </div>

      {/* RPE Slider */}
      <div className="px-6 py-4">
        <RPESlider
          value={rpe}
          onChange={handleRpeChange}
          disabled={disabled}
        />
      </div>

      {/* Log Button */}
      <div className="p-2">
        <motion.button
          onClick={onLogSet}
          disabled={!canLogSet || disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(13,242,105,0.15)] transition-all',
            canLogSet && !disabled
              ? 'bg-primary hover:bg-[#0be060] text-[#102217] active:scale-[0.98]'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
          whileHover={canLogSet && !disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
          whileTap={canLogSet && !disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
        >
          {nextExerciseName && !isLastInSuperset ? (
            <>
              <span className="text-lg font-bold tracking-wide uppercase">Next: {nextExerciseName}</span>
              <ArrowRight className="w-6 h-6 font-bold" />
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 font-bold" />
              <span className="text-lg font-bold tracking-wide uppercase">Log Set</span>
            </>
          )}
        </motion.button>
        {showGroupRestMessage && nextExerciseName && (
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Logging will start group rest timer
          </p>
        )}
      </div>
    </div>
  );
}

