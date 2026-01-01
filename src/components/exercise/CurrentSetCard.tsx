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
}: CurrentSetCardProps) {
  const [weight, setWeight] = useState(() => (set.weight !== undefined ? set.weight.toString() : ''));
  const [reps, setReps] = useState(() => (set.reps !== undefined ? set.reps.toString() : ''));
  const [rpe, setRpe] = useState(() => set.rpe ?? 7.5);
  const [isNewSet, setIsNewSet] = useState(false);
  const [showButtonAnimation, setShowButtonAnimation] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const previousSetNumberRef = useRef(setNumber);

  // Sync local state with prop changes (e.g., when moving to a new set)
  useEffect(() => {
    // Update when set number changes (new set) or when prop values differ from local state
    const propWeight = set.weight !== undefined ? set.weight.toString() : '';
    const propReps = set.reps !== undefined ? set.reps.toString() : '';
    
    // Detect new set - trigger animation
    if (setNumber !== previousSetNumberRef.current) {
      setIsNewSet(true);
      setShowButtonAnimation(true);
      setShowParticles(true);
      previousSetNumberRef.current = setNumber;
      // Reset animation flags after animation completes
      setTimeout(() => {
        setIsNewSet(false);
        setShowButtonAnimation(false);
        setShowParticles(false);
      }, 1200);
    }
    
    if (set.setNumber !== setNumber || weight !== propWeight) {
      setWeight(propWeight);
    }
    if (set.setNumber !== setNumber || reps !== propReps) {
      setReps(propReps);
    }
    if (set.rpe !== undefined && set.rpe !== rpe) {
      setRpe(set.rpe);
    }
  }, [set.setNumber, set.weight, set.reps, set.rpe, setNumber, weight, reps, rpe]);

  const weightChangeBadge = calculateWeightChangeBadge(
    weight ? parseFloat(weight) : 0,
    previousWeight
  );

  const shouldReduceMotion = prefersReducedMotion();

  // Determine helper text based on equipment
  const getHelperText = (): string | null => {
    if (!exerciseEquipment || exerciseEquipment.length === 0) return null;
    
    // Check for dumbbell exercises (case-insensitive)
    const hasDumbbells = exerciseEquipment.some(eq => 
      eq.toLowerCase().includes('dumbbell')
    );
    // Check for barbell exercises (case-insensitive)
    const hasBarbell = exerciseEquipment.some(eq => 
      eq.toLowerCase().includes('barbell')
    );
    
    // Prioritize dumbbell message if both are present (shouldn't happen, but just in case)
    if (hasDumbbells) {
      return 'Weight = weight of both dumbbells';
    }
    if (hasBarbell) {
      return 'Total weight = weight of plates + barbell rod';
    }
    
    return null;
  };

  const helperText = getHelperText();

  const handleWeightChange = (value: string) => {
    setWeight(value);
    // Only update if value is valid, otherwise use undefined
    if (value === '' || value === '-' || value === '.') {
      onUpdate({ weight: undefined });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        onUpdate({ weight: numValue });
      }
      // If invalid, keep the display value but don't update the set
    }
  };

  const handleRepsChange = (value: string) => {
    setReps(value);
    // Allow empty string for better UX while typing
    if (value === '' || value === '-') {
      onUpdate({ reps: undefined });
      return;
    }
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate({ reps: numValue });
    }
    // If invalid, keep the display value but don't update the set
  };

  const handleRpeChange = (value: number) => {
    setRpe(value);
    onUpdate({ rpe: value });
  };

  const canLogSet = (set.weight && set.weight > 0) || (set.reps && set.reps > 0);

  const handleLogSetClick = () => {
    if (!canLogSet || disabled) return;
    
    // Trigger celebration animations
    setIsLogging(true);
    setShowRipple(true);
    setShowParticles(true);
    
    // Call the actual log set handler
    onLogSet();
    
    // Reset animation states after animation completes
    setTimeout(() => {
      setIsLogging(false);
      setShowRipple(false);
      setShowParticles(false);
    }, 1200);
  };

  return (
    <div className="relative mt-2 flex flex-col rounded-2xl bg-surface-light dark:bg-surface-dark p-1 shadow-lg border border-slate-100 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 relative">
        {/* Cancel Button - Top Right */}
        {onCancelSet && !disabled && (
          <motion.button
            onClick={onCancelSet}
            className="absolute top-2 right-2 z-20 p-2 rounded-full text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
            aria-label={`Cancel set ${setNumber}`}
            whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.9 } : {}}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
        {/* Particle/Sparkle Effects */}
        {showParticles && !shouldReduceMotion && (
          <>
            {[...Array(8)].map((_, i) => {
              const angle = (i * 360) / 8;
              const radius = 40;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  style={{
                    left: '50%',
                    top: '50%',
                    x: 0,
                    y: 0,
                  }}
                  initial={{
                    scale: 0,
                    opacity: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                    x: [0, x, x * 1.5],
                    y: [0, y, y * 1.5],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 1.0,
                    times: [0, 0.5, 1],
                    ease: 'easeOut',
                    delay: i * 0.05,
                  }}
                />
              );
            })}
          </>
        )}
        
        <motion.h2
          key={setNumber}
          className="text-slate-900 dark:text-white tracking-tight text-xl font-bold relative z-10"
          initial={false}
          animate={isNewSet && !shouldReduceMotion ? {
            scale: [1, 0.8, 1.3, 0.95, 1.02, 1],
            opacity: [1, 0.4, 1, 1, 1, 1],
            rotate: [0, -12, 8, -2, 1, 0],
            y: [0, -15, 5, -1, 0, 0],
            color: ['currentColor', '#0df269', '#0df269', '#0df269', 'currentColor', 'currentColor'],
            filter: [
              'drop-shadow(0 0 0px rgba(13, 242, 105, 0))',
              'drop-shadow(0 0 15px rgba(13, 242, 105, 0.6))',
              'drop-shadow(0 0 30px rgba(13, 242, 105, 0.9)) drop-shadow(0 0 50px rgba(13, 242, 105, 0.6)) drop-shadow(0 0 80px rgba(13, 242, 105, 0.3))',
              'drop-shadow(0 0 20px rgba(13, 242, 105, 0.4))',
              'drop-shadow(0 0 10px rgba(13, 242, 105, 0.2))',
              'drop-shadow(0 0 0px rgba(13, 242, 105, 0))',
            ],
          } : {
            scale: 1,
            opacity: 1,
            rotate: 0,
            y: 0,
            color: 'currentColor',
            filter: 'drop-shadow(0 0 0px rgba(13, 242, 105, 0))',
          }}
          transition={isNewSet && !shouldReduceMotion ? {
            duration: 1.0,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            ease: [0.34, 1.56, 0.64, 1],
          } : {}}
          onAnimationComplete={() => {
            if (isNewSet) {
              setIsNewSet(false);
            }
          }}
        >
          SET {setNumber}
        </motion.h2>
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
              placeholder=""
              type="number"
              value={weight}
              onChange={(e) => handleWeightChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          {helperText && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1.5 font-medium leading-tight">
              {helperText}
            </p>
          )}
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
              placeholder=""
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
      <div className="p-2 relative overflow-hidden">
        {/* Celebration Particle Effects */}
        {showParticles && !shouldReduceMotion && (
          <>
            {[...Array(12)].map((_, i) => {
              const angle = (i * 360) / 12;
              const radius = 60;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <motion.div
                  key={`celebration-particle-${i}`}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  style={{
                    left: '50%',
                    top: '50%',
                    x: 0,
                    y: 0,
                  }}
                  initial={{
                    scale: 0,
                    opacity: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={isLogging ? {
                    scale: [0, 1.8, 0],
                    opacity: [0, 1, 0],
                    x: [0, x, x * 1.5],
                    y: [0, y, y * 1.5],
                    rotate: [0, 180, 360],
                  } : {}}
                  transition={{
                    duration: 1.2,
                    times: [0, 0.5, 1],
                    ease: 'easeOut',
                    delay: i * 0.03,
                  }}
                />
              );
            })}
          </>
        )}
        
        {/* Ripple Effect */}
        {showRipple && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-primary/30"
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{
              scale: [0, 2, 3],
              opacity: [0.8, 0.4, 0],
            }}
            transition={{
              duration: 0.6,
              times: [0, 0.5, 1],
              ease: 'easeOut',
            }}
            style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
          />
        )}
        
        <motion.button
          key={`button-${setNumber}`}
          onClick={handleLogSetClick}
          disabled={!canLogSet || disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(13,242,105,0.15)] transition-all relative z-10 overflow-hidden',
            canLogSet && !disabled
              ? 'bg-primary hover:bg-[#0be060] text-[#102217] active:scale-[0.98]'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
          initial={false}
          animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
            scale: [1, 0.85, 1.12, 1.02, 1],
            opacity: [1, 0.6, 1, 1, 1],
            y: [0, 12, -6, 2, 0],
            boxShadow: [
              '0 0 20px rgba(13,242,105,0.15)',
              '0 0 15px rgba(13,242,105,0.2)',
              '0 0 60px rgba(13,242,105,0.7), 0 0 100px rgba(13,242,105,0.5), 0 0 140px rgba(13,242,105,0.3)',
              '0 0 40px rgba(13,242,105,0.4)',
              '0 0 20px rgba(13,242,105,0.15)',
            ],
          } : {
            scale: 1,
            opacity: 1,
            y: 0,
            boxShadow: '0 0 20px rgba(13,242,105,0.15)',
          }}
          transition={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
            duration: 1.0,
            times: [0, 0.2, 0.5, 0.8, 1],
            ease: [0.34, 1.56, 0.64, 1],
            delay: isLogging ? 0 : 0.25,
          } : {}}
          whileHover={canLogSet && !disabled && !shouldReduceMotion && !isLogging ? { 
            scale: 1.02,
            boxShadow: '0 0 30px rgba(13,242,105,0.3)',
          } : {}}
          whileTap={canLogSet && !disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
          onAnimationComplete={() => {
            if (showButtonAnimation) {
              setShowButtonAnimation(false);
            }
          }}
        >
          {nextExerciseName && !isLastInSuperset ? (
            <>
              <motion.span 
                className="text-lg font-bold tracking-wide uppercase"
                animate={showButtonAnimation && !shouldReduceMotion ? {
                  scale: [1, 1.15, 1.05, 1],
                  x: [0, 2, 0, 0],
                } : {
                  scale: 1,
                  x: 0,
                }}
                transition={{ 
                  duration: 0.9, 
                  times: [0, 0.3, 0.7, 1],
                  delay: 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                Next: {nextExerciseName}
              </motion.span>
              <motion.div
                animate={showButtonAnimation && !shouldReduceMotion ? {
                  x: [0, 8, -2, 0],
                  scale: [1, 1.2, 1.1, 1],
                  rotate: [0, 15, -5, 0],
                } : {
                  x: 0,
                  scale: 1,
                  rotate: 0,
                }}
                transition={{ 
                  duration: 0.9, 
                  times: [0, 0.3, 0.7, 1],
                  delay: 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <ArrowRight className="w-6 h-6 font-bold" />
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                  scale: [1, 1.5, 1.2, 1],
                  rotate: [0, 25, -10, 0],
                } : {
                  scale: 1,
                  rotate: 0,
                }}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                <CheckCircle className="w-6 h-6 font-bold" />
              </motion.div>
              <motion.span 
                className="text-lg font-bold tracking-wide uppercase"
                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                  scale: [1, 1.15, 1.05, 1],
                  x: [0, 2, 0, 0],
                } : {
                  scale: 1,
                  x: 0,
                }}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0.4,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                Log Set
              </motion.span>
            </>
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
              !disabled
                ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary active:scale-[0.98]'
                : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
            initial={false}
            animate={isNewSet && !shouldReduceMotion ? {
              scale: [1, 1.05, 1],
              y: [0, -2, 0],
            } : {}}
            transition={isNewSet && !shouldReduceMotion ? {
              duration: 0.5,
              times: [0, 0.5, 1],
              ease: 'easeOut',
            } : {}}
            whileHover={!disabled && !shouldReduceMotion ? { 
              scale: 1.02,
              borderColor: 'rgba(13, 242, 105, 0.5)',
            } : {}}
            whileTap={!disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
          >
            <motion.span 
              className="text-sm font-semibold tracking-wide relative z-10"
              animate={isNewSet && !shouldReduceMotion ? {
                scale: [1, 1.1, 1],
              } : {}}
              transition={isNewSet && !shouldReduceMotion ? {
                duration: 0.5,
                times: [0, 0.5, 1],
              } : {}}
            >
              Add Set
            </motion.span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

