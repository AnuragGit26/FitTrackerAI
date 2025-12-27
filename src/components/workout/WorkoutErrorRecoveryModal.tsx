import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, X, RefreshCw, Trash2, Calendar, Clock } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { FailedWorkout, getFailedWorkouts, removeFailedWorkout, incrementRetryCount, updateFailedWorkout } from '@/utils/workoutErrorRecovery';
import { Workout } from '@/types/workout';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/useToast';
import { format } from 'date-fns';

interface WorkoutErrorRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkoutRecovered?: (workoutId: number) => void;
}

export function WorkoutErrorRecoveryModal({ isOpen, onClose, onWorkoutRecovered }: WorkoutErrorRecoveryModalProps) {
  const [failedWorkouts, setFailedWorkouts] = useState<FailedWorkout[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<FailedWorkout | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const loadFailedWorkouts = useCallback(() => {
    const failed = getFailedWorkouts();
    setFailedWorkouts(failed);
    if (failed.length > 0 && !selectedWorkout) {
      setSelectedWorkout(failed[0]);
    }
  }, [selectedWorkout]);

  useEffect(() => {
    if (isOpen) {
      loadFailedWorkouts();
    }
  }, [isOpen, loadFailedWorkouts]);

  const handleRetry = async (failedWorkout: FailedWorkout) => {
    setIsRetrying(true);
    incrementRetryCount(failedWorkout.id);

    try {
      // Validate workout before retrying
      const workoutId = await dataService.createWorkout(failedWorkout.workout);
      
      // Success - remove from failed list
      removeFailedWorkout(failedWorkout.id);
      success('Workout saved successfully!');
      
      // Reload list
      loadFailedWorkouts();
      
      // Notify parent
      if (onWorkoutRecovered) {
        onWorkoutRecovered(workoutId);
      }

      // If no more failed workouts, close modal
      const remaining = getFailedWorkouts();
      if (remaining.length === 0) {
        onClose();
      } else {
        setSelectedWorkout(remaining[0] || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      showError(`Retry failed: ${errorMessage}`);
      
      // Update the failed workout with new error
      updateFailedWorkout(failedWorkout.id, failedWorkout.workout, errorMessage);
      loadFailedWorkouts();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this failed workout? This cannot be undone.')) {
      return;
    }

    setIsDeleting(id);
    try {
      removeFailedWorkout(id);
      loadFailedWorkouts();
      
      // If we deleted the selected workout, select another one
      if (selectedWorkout?.id === id) {
        const remaining = getFailedWorkouts();
        setSelectedWorkout(remaining[0] || null);
      }

      // If no more failed workouts, close modal
      if (getFailedWorkouts().length === 0) {
        onClose();
      }
    } catch (err) {
      showError('Failed to delete workout');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatWorkoutDate = (workout: Workout) => {
    try {
      const date = workout.date instanceof Date ? workout.date : new Date(workout.date);
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  };

  const formatWorkoutTime = (workout: Workout) => {
    try {
      const startTime = workout.startTime instanceof Date ? workout.startTime : new Date(workout.startTime);
      return format(startTime, 'h:mm a');
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recover Failed Workouts">
      <div className="space-y-4">
        {failedWorkouts.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400">No failed workouts to recover</p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {failedWorkouts.length} workout{failedWorkouts.length !== 1 ? 's' : ''} failed to save
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Review the errors below and retry saving. Your workout data is safe and can be recovered.
                  </p>
                </div>
              </div>
            </div>

            {/* Failed Workouts List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {failedWorkouts.map((fw) => (
                <div
                  key={fw.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedWorkout?.id === fw.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-[#316847] bg-white dark:bg-surface-dark'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setSelectedWorkout(fw)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatWorkoutDate(fw.workout)}
                        </span>
                        {formatWorkoutTime(fw.workout) && (
                          <>
                            <span className="text-gray-400">•</span>
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatWorkoutTime(fw.workout)}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {fw.workout.exercises.length} exercise{fw.workout.exercises.length !== 1 ? 's' : ''} •{' '}
                        {fw.workout.totalDuration} min
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Error: {fw.error}
                      </div>
                      {fw.retryCount > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Retried {fw.retryCount} time{fw.retryCount !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRetry(fw)}
                        disabled={isRetrying || isDeleting === fw.id}
                        className="px-3 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isRetrying && selectedWorkout?.id === fw.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Retry
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(fw.id)}
                        disabled={isRetrying || isDeleting === fw.id}
                        className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Delete failed workout"
                      >
                        {isDeleting === fw.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedWorkout?.id === fw.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[#316847]">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Exercises:
                          </h4>
                          <div className="space-y-1">
                            {fw.workout.exercises.map((ex, idx) => (
                              <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                • {ex.exerciseName} ({ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''})
                              </div>
                            ))}
                          </div>
                        </div>
                        {fw.errorDetails && (
                          <div>
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Error Details:
                            </h4>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32 text-gray-700 dark:text-gray-300">
                              {fw.errorDetails}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

