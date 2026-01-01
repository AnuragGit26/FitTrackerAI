import { useState } from 'react';
import { AlertCircle, RotateCcw, Save, Trash2, Calendar, Clock, Activity } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Workout } from '@/types/workout';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';
import { useWorkoutStore } from '@/store/workoutStore';
import { clearWorkoutState } from '@/utils/workoutStatePersistence';

interface WorkoutRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveredWorkout: Workout;
  onResume?: () => void;
  onSaveNow?: () => void;
}

export function WorkoutRecoveryModal({
  isOpen,
  onClose,
  recoveredWorkout,
  onResume,
  onSaveNow,
}: WorkoutRecoveryModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const { success, error: showError } = useToast();
  const { finishWorkout } = useWorkoutStore();

  const workoutDate = recoveredWorkout.date instanceof Date 
    ? recoveredWorkout.date 
    : new Date(recoveredWorkout.date);
  
  const exerciseCount = recoveredWorkout.exercises?.length || 0;
  const totalVolume = recoveredWorkout.totalVolume || 0;
  const duration = recoveredWorkout.totalDuration || 0;

  // Check if workout is stale (older than 24 hours)
  const hoursSinceWorkout = (Date.now() - workoutDate.getTime()) / (1000 * 60 * 60);
  const isStale = hoursSinceWorkout > 24;

  const handleResume = () => {
    if (onResume) {
      onResume();
    }
    onClose();
  };

  const handleSaveNow = async () => {
    if (onSaveNow) {
      onSaveNow();
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await finishWorkout(recoveredWorkout.calories);
      success('Workout saved successfully!');
      clearWorkoutState();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      showError(`Failed to save workout: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm('Are you sure you want to discard this workout? This cannot be undone.')) {
      return;
    }

    setIsDiscarding(true);
    try {
      clearWorkoutState();
      success('Workout discarded');
      onClose();
    } catch (err) {
      showError('Failed to discard workout');
    } finally {
      setIsDiscarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Recovered Workout Found"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleResume}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-[#0be060] text-black rounded-xl font-medium transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" />
            Resume Workout
          </button>

          <button
            onClick={handleSaveNow}
            disabled={isSaving || isDiscarding}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Now
              </>
            )}
          </button>

          <button
            onClick={handleDiscard}
            disabled={isSaving || isDiscarding}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {isDiscarding ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Discarding...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Discard
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {isStale && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                This workout is from {Math.round(hoursSinceWorkout)} hours ago
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                You may want to review it before saving.
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {format(workoutDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </div>

          {duration > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {Math.floor(duration / 60)}h {duration % 60}m
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
              {totalVolume > 0 && ` • ${totalVolume.toLocaleString()} kg total volume`}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          This workout was recovered from your previous session. Choose an option above.
        </p>
      </div>
    </Modal>
  );
}

