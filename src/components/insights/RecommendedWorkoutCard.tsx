import { Sparkles, Clock, Dumbbell, Play, TrendingUp, Battery, Zap } from 'lucide-react';
import { WorkoutRecommendation } from '@/types/insights';
import { useNavigate } from 'react-router-dom';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import { useUserStore } from '@/store/userStore';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { calculateVolume } from '@/utils/calculations';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/common/Toast';
import { getRecommendationImageUrl } from '@/utils/recommendationImageMapper';
import { categorizeMuscleGroup } from '@/utils/analyticsHelpers';

interface RecommendedWorkoutMetrics {
  prProbability?: number;
  fatigueAccumulation?: number;
  supercompensationScore?: number;
}

interface RecommendedWorkoutCardProps {
  workout?: WorkoutRecommendation;
  metrics?: RecommendedWorkoutMetrics;
}

export function RecommendedWorkoutCard({ workout, metrics }: RecommendedWorkoutCardProps) {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { muscleStatuses } = useMuscleRecovery();
  const { toasts, removeToast, error: showError } = useToast();

  if (!workout) {
    return null;
  }

  // Determine image URL
  const primaryMuscle = workout.muscleGroups?.[0];
  const category = primaryMuscle ? categorizeMuscleGroup(primaryMuscle) : 'mixed';
  const imageUrl = getRecommendationImageUrl(category, 'strength');

  const handleStartWorkout = async () => {
    try {
      // Get exercises that match recommended muscle groups
      const allExercises = await exerciseLibrary.getAllExercises();
      const matchingExercises = (allExercises ?? []).filter(ex => {
        // Check if exercise targets any of the recommended muscle groups
        const primaryMatch = (ex.primaryMuscles ?? []).some(m => (workout.muscleGroups ?? []).includes(m));
        const secondaryMatch = (ex.secondaryMuscles ?? []).some(m => (workout.muscleGroups ?? []).includes(m));
        return primaryMatch || secondaryMatch;
      });

      // Filter exercises based on muscle recovery - only include if muscles are ready (>=75%)
      const readyMuscles = (muscleStatuses ?? [])
        .filter(s => s.recoveryPercentage >= 75)
        .map(s => s.muscle);
      
      const readyExercises = matchingExercises.filter(ex => {
        return (ex.primaryMuscles ?? []).some(m => readyMuscles.includes(m)) ||
               (ex.secondaryMuscles ?? []).some(m => readyMuscles.includes(m));
      });

      // Use ready exercises if available, otherwise use all matching exercises
      const exercisesToUse = readyExercises.length > 0 ? readyExercises : matchingExercises;

      // Limit to 4-6 exercises for a good workout
      const selectedExercises = exercisesToUse.slice(0, 6);

      if (selectedExercises.length === 0) {
        showError('No suitable exercises found for this workout. Please try again later.');
        return;
      }

      // Convert to WorkoutExercise format
      const recommendedWorkoutExercises: WorkoutExercise[] = await Promise.all(
        selectedExercises.map(async (exercise) => {
          // Create default sets based on exercise type
          let initialSets: WorkoutSet[] = [];
          
          switch (exercise.trackingType) {
            case 'weight_reps':
              initialSets = [
                {
                  setNumber: 1,
                  reps: 10,
                  weight: 0,
                  unit: profile?.preferredUnit || 'kg',
                  completed: false,
                },
                {
                  setNumber: 2,
                  reps: 10,
                  weight: 0,
                  unit: profile?.preferredUnit || 'kg',
                  completed: false,
                },
                {
                  setNumber: 3,
                  reps: 10,
                  weight: 0,
                  unit: profile?.preferredUnit || 'kg',
                  completed: false,
                },
              ];
              break;
            case 'reps_only':
              initialSets = [
                { setNumber: 1, reps: 10, completed: false },
                { setNumber: 2, reps: 10, completed: false },
                { setNumber: 3, reps: 10, completed: false },
              ];
              break;
            case 'cardio':
              initialSets = [
                {
                  setNumber: 1,
                  distance: 0,
                  distanceUnit: 'km',
                  time: 0,
                  completed: false,
                },
              ];
              break;
            case 'duration':
              initialSets = [
                { setNumber: 1, duration: 0, completed: false },
              ];
              break;
          }

          const initialVolume = calculateVolume(initialSets, exercise.trackingType);

          return {
            id: `${Date.now()}-${Math.random()}-${exercise.id}`,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            sets: initialSets,
            totalVolume: initialVolume,
            musclesWorked: [...exercise.primaryMuscles, ...exercise.secondaryMuscles],
            timestamp: new Date(),
          };
        })
      );

      // Navigate with recommended workout exercises
      navigate('/log-workout', {
        state: { recommendedWorkoutExercises },
      });
    } catch (error) {
      console.error('Error preparing recommended workout:', error);
      showError('Failed to prepare workout. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-card-dark shadow-lg border border-gray-100 dark:border-white/5">
        <div
          className="h-40 w-full bg-cover bg-center relative"
          style={{
            backgroundImage: `url("${imageUrl}")`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-card-dark via-card-dark/60 to-transparent" />
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-background-dark shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended
            </span>
          </div>
          
          {/* Advanced Metrics Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {metrics?.prProbability !== undefined && metrics.prProbability > 60 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm border border-purple-400/20">
                <TrendingUp className="w-3 h-3" />
                {metrics.prProbability}% PR Chance
              </span>
            )}
            {metrics?.supercompensationScore !== undefined && metrics.supercompensationScore > 5 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm border border-blue-400/20">
                <Zap className="w-3 h-3" />
                Supercompensation
              </span>
            )}
            {metrics?.fatigueAccumulation !== undefined && metrics.fatigueAccumulation > 20 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white shadow-sm border border-amber-400/20">
                <Battery className="w-3 h-3" />
                High Fatigue
              </span>
            )}
          </div>
        </div>
        <div className="p-5 -mt-6 relative z-10">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{cleanPlainTextResponse(workout.name)}</h3>
          <p className="text-slate-500 dark:text-text-muted text-sm mb-4">{cleanPlainTextResponse(workout.description)}</p>
          <div className="flex gap-2 mb-5">
            <span className="inline-flex items-center px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/80">
              <Clock className="w-3.5 h-3.5 mr-1" />
              {workout.duration}m
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white/80">
              <Dumbbell className="w-3.5 h-3.5 mr-1" />
              {workout.intensity === 'high' ? 'High Volume' : workout.intensity === 'medium' ? 'Moderate' : 'Low Volume'}
            </span>
          </div>
          <button
            onClick={handleStartWorkout}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 px-4 text-center text-sm font-bold text-background-dark hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <Play className="w-4 h-4" />
            Start Recommended Workout
          </button>
        </div>
      </div>
    </div>
  );
}
