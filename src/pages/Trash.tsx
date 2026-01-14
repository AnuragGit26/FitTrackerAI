import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Workout } from '@/types/workout';
import { dataService } from '@/services/dataService';
import { useUserStore } from '@/store/userStore';
import { DeleteConfirmationModal } from '@/components/common/DeleteConfirmationModal';
import { ToastContainer } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatDistanceToNow } from 'date-fns';

export function Trash() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const [deletedWorkouts, setDeletedWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [permanentDeleteModalOpen, setPermanentDeleteModalOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    loadDeletedWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadDeletedWorkouts = async () => {
    try {
      if (!profile?.id) {
        navigate('/login');
        return;
      }

      // Auto-cleanup old deleted workouts (older than 30 days)
      try {
        await dataService.cleanupOldDeletedWorkouts(profile.id, 30);
      } catch (cleanupError) {
        // Don't fail if cleanup fails, just log it
        console.warn('Auto-cleanup failed:', cleanupError);
      }

      const workouts = await dataService.getDeletedWorkouts(profile.id);
      setDeletedWorkouts(workouts);
    } catch (err) {
      console.error('Failed to load deleted workouts:', err);
      error('Failed to load deleted workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (workout: Workout) => {
    if (!workout.id) {
      console.error('Cannot restore workout: missing workout ID');
      error('Failed to restore workout');
      return;
    }

    try {
      await dataService.restoreWorkout(workout.id);
      setDeletedWorkouts(prev => prev.filter(w => w.id !== workout.id));
      success('Workout restored');
    } catch (err) {
      console.error('Failed to restore workout:', err);
      error('Failed to restore workout');
    }
  };

  const handlePermanentDelete = async () => {
    if (!workoutToDelete?.id) {
      console.error('Cannot delete workout: missing workout ID');
      return;
    }

    const workoutId = workoutToDelete.id;

    setIsDeleting(true);
    try {
      await dataService.permanentlyDeleteWorkout(workoutId);
      setDeletedWorkouts(prev => prev.filter(w => w.id !== workoutId));
      setPermanentDeleteModalOpen(false);
      setWorkoutToDelete(null);
      success('Workout permanently deleted');
    } catch (err) {
      console.error('Failed to permanently delete workout:', err);
      error('Failed to permanently delete workout');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background-light dark:bg-background-dark shadow-md">
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-[#316847]">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trash</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : deletedWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-gray-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">delete</span>
            <p className="text-lg font-medium">Trash is empty</p>
            <p className="text-sm mt-2">Deleted workouts will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deletedWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-white dark:bg-[#162e21] p-4 rounded-lg border border-gray-200 dark:border-[#316847]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {workout.workoutType || 'Workout'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {new Date(workout.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(workout)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Restore"
                    >
                      <span className="material-symbols-outlined text-base">restore</span>
                    </button>
                    <button
                      onClick={() => {
                        setWorkoutToDelete(workout);
                        setPermanentDeleteModalOpen(true);
                      }}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors"
                      title="Delete Forever"
                    >
                      <span className="material-symbols-outlined text-base">delete_forever</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 text-xs text-slate-500 dark:text-gray-400">
                  <span>{workout.totalDuration} min</span>
                  <span>{workout.totalVolume.toFixed(0)} kg</span>
                  <span>{workout.exercises.length} exercises</span>
                </div>

                {workout.deletedAt && (
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">
                    Deleted {formatDistanceToNow(new Date(workout.deletedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permanent delete confirmation */}
      <DeleteConfirmationModal
        isOpen={permanentDeleteModalOpen}
        onClose={() => setPermanentDeleteModalOpen(false)}
        onConfirm={handlePermanentDelete}
        title="Delete Permanently?"
        message="This action cannot be undone. The workout will be permanently deleted."
        isDeleting={isDeleting}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default Trash;
