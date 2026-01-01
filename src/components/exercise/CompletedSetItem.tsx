import { WorkoutSet } from '@/types/exercise';
import { getIntensityLabel } from '@/utils/rpeHelpers';
import { Edit, X } from 'lucide-react';
import { formatPace, calculatePace } from '@/utils/calculations';
import { motion } from 'framer-motion';
import { prefersReducedMotion, setCompleteCelebration } from '@/utils/animations';

interface CompletedSetItemProps {
  set: WorkoutSet;
  unit: 'kg' | 'lbs';
  onEdit?: () => void;
  onCancel?: () => void;
  isCanceling?: boolean;
  isJustCompleted?: boolean;
}

export function CompletedSetItem({
  set,
  unit,
  onEdit,
  onCancel,
  isCanceling = false,
  isJustCompleted = false,
}: CompletedSetItemProps) {
  const shouldReduceMotion = prefersReducedMotion();
  const intensityLabel = set.rpe ? getIntensityLabel(set.rpe) : null;

  // Determine display type based on set data
  const isCardio = set.distance !== undefined || set.time !== undefined;
  const isHIIT = set.workDuration !== undefined || set.rounds !== undefined;
  const isYoga = set.duration !== undefined && !set.weight && !set.reps && !set.distance;

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate pace for cardio
  const pace = isCardio && set.distance && set.time && set.distance > 0
    ? calculatePace(set.time, set.distance, set.distanceUnit || 'km')
    : 0;

  return (
    <motion.div 
      className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-transparent p-3 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-transparent dark:border-white/5"
      variants={shouldReduceMotion ? {} : setCompleteCelebration}
      initial="initial"
      animate={isJustCompleted ? "celebrate" : "initial"}
    >
      <div className="flex items-center gap-4">
        <motion.div 
          className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm"
          animate={isJustCompleted && !shouldReduceMotion ? {
            scale: [1, 1.3, 1],
            rotate: [0, 360],
          } : {}}
          transition={isJustCompleted && !shouldReduceMotion ? {
            duration: 0.6,
            times: [0, 0.7, 1],
            ease: 'easeOut',
          } : {}}
        >
          {set.setNumber}
        </motion.div>
        <div className="flex flex-col">
          {/* Cardio Display */}
          {isCardio && (
            <>
              <span className="text-slate-900 dark:text-white font-medium text-lg">
                {set.distance || 0} {set.distanceUnit || 'km'} {set.time ? `• ${formatTime(set.time)}` : ''}
              </span>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                {pace > 0 && (
                  <span>Pace: {formatPace(pace, set.distanceUnit || 'km')}</span>
                )}
                {set.calories && (
                  <span>• {set.calories} cal</span>
                )}
                {set.heartRate && (
                  <span>• HR: {set.heartRate} bpm</span>
                )}
                {set.steps && (
                  <span>• {set.steps} steps</span>
                )}
              </div>
            </>
          )}
          
          {/* HIIT Display */}
          {isHIIT && (
            <>
              <span className="text-slate-900 dark:text-white font-medium text-lg">
                {set.rounds || 1} round{set.rounds !== 1 ? 's' : ''} • {set.workDuration ? formatTime(set.workDuration) : '0:00'} work
                {set.restTime ? ` / ${formatTime(set.restTime)} rest` : ''}
              </span>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                {set.intensityLevel && (
                  <span className="capitalize">{set.intensityLevel}</span>
                )}
                {set.heartRate && (
                  <span>• HR: {set.heartRate} bpm</span>
                )}
              </div>
            </>
          )}
          
          {/* Yoga Display */}
          {isYoga && (
            <>
              <span className="text-slate-900 dark:text-white font-medium text-lg">
                {set.duration ? formatTime(set.duration) : '0:00'}
              </span>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
                {set.focusAreas && set.focusAreas.length > 0 && (
                  <span>{set.focusAreas.join(', ')}</span>
                )}
                {set.breathWorkType && (
                  <span>• {set.breathWorkType}</span>
                )}
              </div>
            </>
          )}
          
          {/* Strength Display (default) */}
          {!isCardio && !isHIIT && !isYoga && (
            <>
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
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onCancel && (
          <motion.button
            onClick={onCancel}
            disabled={isCanceling}
            className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
            aria-label={`Cancel set ${set.setNumber}`}
            whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.9 } : {}}
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
        {onEdit && (
          <motion.button
            onClick={onEdit}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white transition-colors"
            aria-label={`Edit set ${set.setNumber}`}
            whileHover={!shouldReduceMotion ? { scale: 1.1 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.9 } : {}}
          >
            <Edit className="w-5 h-5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

