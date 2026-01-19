import { useState, useEffect, useCallback, memo } from 'react';
import { Timer, Zap, Brain, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Exercise } from '@/types/exercise';
import {
  calculateSmartRestTime,
  formatRestTime,
  getIntensityColor,
  getIntensityBgColor,
  type RestSuggestion,
} from '@/utils/smartRestTimer';
import { cn } from '@/utils/cn';
import { cardStyles } from '@/utils/styleHelpers';
import { typography } from '@/styles/designSystem';

interface SmartRestTimerProps {
  exercise: Exercise;
  lastSetIntensity: number; // RPE 1-10
  muscleRecovery: number; // 0-100%
  workoutFatigue: number; // 0-100
  onComplete?: () => void;
  onDismiss?: () => void;
}

export const SmartRestTimer = memo(function SmartRestTimer({
  exercise,
  lastSetIntensity,
  muscleRecovery,
  workoutFatigue,
  onComplete,
  onDismiss,
}: SmartRestTimerProps) {
  const [suggestion, setSuggestion] = useState<RestSuggestion | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Calculate smart rest time when component mounts or inputs change
  useEffect(() => {
    const restSuggestion = calculateSmartRestTime(
      exercise,
      lastSetIntensity,
      muscleRecovery,
      workoutFatigue
    );
    setSuggestion(restSuggestion);
    setTimeRemaining(restSuggestion.recommendedSeconds);
    setIsRunning(true);
    setIsComplete(false);
  }, [exercise, lastSetIntensity, muscleRecovery, workoutFatigue]);

  // Timer countdown effect
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      if (timeRemaining <= 0 && !isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, isComplete, onComplete]);

  const toggleTimer = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const addTime = useCallback((seconds: number) => {
    setTimeRemaining((prev) => prev + seconds);
    if (!isRunning) {
      setIsRunning(true);
    }
    setIsComplete(false);
  }, [isRunning]);

  const skipRest = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  if (!suggestion) {
    return null;
  }

  const progress = suggestion.recommendedSeconds > 0
    ? ((suggestion.recommendedSeconds - timeRemaining) / suggestion.recommendedSeconds) * 100
    : 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          cardStyles('feature'),
          'relative overflow-hidden',
          isComplete && 'border-2 border-primary shadow-[0_0_20px_rgba(255,153,51,0.3)]'
        )}
      >
        {/* Dismiss button */}
        <button
          onClick={skipRest}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Skip rest"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className={cn(typography.cardTitle, 'text-sm')}>
              Smart Rest Timer
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              AI-optimized recovery
            </p>
          </div>
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4">
          <motion.div
            key={timeRemaining}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className={cn(
              'text-6xl font-bold tabular-nums mb-2',
              isComplete ? 'text-primary' : 'text-slate-900 dark:text-white'
            )}
          >
            {formatRestTime(timeRemaining)}
          </motion.div>
          {isComplete && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-primary font-semibold flex items-center justify-center gap-1"
            >
              <Zap className="w-4 h-4" />
              Ready for next set!
            </motion.p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 w-full rounded-full bg-white dark:bg-surface-dark-light overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isComplete ? 'bg-primary' : 'bg-blue-500'
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* AI Recommendation Badge */}
        <div className={cn(
          'flex items-center gap-2 p-2.5 rounded-lg border mb-4',
          getIntensityBgColor(suggestion.intensity)
        )}>
          <Timer className={cn('w-4 h-4', getIntensityColor(suggestion.intensity))} />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-700 dark:text-gray-300">
              {suggestion.reason}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => addTime(-15)}
            disabled={timeRemaining <= 15}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-surface-dark-light hover:bg-white dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            -15s
          </button>
          <button
            onClick={toggleTimer}
            className="px-3 py-2 rounded-lg bg-primary hover:bg-[#E67E22] text-background-dark transition-colors text-sm font-semibold"
          >
            {isRunning ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => addTime(15)}
            className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-surface-dark-light hover:bg-white dark:hover:bg-surface-dark transition-colors text-sm font-medium"
          >
            +15s
          </button>
        </div>

        {/* Quick Add Options */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => addTime(30)}
            className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
          >
            +30s
          </button>
          <button
            onClick={() => addTime(60)}
            className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
          >
            +1m
          </button>
          <button
            onClick={skipRest}
            className="flex-1 px-2 py-1.5 rounded text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-colors"
          >
            Skip
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
