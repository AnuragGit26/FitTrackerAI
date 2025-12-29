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
import { formatDuration } from '@/utils/calculations';

export function WorkoutSummary() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const [summaryData, setSummaryData] = useState<WorkoutSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSummary = async () => {
      if (!workoutId || !profile) {
        setError('Missing workout ID or user profile');
        setIsLoading(false);
        return;
      }

      try {
        const id = parseInt(workoutId, 10);
        if (isNaN(id)) {
          throw new Error('Invalid workout ID');
        }

        const data = await workoutSummaryService.generateSummary(id, profile.id);
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
      const updatedWorkout = {
        ...workout,
        mood: recoveryData.mood === 'drained' ? 'exhausted' : recoveryData.mood === 'okay' ? 'okay' : 'great',
        // Store predicted soreness in notes or extend workout type
        notes: workout.notes
          ? `${workout.notes}\nPredicted Soreness: ${recoveryData.predictedSoreness}%`
          : `Predicted Soreness: ${recoveryData.predictedSoreness}%`,
      };

      await dataService.updateWorkout(parseInt(workoutId, 10), updatedWorkout);
      
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

    const id = parseInt(workoutId, 10);
    await dataService.updateWorkout(id, { workoutType: newName });

    setSummaryData({
      ...summaryData,
      workout: {
        ...summaryData.workout,
        workoutType: newName,
      },
    });
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
            {formatWorkoutDate(summaryData.workout.date)}
            {summaryData.workout.totalDuration > 0 && ` • ${formatDuration(summaryData.workout.totalDuration)}`}
          </p>
        </div>
        <div className="flex w-12 items-center justify-end cursor-pointer">
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
            name={summaryData.workout.workoutType || 'Workout'}
            onSave={handleSaveWorkoutName}
            placeholder="Workout"
          />
        </div>

        {/* Session Analysis */}
        <SessionAnalysisCard comparison={summaryData.sessionComparison} />

        {/* Muscle Distribution */}
        <MuscleDistributionChart
          distribution={summaryData.muscleDistribution}
          focusArea={summaryData.focusArea}
        />

        {/* AI Insight */}
        <AIInsightCard insights={summaryData.aiInsights} />

        {/* Exercise Breakdown */}
        <ExerciseBreakdown comparisons={summaryData.exerciseComparisons} />

        {/* Session Trends */}
        {summaryData.exerciseTrends.length > 0 && (
          <SessionTrends trends={summaryData.exerciseTrends} />
        )}

        {/* Personal Records */}
        {summaryData.personalRecords.length > 0 && (
          <PersonalRecordsCard records={summaryData.personalRecords} />
        )}

        {/* Workout Rating */}
        <WorkoutRating rating={summaryData.workoutRating} />

        {/* Recovery Log */}
        <RecoveryLog
          workoutId={summaryData.workout.id!}
          initialData={summaryData.recoveryLog}
          onSave={handleSaveRecovery}
        />
      </main>
    </div>
  );
}

export default WorkoutSummary;

