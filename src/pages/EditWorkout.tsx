import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { dataService } from '@/services/dataService';
import { muscleRecoveryService } from '@/services/muscleRecoveryService';
import { Workout } from '@/types/workout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EditWorkoutForm } from '@/components/workout/edit/EditWorkoutForm';
import { useToast } from '@/hooks/useToast';

export function EditWorkout() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { success, error: showError } = useToast();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkout = async () => {
      if (!workoutId || !profile) {
        setError('Missing workout ID or user profile');
        setIsLoading(false);
        return;
      }

      try {
        const id = workoutId;
        if (!id) {
          throw new Error('Invalid workout ID');
        }

        const loadedWorkout = await dataService.getWorkout(id);
        if (!loadedWorkout) {
          throw new Error('Workout not found');
        }

        // Verify user owns this workout
        if (loadedWorkout.userId !== profile.id) {
          throw new Error('You do not have permission to edit this workout');
        }

        setWorkout(loadedWorkout);
      } catch (err) {
        console.error('Failed to load workout:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workout');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkout();
  }, [workoutId, profile]);

  const handleSave = async (updatedWorkout: Workout) => {
    if (!workout?.id || !profile) return;

    setIsSaving(true);
    try {
      // Update workout
      await dataService.updateWorkout(workout.id, updatedWorkout);

      // Recalculate muscle recovery statuses
      try {
        await muscleRecoveryService.recalculateMuscleStatusesAfterWorkoutUpdate(workout.id, profile.id);
      } catch (muscleError) {
        console.error('Failed to recalculate muscle recovery:', muscleError);
        // Don't fail the save if muscle recovery fails
      }

      success('Workout updated successfully!');
      navigate(`/workout-summary/${workout.id}`);
    } catch (err) {
      console.error('Failed to save workout:', err);
      showError(err instanceof Error ? err.message : 'Failed to save workout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (workout?.id) {
      navigate(`/workout-summary/${workout.id}`);
    } else {
      navigate('/workout-history');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-4">
        <p className="text-error mb-4">{error || 'Workout not found'}</p>
        <button
          onClick={() => navigate('/workout-history')}
          className="px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark overflow-x-hidden pb-24">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <button
          onClick={handleCancel}
          className="flex items-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
          <span className="ml-1 text-base font-medium">Cancel</span>
        </button>
        <h1 className="text-lg font-bold tracking-tight">Edit Workout</h1>
        <button
          onClick={() => {
            const form = document.querySelector('form');
            if (form) {
              const saveButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
              if (saveButton) saveButton.click();
            }
          }}
          disabled={isSaving}
          className="text-primary font-bold text-base hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <EditWorkoutForm
          workout={workout}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </main>
    </div>
  );
}

export default EditWorkout;

