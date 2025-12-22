import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkoutSet, ExerciseTrackingType, DistanceUnit } from '@/types/exercise';
import { cn } from '@/utils/cn';
import { checkmarkAnimation, prefersReducedMotion } from '@/utils/animations';

interface SetRowProps {
  set: WorkoutSet;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  unit: 'kg' | 'lbs';
  trackingType: ExerciseTrackingType;
  distanceUnit?: DistanceUnit;
  isActive?: boolean;
}

export function SetRow({ set, onUpdate, unit, trackingType, distanceUnit = 'km', isActive = false }: SetRowProps) {
  const [weight, setWeight] = useState(() => (set.weight ?? 0).toString());
  const [reps, setReps] = useState(() => (set.reps ?? 0).toString());
  const [distance, setDistance] = useState(() => (set.distance ?? 0).toString());
  const [time, setTime] = useState(() => {
    if (set.time) {
      const minutes = Math.floor(set.time / 60);
      const seconds = set.time % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return '0:00';
  });
  const [calories, setCalories] = useState(() => (set.calories ?? '').toString());
  const [duration, setDuration] = useState(() => {
    if (set.duration) {
      const minutes = Math.floor(set.duration / 60);
      const seconds = set.duration % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return '0:00';
  });
  const [isCompleted, setIsCompleted] = useState(() => set.completed);

  useEffect(() => {
    setWeight((set.weight ?? 0).toString());
    setReps((set.reps ?? 0).toString());
    setDistance((set.distance ?? 0).toString());
    if (set.time) {
      const minutes = Math.floor(set.time / 60);
      const seconds = set.time % 60;
      setTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    setCalories((set.calories ?? '').toString());
    if (set.duration) {
      const minutes = Math.floor(set.duration / 60);
      const seconds = set.duration % 60;
      setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
    setIsCompleted(set.completed);
  }, [set.setNumber, set.weight, set.reps, set.distance, set.time, set.calories, set.duration, set.completed]);

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

  const handleDistanceChange = (value: string) => {
    setDistance(value);
    const numValue = parseFloat(value) || 0;
    onUpdate({ distance: numValue, distanceUnit });
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    // Parse MM:SS format
    const [minutes, seconds] = value.split(':').map(Number);
    const totalSeconds = (minutes || 0) * 60 + (seconds || 0);
    onUpdate({ time: totalSeconds });
  };

  const handleCaloriesChange = (value: string) => {
    setCalories(value);
    const numValue = value ? parseInt(value) : undefined;
    onUpdate({ calories: numValue });
  };

  const handleDurationChange = (value: string) => {
    setDuration(value);
    // Parse MM:SS format
    const [minutes, seconds] = value.split(':').map(Number);
    const totalSeconds = (minutes || 0) * 60 + (seconds || 0);
    onUpdate({ duration: totalSeconds });
  };

  const handleComplete = () => {
    const newCompleted = !isCompleted;
    setIsCompleted(newCompleted);
    onUpdate({ completed: newCompleted });
  };

  const isDisabled = false; // Allow completing any set, regardless of active state
  const shouldReduceMotion = prefersReducedMotion();
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isCompleted]);

  // Determine grid columns based on tracking type
  const getGridCols = () => {
    switch (trackingType) {
      case 'weight_reps':
        return 'grid-cols-[30px_1fr_1fr_44px]';
      case 'reps_only':
        return 'grid-cols-[30px_1fr_44px]';
      case 'cardio':
        return 'grid-cols-[30px_1fr_1fr_1fr_44px]';
      case 'duration':
        return 'grid-cols-[30px_1fr_44px]';
      default:
        return 'grid-cols-[30px_1fr_1fr_44px]';
    }
  };

  const inputClassName = (isCompleted: boolean) => cn(
    'w-full bg-transparent text-center font-bold text-xl text-gray-900 dark:text-white border-0 border-b focus:ring-0 px-0 py-1 transition-colors',
    isCompleted
      ? 'border-primary/30 focus:border-primary'
      : 'border-gray-200 dark:border-gray-700 focus:border-primary',
    isDisabled && 'text-gray-500 cursor-not-allowed'
  );

  return (
    <motion.div
      className={cn(
        'group relative grid gap-3 items-center rounded-xl p-2 border transition-all',
        getGridCols(),
        isCompleted
          ? 'bg-primary/10 border-primary/30'
          : isActive
            ? 'bg-surface-light dark:bg-surface-dark border-gray-200 dark:border-[#316847] shadow-sm'
            : 'bg-transparent opacity-60'
      )}
      animate={justCompleted && !shouldReduceMotion ? {
        scale: [1, 1.02, 1],
      } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Set number */}
      <div
        className={cn(
          'flex items-center justify-center font-bold',
          isCompleted ? 'text-primary' : 'text-gray-400'
        )}
      >
        {set.setNumber}
      </div>

      {/* Conditional fields based on tracking type */}
      {trackingType === 'weight_reps' && (
        <>
          {/* Weight input */}
          <div className="relative">
            <label htmlFor={`weight-${set.setNumber}`} className="sr-only">
              Weight for set {set.setNumber}
            </label>
            <input
              id={`weight-${set.setNumber}`}
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => handleWeightChange(e.target.value)}
              disabled={isDisabled}
              placeholder="0"
              className={inputClassName(isCompleted)}
              aria-label={`Weight in ${unit} for set ${set.setNumber}`}
            />
            <span className="sr-only">{unit}</span>
          </div>
          {/* Reps input */}
          <div className="relative">
            <label htmlFor={`reps-${set.setNumber}`} className="sr-only">
              Reps for set {set.setNumber}
            </label>
            <input
              id={`reps-${set.setNumber}`}
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => handleRepsChange(e.target.value)}
              disabled={isDisabled}
              placeholder={isDisabled ? '-' : '10'}
              className={inputClassName(isCompleted)}
              aria-label={`Reps for set ${set.setNumber}`}
            />
          </div>
        </>
      )}

      {trackingType === 'reps_only' && (
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => handleRepsChange(e.target.value)}
            disabled={isDisabled}
            placeholder={isDisabled ? '-' : '10'}
            className={inputClassName(isCompleted)}
          />
        </div>
      )}

      {trackingType === 'cardio' && (
        <>
          {/* Distance input */}
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={distance}
              onChange={(e) => handleDistanceChange(e.target.value)}
              disabled={isDisabled}
              placeholder="0"
              className={inputClassName(isCompleted)}
            />
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {distanceUnit}
            </span>
          </div>
          {/* Time input (MM:SS) */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={time}
              onChange={(e) => {
                const value = e.target.value;
                // Allow MM:SS format
                if (/^\d{0,2}:?\d{0,2}$/.test(value) || value === '') {
                  handleTimeChange(value || '0:00');
                }
              }}
              disabled={isDisabled}
              placeholder="0:00"
              className={inputClassName(isCompleted)}
            />
          </div>
          {/* Calories input (optional) */}
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => handleCaloriesChange(e.target.value)}
              disabled={isDisabled}
              placeholder="Cal"
              className={inputClassName(isCompleted)}
            />
          </div>
        </>
      )}

      {trackingType === 'duration' && (
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={duration}
            onChange={(e) => {
              const value = e.target.value;
              // Allow MM:SS format
              if (/^\d{0,2}:?\d{0,2}$/.test(value) || value === '') {
                handleDurationChange(value || '0:00');
              }
            }}
            disabled={isDisabled}
            placeholder="0:00"
            className={inputClassName(isCompleted)}
          />
        </div>
      )}

      {/* Check button */}
      {isDisabled ? (
        <div className="size-11 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700" />
      ) : (
        <motion.button
          onClick={handleComplete}
          className={cn(
            'size-11 flex items-center justify-center rounded-lg shadow-sm hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            isCompleted
              ? 'bg-primary text-background-dark'
              : 'bg-gray-200 dark:bg-[#316847]/50 text-gray-400 hover:bg-primary/20 hover:text-primary'
          )}
          aria-label={isCompleted ? `Mark set ${set.setNumber} as incomplete` : `Mark set ${set.setNumber} as complete`}
          aria-pressed={isCompleted}
          whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
        >
          {isCompleted && justCompleted ? (
            <motion.div
              variants={shouldReduceMotion ? {} : checkmarkAnimation}
              initial="initial"
              animate="animate"
            >
              <Check className="w-5 h-5" />
            </motion.div>
          ) : (
            <Check className="w-5 h-5" />
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

