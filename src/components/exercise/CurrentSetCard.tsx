import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, X } from 'lucide-react';
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
  onAddSet?: () => void;
  onCancelSet?: () => void;
  disabled?: boolean;
  nextExerciseName?: string;
  isLastInSuperset?: boolean;
  showGroupRestMessage?: boolean;
  exerciseEquipment?: string[];
  validationError?: string;
  isUnilateral?: boolean;
}

export function CurrentSetCard({
  setNumber,
  set,
  unit,
  targetReps,
  previousWeight,
  onUpdate,
  onLogSet,
  onAddSet,
  onCancelSet,
  disabled = false,
  nextExerciseName,
  isLastInSuperset = false,
  showGroupRestMessage = false,
  exerciseEquipment = [],
  validationError,
  isUnilateral = false,
}: CurrentSetCardProps) {
  const [weight, setWeight] = useState(() => (set.weight !== undefined ? set.weight.toString() : ''));
  const [reps, setReps] = useState(() => (set.reps !== undefined ? set.reps.toString() : ''));
  
  // Side specific states
  const [leftWeight, setLeftWeight] = useState(() => (set.leftWeight !== undefined ? set.leftWeight.toString() : ''));
  const [rightWeight, setRightWeight] = useState(() => (set.rightWeight !== undefined ? set.rightWeight.toString() : ''));
  const [leftReps, setLeftReps] = useState(() => (set.leftReps !== undefined ? set.leftReps.toString() : ''));
  const [rightReps, setRightReps] = useState(() => (set.rightReps !== undefined ? set.rightReps.toString() : ''));
  
  const [rpe, setRpe] = useState(() => set.rpe ?? 7.5);
  const [isNewSet, setIsNewSet] = useState(false);
  const [showButtonAnimation, setShowButtonAnimation] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const previousSetNumberRef = useRef(setNumber);

  // Sync local state with prop changes
  useEffect(() => {
    // Detect new set
    if (setNumber !== previousSetNumberRef.current) {
      setIsNewSet(true);
      setShowButtonAnimation(true);
      setShowParticles(true);
      previousSetNumberRef.current = setNumber;
      setTimeout(() => {
        setIsNewSet(false);
        setShowButtonAnimation(false);
        setShowParticles(false);
      }, 1200);
    }
    
    // Sync main fields
    const propWeight = set.weight !== undefined ? set.weight.toString() : '';
    const propReps = set.reps !== undefined ? set.reps.toString() : '';
    if (set.setNumber !== setNumber || weight !== propWeight) setWeight(propWeight);
    if (set.setNumber !== setNumber || reps !== propReps) setReps(propReps);
    if (set.rpe !== undefined && set.rpe !== rpe) setRpe(set.rpe);

    // Sync side fields
    const propLeftWeight = set.leftWeight !== undefined ? set.leftWeight.toString() : '';
    const propRightWeight = set.rightWeight !== undefined ? set.rightWeight.toString() : '';
    const propLeftReps = set.leftReps !== undefined ? set.leftReps.toString() : '';
    const propRightReps = set.rightReps !== undefined ? set.rightReps.toString() : '';

    if (leftWeight !== propLeftWeight) setLeftWeight(propLeftWeight);
    if (rightWeight !== propRightWeight) setRightWeight(propRightWeight);
    if (leftReps !== propLeftReps) setLeftReps(propLeftReps);
    if (rightReps !== propRightReps) setRightReps(propRightReps);

  }, [set, setNumber]);

  const weightChangeBadge = calculateWeightChangeBadge(
    weight ? parseFloat(weight) : 0,
    previousWeight
  );

  const shouldReduceMotion = prefersReducedMotion();

  // Helper text logic
  const getHelperText = (): string | null => {
    if (!exerciseEquipment || exerciseEquipment.length === 0) return null;
    const hasDumbbells = exerciseEquipment.some(eq => eq.toLowerCase().includes('dumbbell'));
    const hasBarbell = exerciseEquipment.some(eq => eq.toLowerCase().includes('barbell'));
    
    if (hasDumbbells) return 'Weight = weight of both dumbbells';
    if (hasBarbell) return 'Total weight = weight of plates + barbell rod';
    return null;
  };

  const helperText = getHelperText();

  // Unified handler for numeric inputs
  const handleNumericChange = (
    value: string, 
    setter: (val: string) => void, 
    field: keyof WorkoutSet,
    isInteger: boolean = false
  ) => {
    setter(value);
    if (value === '' || value === '-' || value === '.') {
      onUpdate({ [field]: undefined });
    } else {
      const numValue = isInteger ? parseInt(value) : parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onUpdate({ [field]: numValue });
      }
    }
  };

  const handleRpeChange = (value: number) => {
    // Sanitize RPE value - clamp to valid range
    const sanitizedRPE = value < 1 ? 1 : value > 10 ? 10 : value;
    setRpe(sanitizedRPE);
    onUpdate({ rpe: sanitizedRPE });
  };

  // Determine active side mode
  const sideMode = isUnilateral ? (set.sides || 'both') : 'both';

  const handleSideToggle = (mode: 'left' | 'right' | 'both') => {
    onUpdate({ sides: mode });
  };

  // Validation
  const hasValidReps = isUnilateral
    ? (sideMode === 'both' ? (leftReps && parseInt(leftReps) > 0 && rightReps && parseInt(rightReps) > 0) 
       : sideMode === 'left' ? (leftReps && parseInt(leftReps) > 0)
       : (rightReps && parseInt(rightReps) > 0))
    : Boolean(set.reps && set.reps > 0);

  const hasValidWeight = isUnilateral
    ? (sideMode === 'both' ? (leftWeight === '' || parseFloat(leftWeight) >= 0) && (rightWeight === '' || parseFloat(rightWeight) >= 0)
       : sideMode === 'left' ? (leftWeight === '' || parseFloat(leftWeight) >= 0)
       : (rightWeight === '' || parseFloat(rightWeight) >= 0))
    : (set.weight === undefined || set.weight >= 0);

  const canLogSet = hasValidReps && hasValidWeight && !validationError;

  const handleLogSetClick = () => {
    if (!canLogSet || disabled) return;
    setIsLogging(true);
    setShowRipple(true);
    setShowParticles(true);
    onLogSet();
    setTimeout(() => {
      setIsLogging(false);
      setShowRipple(false);
      setShowParticles(false);
    }, 1200);
  };

  const renderInputGroup = (
    label: string,
    weightVal: string, setWeightVal: (v: string) => void, weightField: keyof WorkoutSet,
    repsVal: string, setRepsVal: (v: string) => void, repsField: keyof WorkoutSet,
    sideLabel?: string
  ) => (
    <div className="flex w-full items-start gap-2 px-2 py-2">
      {sideLabel && (
        <div className="flex items-center justify-center w-8 pt-8">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 -rotate-90 whitespace-nowrap">{sideLabel}</span>
        </div>
      )}
      <label className="group flex flex-1 flex-col">
        <div className="flex justify-between items-center pb-1">
          <span className="text-slate-500 dark:text-[#FF9933] text-[10px] font-medium uppercase tracking-wide">
            Weight ({unit})
          </span>
        </div>
        <input
          className="w-full rounded-xl bg-slate-100 dark:bg-[#050505] border-2 border-transparent focus:border-primary text-center text-2xl font-bold text-slate-900 dark:text-white h-16 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
          inputMode="decimal"
          type="number"
          value={weightVal}
          onChange={(e) => handleNumericChange(e.target.value, setWeightVal, weightField)}
          disabled={disabled}
        />
      </label>

      <div className="flex h-16 items-center pt-5">
        <span className="text-slate-400 dark:text-slate-600 font-light text-xl">×</span>
      </div>

      <label className="group flex flex-1 flex-col">
        <span className="text-slate-500 dark:text-[#FF9933] text-[10px] font-medium uppercase tracking-wide pb-1">
          Reps
        </span>
        <input
          className="w-full rounded-xl bg-slate-100 dark:bg-[#050505] border-2 border-transparent focus:border-primary text-center text-2xl font-bold text-slate-900 dark:text-white h-16 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
          inputMode="numeric"
          type="number"
          value={repsVal}
          onChange={(e) => handleNumericChange(e.target.value, setRepsVal, repsField, true)}
          disabled={disabled}
        />
      </label>
    </div>
  );

  return (
    <div className="relative mt-2 flex flex-col rounded-2xl bg-surface-light dark:bg-surface-dark p-1 shadow-lg border border-slate-100 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 relative">
        {onCancelSet && !disabled && (
          <motion.button
            onClick={onCancelSet}
            className="absolute top-2 right-2 z-20 p-2 rounded-full text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.9 } : {}}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
        
        <motion.h2
          key={setNumber}
          className="text-slate-900 dark:text-white tracking-tight text-xl font-bold relative z-10"
          initial={false}
          animate={isNewSet && !shouldReduceMotion ? {
            scale: [1, 0.8, 1.3, 0.95, 1.02, 1],
            color: ['currentColor', '#0df269', '#0df269', '#0df269', 'currentColor', 'currentColor'],
          } : { scale: 1, color: 'currentColor' }}
        >
          SET {setNumber}
        </motion.h2>
        
        {isUnilateral && (
          <div className="flex bg-slate-100 dark:bg-black/20 rounded-lg p-1 ml-auto mr-8">
            {(['left', 'both', 'right'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleSideToggle(mode)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-colors uppercase",
                  sideMode === mode 
                    ? "bg-primary text-[#050505] shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                )}
              >
                {mode === 'both' ? 'L+R' : mode === 'left' ? 'Left' : 'Right'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inputs */}
      {isUnilateral ? (
        <div className="flex flex-col gap-1">
          {(sideMode === 'left' || sideMode === 'both') && 
            renderInputGroup('Left', leftWeight, setLeftWeight, 'leftWeight', leftReps, setLeftReps, 'leftReps', 'LEFT')}
          {(sideMode === 'right' || sideMode === 'both') && 
            renderInputGroup('Right', rightWeight, setRightWeight, 'rightWeight', rightReps, setRightReps, 'rightReps', 'RIGHT')}
        </div>
      ) : (
        // Standard Bilateral Inputs
        <div className="flex w-full items-start gap-3 px-4 py-2">
          <label className="group flex flex-1 flex-col">
            <div className="flex justify-between items-center pb-2">
              <span className="text-slate-500 dark:text-[#FF9933] text-xs font-medium uppercase tracking-wide">
                Weight ({unit})
              </span>
              {weightChangeBadge && <WeightChangeBadge change={weightChangeBadge.value} />}
            </div>
            <input
              className="w-full rounded-xl bg-slate-100 dark:bg-[#050505] border-2 border-transparent focus:border-primary text-center text-3xl font-bold text-slate-900 dark:text-white h-20 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
              inputMode="decimal"
              type="number"
              value={weight}
              onChange={(e) => handleNumericChange(e.target.value, setWeight, 'weight')}
              disabled={disabled}
            />
            {helperText && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1.5 font-medium leading-tight">
                {helperText}
              </p>
            )}
          </label>

          <div className="flex h-20 items-center pt-6">
            <span className="text-slate-400 dark:text-slate-600 font-light text-2xl">×</span>
          </div>

          <label className="group flex flex-1 flex-col">
            <span className="text-slate-500 dark:text-[#FF9933] text-xs font-medium uppercase tracking-wide pb-2">
              Reps
            </span>
            <input
              className="w-full rounded-xl bg-slate-100 dark:bg-[#050505] border-2 border-transparent focus:border-primary text-center text-3xl font-bold text-slate-900 dark:text-white h-20 focus:ring-0 transition-all placeholder:text-slate-300 dark:placeholder:text-white/20"
              inputMode="numeric"
              type="number"
              value={reps}
              onChange={(e) => handleNumericChange(e.target.value, setReps, 'reps', true)}
              disabled={disabled}
            />
            {validationError && (
              <p className="text-xs text-error mt-1 text-center">{validationError}</p>
            )}
          </label>
        </div>
      )}

      {/* RPE Slider */}
      <div className="px-6 py-4">
        <RPESlider value={rpe} onChange={handleRpeChange} disabled={disabled} />
      </div>

      {/* Log Button */}
      <div className="p-2 relative overflow-hidden">
        {showParticles && !shouldReduceMotion && (
          <>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={`p-${i}`}
                className="absolute w-2 h-2 rounded-full bg-primary"
                initial={{ left: '50%', top: '50%', scale: 0, opacity: 0 }}
                animate={isLogging ? {
                  scale: [0, 1.8, 0],
                  opacity: [0, 1, 0],
                  x: [0, Math.cos((i * 30 * Math.PI) / 180) * 90],
                  y: [0, Math.sin((i * 30 * Math.PI) / 180) * 90],
                } : {}}
                transition={{ duration: 1.2 }}
              />
            ))}
          </>
        )}
        
        <motion.button
          onClick={handleLogSetClick}
          disabled={!canLogSet || disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(255,153,51,0.15)] transition-all relative z-10 overflow-hidden',
            canLogSet && !disabled
              ? 'bg-primary hover:bg-[#E67E22] text-[#050505] active:scale-[0.98]'
              : 'bg-white dark:bg-surface-dark-light text-slate-500 cursor-not-allowed'
          )}
          initial={false}
          animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
            scale: [1, 0.85, 1.12, 1.02, 1],
            boxShadow: '0 0 40px rgba(255,153,51,0.4)',
          } : { scale: 1, boxShadow: '0 0 20px rgba(255,153,51,0.15)' }}
        >
          {nextExerciseName && !isLastInSuperset ? (
            <span className="text-lg font-bold tracking-wide uppercase">Next: {nextExerciseName}</span>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 font-bold" />
              <span className="text-lg font-bold tracking-wide uppercase">Log Set</span>
            </div>
          )}
        </motion.button>
        
        {showGroupRestMessage && nextExerciseName && (
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Logging will start group rest timer
          </p>
        )}
        
        {onAddSet && (
          <motion.button
            onClick={onAddSet}
            disabled={disabled}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl h-12 mt-3 border-2 transition-all relative overflow-hidden',
              !disabled ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary' : 'border-gray-100 dark:border-border-dark text-gray-400'
            )}
          >
            <span className="text-sm font-semibold tracking-wide">Add Set</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
