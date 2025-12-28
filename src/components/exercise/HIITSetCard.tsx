import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ArrowRight, Zap, Timer, Repeat, Activity, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkoutSet } from '@/types/exercise';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface HIITSetCardProps {
  setNumber: number;
  set: WorkoutSet;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onLogSet: () => void;
  onAddSet?: () => void;
  disabled?: boolean;
  nextExerciseName?: string;
  isLastInSuperset?: boolean;
  showGroupRestMessage?: boolean;
}

const INTENSITY_LEVELS: Array<{ value: 'low' | 'moderate' | 'high' | 'max'; label: string; color: string }> = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'moderate', label: 'Moderate', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'max', label: 'Max', color: 'red' },
];

export function HIITSetCard({
  setNumber,
  set,
  onUpdate,
  onLogSet,
  onAddSet,
  disabled = false,
  nextExerciseName,
  isLastInSuperset = false,
  showGroupRestMessage = false,
}: HIITSetCardProps) {
  const [workDuration, setWorkDuration] = useState(() => (set.workDuration || set.duration || 0).toString());
  const [restDuration, setRestDuration] = useState(() => (set.restTime || 0).toString());
  const [rounds, setRounds] = useState(() => (set.rounds || 1).toString());
  const [heartRate, setHeartRate] = useState(() => (set.heartRate || '').toString());
  const [intensityLevel, setIntensityLevel] = useState<'low' | 'moderate' | 'high' | 'max' | undefined>(
    set.intensityLevel || undefined
  );
  const [isNewSet, setIsNewSet] = useState(false);
  const [showButtonAnimation, setShowButtonAnimation] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
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

    if (set.workDuration !== undefined) {
      setWorkDuration(set.workDuration.toString());
    } else if (set.duration !== undefined) {
      setWorkDuration(set.duration.toString());
    }
    if (set.restTime !== undefined) {
      setRestDuration(set.restTime.toString());
    }
    if (set.rounds !== undefined) {
      setRounds(set.rounds.toString());
    }
    if (set.heartRate !== undefined) {
      setHeartRate(set.heartRate.toString());
    }
    if (set.intensityLevel) {
      setIntensityLevel(set.intensityLevel);
    }
  }, [set.workDuration, set.duration, set.restTime, set.rounds, set.heartRate, set.intensityLevel, setNumber]);

  const shouldReduceMotion = prefersReducedMotion();

  const handleWorkDurationChange = (value: string) => {
    setWorkDuration(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ workDuration: numValue, duration: numValue });
  };

  const handleRestDurationChange = (value: string) => {
    setRestDuration(value);
    const numValue = parseInt(value) || 0;
    onUpdate({ restTime: numValue });
  };

  const handleRoundsChange = (value: string) => {
    setRounds(value);
    const numValue = parseInt(value) || 1;
    onUpdate({ rounds: numValue });
  };

  const handleHeartRateChange = (value: string) => {
    setHeartRate(value);
    const numValue = parseInt(value) || undefined;
    onUpdate({ heartRate: numValue });
  };

  const handleIntensityChange = (level: 'low' | 'moderate' | 'high' | 'max') => {
    setIntensityLevel(level);
    onUpdate({ intensityLevel: level });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const workDurationNum = parseInt(workDuration) || 0;
  const restDurationNum = parseInt(restDuration) || 0;
  const roundsNum = parseInt(rounds) || 1;
  const canLogSet = workDurationNum > 0 && roundsNum > 0;

  return (
    <div className="relative mt-2 flex flex-col rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-1 shadow-lg border-2 border-orange-200/50 dark:border-orange-800/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 relative">
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
                  className="absolute w-2 h-2 rounded-full bg-orange-500"
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
          className="text-orange-900 dark:text-orange-100 tracking-tight text-xl font-bold relative z-10 flex items-center gap-2"
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
          <Zap className="w-5 h-5" />
          ROUND {setNumber}
        </motion.h2>
      </div>

      {/* Main Inputs */}
      <div className="px-4 py-3 space-y-4">
        {/* Work Duration */}
        <label className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-orange-700 dark:text-orange-300 text-xs font-medium uppercase tracking-wide">
              Work Duration (seconds)
            </span>
          </div>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={workDuration}
            onChange={(e) => handleWorkDurationChange(e.target.value)}
            disabled={disabled}
            placeholder="0"
            className="rounded-xl bg-white dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 text-center text-3xl font-bold text-orange-900 dark:text-orange-100 h-20 focus:ring-0 transition-all placeholder:text-orange-300 dark:placeholder:text-orange-600"
          />
          {workDurationNum > 0 && (
            <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-1">
              {formatTime(workDurationNum)}
            </p>
          )}
        </label>

        {/* Rest Duration */}
        <label className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Timer className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-orange-700 dark:text-orange-300 text-xs font-medium uppercase tracking-wide">
              Rest Duration (seconds)
            </span>
          </div>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={restDuration}
            onChange={(e) => handleRestDurationChange(e.target.value)}
            disabled={disabled}
            placeholder="0"
            className="rounded-xl bg-white dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 text-center text-3xl font-bold text-orange-900 dark:text-orange-100 h-20 focus:ring-0 transition-all placeholder:text-orange-300 dark:placeholder:text-orange-600"
          />
          {restDurationNum > 0 && (
            <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-1">
              {formatTime(restDurationNum)}
            </p>
          )}
        </label>

        {/* Rounds */}
        <label className="flex flex-col">
          <div className="flex items-center gap-2 pb-2">
            <Repeat className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            <span className="text-orange-700 dark:text-orange-300 text-xs font-medium uppercase tracking-wide">
              Rounds
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const newRounds = Math.max(1, roundsNum - 1);
                handleRoundsChange(newRounds.toString());
              }}
              disabled={disabled || roundsNum <= 1}
              className="w-12 h-12 rounded-lg bg-white dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 dark:hover:bg-orange-900/50 transition-all"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={rounds}
              onChange={(e) => handleRoundsChange(e.target.value)}
              disabled={disabled}
              className="flex-1 rounded-xl bg-white dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 text-center text-3xl font-bold text-orange-900 dark:text-orange-100 h-20 focus:ring-0 transition-all"
            />
            <button
              type="button"
              onClick={() => {
                const newRounds = roundsNum + 1;
                handleRoundsChange(newRounds.toString());
              }}
              disabled={disabled}
              className="w-12 h-12 rounded-lg bg-white dark:bg-orange-950/50 border-2 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 font-bold text-xl hover:bg-orange-50 dark:hover:bg-orange-900/50 transition-all"
            >
              +
            </button>
          </div>
        </label>

        {/* Optional Fields Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Heart Rate */}
          <label className="flex flex-col">
            <div className="flex items-center gap-1 pb-1">
              <Activity className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-400 text-[10px] font-medium uppercase">
                HR (BPM)
              </span>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max="250"
              value={heartRate}
              onChange={(e) => handleHeartRateChange(e.target.value)}
              disabled={disabled}
              placeholder="--"
              className="rounded-lg bg-white dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 text-center text-lg font-semibold text-orange-900 dark:text-orange-100 h-12 focus:ring-0 transition-all"
            />
          </label>

          {/* Intensity Level */}
          <label className="flex flex-col">
            <div className="flex items-center gap-1 pb-1">
              <TrendingUp className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-400 text-[10px] font-medium uppercase">
                Intensity
              </span>
            </div>
            <select
              value={intensityLevel || ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleIntensityChange(e.target.value as 'low' | 'moderate' | 'high' | 'max');
                }
              }}
              disabled={disabled}
              className="rounded-lg bg-white dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-400 text-center text-sm font-semibold text-orange-900 dark:text-orange-100 h-12 focus:ring-0 transition-all"
            >
              <option value="">--</option>
              {INTENSITY_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Total Time Display */}
        {workDurationNum > 0 && roundsNum > 0 && (
          <div className="rounded-xl bg-orange-100 dark:bg-orange-900/50 p-3 border border-orange-200 dark:border-orange-800">
            <div className="text-center">
              <span className="text-orange-600 dark:text-orange-400 text-xs font-medium uppercase tracking-wide">
                Total Time
              </span>
              <p className="text-orange-900 dark:text-orange-100 text-xl font-bold mt-1">
                {formatTime((workDurationNum + restDurationNum) * roundsNum)}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                ({roundsNum} rounds × {formatTime(workDurationNum + restDurationNum)})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Log Button */}
      <div className="p-2 relative">
        {showParticles && !shouldReduceMotion && (
          <>
            {[...Array(6)].map((_, i) => {
              const angle = (i * 360) / 6;
              const radius = 50;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;
              return (
                <motion.div
                  key={`button-sparkle-${i}`}
                  className="absolute w-1.5 h-1.5 rounded-full bg-orange-500"
                  style={{ left: '50%', top: '50%', x: 0, y: 0 }}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 2, 0],
                    opacity: [0, 0.9, 0],
                    x: [0, x, x * 1.3],
                    y: [0, y, y * 1.3],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 0.9,
                    times: [0, 0.5, 1],
                    ease: 'easeOut',
                    delay: 0.25 + (i * 0.05),
                  }}
                />
              );
            })}
          </>
        )}
        
        <motion.button
          key={`button-${setNumber}`}
          onClick={onLogSet}
          disabled={!canLogSet || disabled}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl h-14 shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all relative z-10',
            canLogSet && !disabled
              ? 'bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          )}
          initial={false}
          animate={showButtonAnimation && !shouldReduceMotion ? {
            scale: [1, 0.85, 1.08, 0.98, 1],
            opacity: [1, 0.5, 1, 1, 1],
            y: [0, 12, -4, 1, 0],
          } : {}}
          transition={showButtonAnimation && !shouldReduceMotion ? {
            duration: 0.9,
            times: [0, 0.25, 0.5, 0.75, 1],
            ease: [0.34, 1.56, 0.64, 1],
            delay: 0.25,
          } : {}}
          whileHover={canLogSet && !disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
          whileTap={canLogSet && !disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
        >
          {nextExerciseName && !isLastInSuperset ? (
            <>
              <motion.span className="text-lg font-bold tracking-wide uppercase">
                Next: {nextExerciseName}
              </motion.span>
              <ArrowRight className="w-6 h-6 font-bold" />
            </>
          ) : (
            <>
              <CheckCircle className="w-6 h-6 font-bold" />
              <motion.span className="text-lg font-bold tracking-wide uppercase">
                Log Round
              </motion.span>
            </>
          )}
        </motion.button>
        {showGroupRestMessage && nextExerciseName && (
          <p className="text-center text-[10px] text-orange-600 dark:text-orange-400 mt-2">
            Logging will start group rest timer
          </p>
        )}
        {onAddSet && (
          <motion.button
            onClick={onAddSet}
            disabled={disabled}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl h-12 mt-3 border-2 transition-all',
              !disabled
                ? 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 active:scale-[0.98]'
                : 'border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
            whileHover={!disabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
            whileTap={!disabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
          >
            <span className="text-sm font-semibold tracking-wide">Add Round</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

