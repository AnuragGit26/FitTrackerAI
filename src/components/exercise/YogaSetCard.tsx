import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, Sparkles, Timer, Target, Wind, BookOpen, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkoutSet } from '@/types/exercise';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface YogaSetCardProps {
  setNumber: number;
  set: WorkoutSet;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onLogSet: () => void;
  onAddSet?: () => void;
  onCancelSet?: () => void;
  disabled?: boolean;
  nextExerciseName?: string;
  isLastInSuperset?: boolean;
  showGroupRestMessage?: boolean;
}

const FOCUS_AREAS = [
  'Flexibility',
  'Strength',
  'Balance',
  'Meditation',
  'Restorative',
  'Core',
  'Hip Opening',
  'Backbend',
  'Forward Fold',
];

const BREATH_WORK_TYPES = [
  'None',
  'Pranayama',
  'Breath Holds',
  'Ujjayi',
  'Kapalabhati',
  'Nadi Shodhana',
  'Bhastrika',
];

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'purple' },
];

export function YogaSetCard({
  setNumber,
  set,
  onUpdate,
  onLogSet,
  onAddSet,
  onCancelSet,
  disabled = false,
  nextExerciseName,
  isLastInSuperset = false,
  showGroupRestMessage = false,
}: YogaSetCardProps) {
  const [durationMinutes, setDurationMinutes] = useState(() => {
    if (set.duration !== undefined && set.duration > 0) {
      return Math.floor(set.duration / 60).toString();
    }
    return '';
  });
  const [durationSeconds, setDurationSeconds] = useState(() => {
    if (set.duration !== undefined && set.duration > 0) {
      return (set.duration % 60).toString().padStart(2, '0');
    }
    return '';
  });
  const [posesSequence, setPosesSequence] = useState(() => set.notes || '');
  const [focusAreas, setFocusAreas] = useState<string[]>(() => set.focusAreas || []);
  const [difficultyLevel, setDifficultyLevel] = useState<'beginner' | 'intermediate' | 'advanced' | undefined>(
    set.notes?.toLowerCase().includes('beginner') ? 'beginner' :
    set.notes?.toLowerCase().includes('intermediate') ? 'intermediate' :
    set.notes?.toLowerCase().includes('advanced') ? 'advanced' : undefined
  );
  const [breathWorkType, setBreathWorkType] = useState<string>(() => set.breathWorkType || '');
  const [isNewSet, setIsNewSet] = useState(false);
  const [showButtonAnimation, setShowButtonAnimation] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [showRipple, setShowRipple] = useState(false);
  const previousSetNumberRef = useRef(setNumber);

  // Sync local state with prop changes
  useEffect(() => {
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

    // Only sync duration from props if it differs from current local state
    if (set.duration !== undefined) {
      const totalSeconds = set.duration;
      const propMinutes = Math.floor(totalSeconds / 60).toString();
      const propSeconds = (totalSeconds % 60).toString().padStart(2, '0');
      if (durationMinutes !== propMinutes || durationSeconds !== propSeconds) {
        setDurationMinutes(propMinutes);
        setDurationSeconds(propSeconds);
      }
    } else if (durationMinutes !== '' || durationSeconds !== '') {
      setDurationMinutes('');
      setDurationSeconds('');
    }
    if (set.notes) {
      setPosesSequence(set.notes);
    }
    if (set.focusAreas) {
      setFocusAreas(set.focusAreas);
    }
    if (set.breathWorkType) {
      setBreathWorkType(set.breathWorkType);
    }
  }, [set.duration, set.notes, set.focusAreas, set.breathWorkType, setNumber, durationMinutes, durationSeconds]);

  const shouldReduceMotion = prefersReducedMotion();

  const handleDurationChange = (minutes: string, seconds: string) => {
    setDurationMinutes(minutes);
    setDurationSeconds(seconds);
    // Parse values - treat empty strings as 0 for calculation
    const minutesNum = minutes === '' ? 0 : (parseInt(minutes) || 0);
    const secondsNum = seconds === '' ? 0 : (parseInt(seconds) || 0);
    const totalSeconds = minutesNum * 60 + secondsNum;
    
    // Always update parent state when user enters values (even if 0)
    // Only use undefined when both fields are truly empty
    if (minutes === '' && seconds === '') {
      onUpdate({ duration: undefined });
    } else {
      onUpdate({ duration: totalSeconds });
    }
  };

  const handlePosesSequenceChange = (value: string) => {
    setPosesSequence(value);
    onUpdate({ notes: value });
  };

  const toggleFocusArea = (area: string) => {
    const newAreas = focusAreas.includes(area)
      ? focusAreas.filter(a => a !== area)
      : [...focusAreas, area];
    setFocusAreas(newAreas);
    onUpdate({ focusAreas: newAreas });
  };

  const handleDifficultyChange = (level: 'beginner' | 'intermediate' | 'advanced') => {
    setDifficultyLevel(level);
    // Store in notes for now, could be a separate field
    onUpdate({ notes: posesSequence });
  };

  const handleBreathWorkChange = (type: string) => {
    setBreathWorkType(type);
    onUpdate({ breathWorkType: type === 'None' ? undefined : type });
  };

  const minutesNum = durationMinutes ? parseInt(durationMinutes) : 0;
  const secondsNum = durationSeconds ? parseInt(durationSeconds) : 0;
  const totalDurationSeconds = minutesNum * 60 + secondsNum;
  const canLogSet = totalDurationSeconds > 0;

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
    <div className="relative mt-2 flex flex-col rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-1 shadow-lg border-2 border-purple-200/50 dark:border-purple-800/50">
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
                  className="absolute w-2 h-2 rounded-full bg-purple-500"
                  style={{ left: '50%', top: '50%', x: 0, y: 0 }}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
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
          className="text-purple-900 dark:text-purple-100 tracking-tight text-xl font-bold relative z-10 flex items-center gap-2"
          initial={false}
          animate={isNewSet && !shouldReduceMotion ? {
            scale: [1, 0.8, 1.3, 0.95, 1.02, 1],
            opacity: [1, 0.4, 1, 1, 1, 1],
          } : {}}
          transition={isNewSet && !shouldReduceMotion ? {
            duration: 1.0,
            times: [0, 0.2, 0.4, 0.6, 0.8, 1],
            ease: [0.34, 1.56, 0.64, 1],
          } : {}}
        >
          <Sparkles className="w-5 h-5" />
          SESSION {setNumber}
        </motion.h2>
      </div>

      {/* Main Inputs */}
      <div className="px-4 py-3 space-y-4">
        {/* Duration Input */}
        <label className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Timer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">
              Duration
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={durationMinutes}
              onChange={(e) => {
                const mins = e.target.value;
                // Allow empty string or valid numbers 0-59
                if (mins === '' || (!isNaN(parseInt(mins)) && parseInt(mins) >= 0 && parseInt(mins) <= 59)) {
                  handleDurationChange(mins, durationSeconds);
                }
              }}
              disabled={disabled}
              placeholder="00"
              className="flex-1 rounded-xl bg-white dark:bg-purple-950/50 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-center text-2xl font-bold text-purple-900 dark:text-purple-100 h-16 focus:ring-0 transition-all"
            />
            <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">:</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="59"
              value={durationSeconds}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string, otherwise pad and validate
                if (value === '') {
                  handleDurationChange(durationMinutes, '');
                } else {
                  const secs = value.padStart(2, '0');
                  if (!isNaN(parseInt(secs)) && parseInt(secs) >= 0 && parseInt(secs) <= 59) {
                    handleDurationChange(durationMinutes, secs);
                  }
                }
              }}
              disabled={disabled}
              placeholder="00"
              className="flex-1 rounded-xl bg-white dark:bg-purple-950/50 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-center text-2xl font-bold text-purple-900 dark:text-purple-100 h-16 focus:ring-0 transition-all"
            />
            <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">(MM:SS)</span>
          </div>
        </label>

        {/* Poses/Sequence */}
        <label className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">
              Poses / Sequence (optional)
            </span>
          </div>
          <textarea
            value={posesSequence}
            onChange={(e) => handlePosesSequenceChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g., Sun Salutation A, Warrior I, II, III..."
            rows={3}
            className="rounded-xl bg-white dark:bg-purple-950/50 border-2 border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-purple-900 dark:text-purple-100 p-3 text-sm focus:ring-0 transition-all resize-none placeholder:text-purple-300 dark:placeholder:text-purple-600"
          />
        </label>

        {/* Focus Areas */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">
              Focus Areas (optional)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleFocusArea(area)}
                disabled={disabled}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  focusAreas.includes(area)
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-white dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/50'
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty & Breath Work Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Difficulty Level */}
          <label className="flex flex-col">
            <div className="flex items-center gap-1 pb-1">
              <Target className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium uppercase">
                Difficulty
              </span>
            </div>
            <select
              value={difficultyLevel || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleDifficultyChange(e.target.value as 'beginner' | 'intermediate' | 'advanced');
                }
              }}
              disabled={disabled}
              className="rounded-lg bg-white dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-center text-sm font-semibold text-purple-900 dark:text-purple-100 h-12 focus:ring-0 transition-all"
            >
              <option value="">--</option>
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          {/* Breath Work */}
          <label className="flex flex-col">
            <div className="flex items-center gap-1 pb-1">
              <Wind className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span className="text-purple-600 dark:text-purple-400 text-[10px] font-medium uppercase">
                Breath Work
              </span>
            </div>
            <select
              value={breathWorkType || 'None'}
              onChange={(e) => handleBreathWorkChange(e.target.value)}
              disabled={disabled}
              className="rounded-lg bg-white dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 focus:border-purple-500 dark:focus:border-purple-400 text-center text-sm font-semibold text-purple-900 dark:text-purple-100 h-12 focus:ring-0 transition-all"
            >
              {BREATH_WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
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
                  className="absolute w-2 h-2 rounded-full bg-purple-500"
                  style={{ left: '50%', top: '50%', x: 0, y: 0 }}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
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
            className="absolute inset-0 rounded-xl bg-purple-500/30"
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
            'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all relative z-10 overflow-hidden',
            canLogSet && !disabled
              ? 'bg-purple-500 hover:bg-purple-600 text-white active:scale-[0.98]'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
          initial={false}
          animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
            scale: [1, 0.85, 1.12, 1.02, 1],
            opacity: [1, 0.6, 1, 1, 1],
            y: [0, 12, -6, 2, 0],
          } : {}}
          transition={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
            duration: 1.0,
            times: [0, 0.2, 0.5, 0.8, 1],
            ease: [0.34, 1.56, 0.64, 1],
            delay: isLogging ? 0 : 0.25,
          } : {}}
          whileHover={canLogSet && !disabled && !shouldReduceMotion && !isLogging ? { 
            scale: 1.02,
            boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)',
          } : {}}
          whileTap={canLogSet && !disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
        >
          {nextExerciseName && !isLastInSuperset ? (
            <>
              <motion.span 
                className="text-lg font-bold tracking-wide uppercase"
                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                  scale: [1, 1.15, 1.05, 1],
                  x: [0, 2, 0, 0],
                } : {}}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                Next: {nextExerciseName}
              </motion.span>
              <motion.div
                animate={(showButtonAnimation || isLogging) && !shouldReduceMotion ? {
                  x: [0, 8, -2, 0],
                  scale: [1, 1.2, 1.1, 1],
                  rotate: [0, 15, -5, 0],
                } : {}}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0,
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
                } : {}}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0,
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
                } : {}}
                transition={{ 
                  duration: 1.0, 
                  times: [0, 0.3, 0.7, 1],
                  delay: isLogging ? 0 : 0,
                  ease: [0.34, 1.56, 0.64, 1],
                }}
              >
                Log Session
              </motion.span>
            </>
          )}
        </motion.button>
        {showGroupRestMessage && nextExerciseName && (
          <p className="text-center text-[10px] text-purple-600 dark:text-purple-400 mt-2">
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
                ? 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 active:scale-[0.98]'
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
              borderColor: 'rgba(168, 85, 247, 0.5)',
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
              Add Session
            </motion.span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

