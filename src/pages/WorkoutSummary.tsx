import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { workoutSummaryService } from '@/services/workoutSummaryService';
import { dataService } from '@/services/dataService';
import { WorkoutSummaryData, RecoveryLogData } from '@/types/workoutSummary';
import { SessionAnalysisCard } from '@/components/workout/summary/SessionAnalysisCard';
import { MuscleDistributionChart } from '@/components/workout/summary/MuscleDistributionChart';
import { ExerciseBreakdown } from '@/components/workout/summary/ExerciseBreakdown';
import { AIInsightCard } from '@/components/workout/summary/AIInsightCard';
import { PersonalRecordsCard } from '@/components/workout/summary/PersonalRecordsCard';
import { SessionTrends } from '@/components/workout/summary/SessionTrends';
import { WorkoutRating } from '@/components/workout/summary/WorkoutRating';
import { RecoveryLog } from '@/components/workout/summary/RecoveryLog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EditableWorkoutName } from '@/components/common/EditableWorkoutName';
import { DeleteConfirmationModal } from '@/components/common/DeleteConfirmationModal';
import { ToastContainer } from '@/components/common/Toast';
import { useToast } from '@/hooks/useToast';
import { formatDuration } from '@/utils/calculations';

export function WorkoutSummary() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, removeToast, success } = useToast();

  useEffect(() => {
    const loadSummary = async () => {
      if (!workoutId || !profile) {
        setError('Missing workout ID or user profile');
        setIsLoading(false);
        return;
      }

      try {
        // Workout IDs are now strings, no need to parse
        const data = await workoutSummaryService.generateSummary(workoutId, profile.id);
        setSummaryData(data);
      } catch (err) {
        console.error('Failed to load workout summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load workout summary');
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [workoutId, profile]);

  const handleSaveRecovery = async (recoveryData: RecoveryLogData) => {
    if (!summaryData || !workoutId) return;

    try {
      // Update workout with recovery data
      const workout = summaryData.workout;
      const mood: 'great' | 'good' | 'okay' | 'tired' | 'exhausted' = 
        recoveryData.mood === 'drained' ? 'exhausted' : 
        recoveryData.mood === 'okay' ? 'okay' : 
        'great';
      const updatedWorkout = {
        ...workout,
        mood,
        // Store predicted soreness in notes or extend workout type
        notes: workout?.notes
          ? `${workout.notes}\nPredicted Soreness: ${recoveryData.predictedSoreness}%`
          : `Predicted Soreness: ${recoveryData.predictedSoreness}%`,
      };

      await dataService.updateWorkout(workoutId, updatedWorkout);
      
      // Update local state
      setSummaryData({
        ...summaryData,
        workout: updatedWorkout,
        recoveryLog: recoveryData,
      });
    } catch (err) {
      console.error('Failed to save recovery data:', err);
      throw err;
    }
  };

  const handleDone = () => {
    navigate('/home');
  };

  const handleSaveWorkoutName = async (newName: string) => {
    if (!summaryData || !workoutId) return;

    await dataService.updateWorkout(workoutId, { workoutType: newName });

    setSummaryData({
      ...summaryData,
      workout: {
        ...summaryData.workout,
        workoutType: newName,
      },
    });
  };

  const handleDeleteWorkout = async () => {
    if (!workoutId) return;

    // Capture value for undo closure to prevent stale references
    const deletedWorkoutId = workoutId;

    setIsDeleting(true);
    try {
      await dataService.deleteWorkout(deletedWorkoutId);

      setDeleteModalOpen(false);

      // Navigate to history
      navigate('/workout-history');

      // Show success toast with undo (will be visible after navigation)
      success('Workout deleted', {
        label: 'Undo',
        onClick: async () => {
          try {
            await dataService.restoreWorkout(deletedWorkoutId);
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

  const formatWorkoutDate = (date: Date): string => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !summaryData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark p-4">
        <p className="text-error mb-4">{error || 'Workout summary not found'}</p>
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
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-background-light dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-[#316847]">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
            Workout Summary
          </h2>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-normal">
            {summaryData?.workout?.date ? formatWorkoutDate(summaryData.workout.date) : ''}
            {(summaryData?.workout?.totalDuration ?? 0) > 0 && ` • ${formatDuration(summaryData.workout.totalDuration)}`}
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end">
          {summaryData?.workout?.id && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-black/20 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-20 min-w-[120px]">
                    <button
                      onClick={() => {
                        navigate(`/edit-workout/${summaryData.workout.id}`);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteModalOpen(true);
                        setMenuOpen(false);
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
          <button
            onClick={handleDone}
            className="text-primary text-base font-bold leading-normal tracking-wide shrink-0"
          >
            Done
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Title Section */}
        <div className="px-4 pt-4">
          <EditableWorkoutName
            name={summaryData?.workout?.workoutType ?? 'Workout'}
            onSave={handleSaveWorkoutName}
            placeholder="Workout"
          />
        </div>

        {/* Session Analysis */}
        {summaryData?.sessionComparison && (
          <SessionAnalysisCard comparison={summaryData.sessionComparison} />
        )}

        {/* Muscle Distribution */}
        {summaryData?.muscleDistribution && (
          <MuscleDistributionChart
            distribution={summaryData.muscleDistribution}
            focusArea={summaryData.focusArea}
          />
        )}

        {/* AI Insight */}
        {summaryData?.aiInsights && (
          <AIInsightCard insights={summaryData.aiInsights} />
        )}

        {/* Exercise Breakdown */}
        {summaryData?.exerciseComparisons && (
          <ExerciseBreakdown comparisons={summaryData.exerciseComparisons} />
        )}

        {/* Session Trends */}
        {(summaryData?.exerciseTrends?.length ?? 0) > 0 && (
          <SessionTrends trends={summaryData.exerciseTrends} />
        )}

        {/* Personal Records */}
        {(summaryData?.personalRecords?.length ?? 0) > 0 && (
          <PersonalRecordsCard records={summaryData.personalRecords} />
        )}

        {/* Workout Rating */}
        {summaryData?.workoutRating && (
          <WorkoutRating rating={summaryData.workoutRating} />
        )}

        {/* Recovery Log */}
        {summaryData?.workout?.id && (
          <RecoveryLog
            workoutId={summaryData.workout.id}
            initialData={summaryData.recoveryLog}
            onSave={handleSaveRecovery}
          />
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

export default WorkoutSummary;

