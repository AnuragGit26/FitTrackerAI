import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { dataService } from '@/services/dataService';
import { Workout } from '@/types/workout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyStateAIMessage } from '@/components/common/EmptyStateAIMessage';
import { EditableWorkoutNameInline } from '@/components/common/EditableWorkoutNameInline';
import { DeleteConfirmationModal } from '@/components/common/DeleteConfirmationModal';
import { ToastContainer } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatDuration } from '@/utils/calculations';
import { motion } from 'framer-motion';

export function WorkoutHistory() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, removeToast, success } = useToast();

  useEffect(() => {
    const loadWorkouts = async () => {
      if (!profile?.id) {
        setError('Please log in to view workout history');
        setIsLoading(false);
        return;
      }

      try {
        const allWorkouts = await dataService.getAllWorkouts(profile.id);
        // Sort by date, most recent first
        const sorted = (allWorkouts ?? []).sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        setWorkouts(sorted);
      } catch (err) {
        console.error('Failed to load workouts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workout history');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkouts();
  }, [profile?.id]);

  const formatWorkoutDate = (date: Date): string => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatWorkoutTime = (date: Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  const handleWorkoutClick = (workoutId?: string) => {
    if (workoutId) {
      navigate(`/workout-summary/${workoutId}`);
    }
  };

  const handleSaveWorkoutName = async (workoutId: string, newName: string) => {
    await dataService.updateWorkout(workoutId, { workoutType: newName });

    setWorkouts((prevWorkouts) =>
      prevWorkouts.map((workout) =>
        workout.id === workoutId ? { ...workout, workoutType: newName } : workout
      )
    );
  };

  const handleDeleteWorkout = async () => {
    if (!workoutToDelete?.id || !profile?.id) {
    return;
  }

    // Capture values for undo closure to prevent stale references
    const deletedWorkoutId = workoutToDelete.id;
    const userId = profile.id;

    setIsDeleting(true);
    try {
      await dataService.deleteWorkout(deletedWorkoutId);

      // Remove from local state optimistically
      setWorkouts(prev => prev.filter(w => w.id !== deletedWorkoutId));

      setDeleteModalOpen(false);
      setWorkoutToDelete(null);

      // Show success toast with undo button
      success('Workout deleted', {
        label: 'Undo',
        onClick: async () => {
          try {
            await dataService.restoreWorkout(deletedWorkoutId);
            // Reload workouts
            const restored = await dataService.getAllWorkouts(userId);
            setWorkouts(restored);
            success('Workout restored');
          } catch (error) {
            console.error('Failed to restore workout:', error);
            alert('Failed to restore workout. Please try again.');
          }
        }
      });
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-4">
        <p className="text-error mb-4">{error}</p>
        <button
          onClick={() => navigate('/home')}
          className="px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-gray-100 dark:border-border-dark">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
            Workout History
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-normal">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex w-12 items-center justify-end"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <EmptyStateAIMessage screenName="History" className="w-full max-w-sm mb-8" />
            <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-gray-600 mb-4">
              fitness_center
            </span>
            <button
              onClick={() => navigate('/log-workout')}
              className="px-6 py-3 bg-primary text-background-dark rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Start Workout
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workouts.map((workout, index) => (
              <motion.div
                key={workout.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (!target.closest('button') && !target.closest('input')) {
                    handleWorkoutClick(workout.id);
                  }
                }}
                className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-border-dark rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-surface-dark-light transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    {workout.id ? (
                      <EditableWorkoutNameInline
                        name={workout.workoutType || 'Workout'}
                        onSave={(newName) => handleSaveWorkoutName(workout.id!, newName)}
                        placeholder="Workout"
                      />
                    ) : (
                      <h3 className="text-slate-900 dark:text-white font-bold text-base mb-1">
                        {workout.workoutType || 'Workout'}
                      </h3>
                    )}
                    <p className="text-slate-500 dark:text-gray-400 text-sm">
                      {formatWorkoutDate(workout.date)} • {formatWorkoutTime(workout.startTime || workout.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {workout.id && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === workout.id ? null : workout.id!);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-black/20 text-slate-500 dark:text-gray-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">more_vert</span>
                        </button>

                        {menuOpenId === workout.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpenId(null)}
                            />
                            <div className="absolute right-0 top-10 bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/10 rounded-lg shadow-lg z-20 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/edit-workout/${workout.id}`);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkoutToDelete(workout);
                                  setDeleteModalOpen(true);
                                  setMenuOpenId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <span className="material-symbols-outlined text-slate-400 dark:text-gray-500">
                      chevron_right
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-[#FF9933]">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <p className="text-xs font-semibold uppercase tracking-wider">Time</p>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      {formatDuration(workout.totalDuration)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-[#FF9933]">
                      <span className="material-symbols-outlined text-[14px]">fitness_center</span>
                      <p className="text-xs font-semibold uppercase tracking-wider">Vol</p>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      {formatVolume(workout.totalVolume)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-slate-500 dark:text-[#FF9933]">
                      <span className="material-symbols-outlined text-[14px]">format_list_numbered</span>
                      <p className="text-xs font-semibold uppercase tracking-wider">Ex</p>
                    </div>
                    <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                      {(workout.exercises ?? []).length}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteWorkout}
        title="Delete Workout?"
        message="You can restore it from the Trash or undo immediately after deletion."
        isDeleting={isDeleting}
      />

      {/* Toast container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default WorkoutHistory;

