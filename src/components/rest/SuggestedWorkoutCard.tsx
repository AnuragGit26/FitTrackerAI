import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { MuscleGroup } from '@/types/muscle';
import { cn } from '@/utils/cn';
import { Dumbbell, ArrowRight, CheckCircle2 } from 'lucide-react';

interface SuggestedExercise {
  name: string;
  primaryMuscles: MuscleGroup[];
}

// Map muscle groups to workout types and exercises
const WORKOUT_SUGGESTIONS: Record<string, { type: string; exercises: SuggestedExercise[]; description: string }> = {
  push: {
    type: 'Push',
    description: 'Focus on chest, shoulders, and triceps',
    exercises: [
      { name: 'Barbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
      { name: 'Overhead Press', primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS] },
      { name: 'Tricep Dips', primaryMuscles: [MuscleGroup.TRICEPS] },
    ],
  },
  pull: {
    type: 'Pull',
    description: 'Focus on back, lats, and biceps',
    exercises: [
      { name: 'Barbell Row', primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS] },
      { name: 'Pull-ups', primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK] },
      { name: 'Barbell Bicep Curl', primaryMuscles: [MuscleGroup.BICEPS] },
    ],
  },
  legs: {
    type: 'Legs',
    description: 'Focus on quads, hamstrings, and glutes',
    exercises: [
      { name: 'Barbell Squat', primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES] },
      { name: 'Romanian Deadlift', primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES] },
      { name: 'Walking Lunges', primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES] },
    ],
  },
  upper: {
    type: 'Upper Body',
    description: 'Full upper body workout',
    exercises: [
      { name: 'Barbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
      { name: 'Barbell Row', primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS] },
      { name: 'Overhead Press', primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS] },
    ],
  },
  full: {
    type: 'Full Body',
    description: 'Complete body workout',
    exercises: [
      { name: 'Barbell Squat', primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES] },
      { name: 'Barbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
      { name: 'Barbell Row', primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS] },
    ],
  },
  // Individual muscle focus workouts
  chest: {
    type: 'Chest Focus',
    description: 'Target your chest muscles',
    exercises: [
      { name: 'Barbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
      { name: 'Dumbbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
      { name: 'Push-ups', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
    ],
  },
  back: {
    type: 'Back Focus',
    description: 'Target your back muscles',
    exercises: [
      { name: 'Barbell Row', primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS] },
      { name: 'Pull-ups', primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK] },
      { name: 'Rowing Machine', primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS] },
    ],
  },
  shoulders: {
    type: 'Shoulders Focus',
    description: 'Target your shoulder muscles',
    exercises: [
      { name: 'Overhead Press', primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS] },
      { name: 'Lateral Raises', primaryMuscles: [MuscleGroup.SIDE_DELTS] },
      { name: 'Barbell Bench Press', primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS] },
    ],
  },
  arms: {
    type: 'Arms Focus',
    description: 'Target your arm muscles',
    exercises: [
      { name: 'Barbell Bicep Curl', primaryMuscles: [MuscleGroup.BICEPS] },
      { name: 'Tricep Dips', primaryMuscles: [MuscleGroup.TRICEPS] },
      { name: 'Close-Grip Bench Press', primaryMuscles: [MuscleGroup.TRICEPS] },
    ],
  },
  core: {
    type: 'Core Focus',
    description: 'Target your core muscles',
    exercises: [
      { name: 'Plank', primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES] },
      { name: 'Russian Twists', primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES] },
      { name: 'Barbell Squat', primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES] },
    ],
  },
};

function getWorkoutTypeForMuscles(readyMuscles: MuscleGroup[]): string | null {
  // Count muscle groups by category
  const pushMuscles = [MuscleGroup.CHEST, MuscleGroup.UPPER_CHEST, MuscleGroup.LOWER_CHEST, MuscleGroup.FRONT_DELTS, MuscleGroup.SIDE_DELTS, MuscleGroup.TRICEPS];
  const pullMuscles = [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.TRAPS, MuscleGroup.RHOMBOIDS, MuscleGroup.BICEPS];
  const legMuscles = [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CALVES, MuscleGroup.HIP_FLEXORS];
  const coreMuscles = [MuscleGroup.ABS, MuscleGroup.OBLIQUES, MuscleGroup.LOWER_BACK];
  const armMuscles = [MuscleGroup.BICEPS, MuscleGroup.TRICEPS, MuscleGroup.FOREARMS];

  const pushCount = readyMuscles.filter(m => pushMuscles.includes(m)).length;
  const pullCount = readyMuscles.filter(m => pullMuscles.includes(m)).length;
  const legCount = readyMuscles.filter(m => legMuscles.includes(m)).length;
  const coreCount = readyMuscles.filter(m => coreMuscles.includes(m)).length;
  const armCount = readyMuscles.filter(m => armMuscles.includes(m)).length;

  // If we have multiple categories ready, suggest full body or upper
  if (legCount > 0 && (pushCount > 0 || pullCount > 0)) {
    if (pushCount >= 1 && pullCount >= 1) {
      return 'full';
    }
  }

  // Category-based suggestions (lowered threshold to 1+)
  if (legCount >= 1) return 'legs';
  if (pushCount >= 1 && pullCount >= 1) return 'upper';
  if (pushCount >= 1) return 'push';
  if (pullCount >= 1) return 'pull';
  if (armCount >= 1) return 'arms';
  if (coreCount >= 1) return 'core';

  // Individual muscle focus (fallback for single muscles)
  if (readyMuscles.some(m => [MuscleGroup.CHEST, MuscleGroup.UPPER_CHEST, MuscleGroup.LOWER_CHEST].includes(m))) {
    return 'chest';
  }
  if (readyMuscles.some(m => [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.TRAPS, MuscleGroup.RHOMBOIDS].includes(m))) {
    return 'back';
  }
  if (readyMuscles.some(m => [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS, MuscleGroup.SIDE_DELTS, MuscleGroup.REAR_DELTS].includes(m))) {
    return 'shoulders';
  }

  return null;
}

export function SuggestedWorkoutCard() {
  const navigate = useNavigate();
  const { muscleStatuses, isLoading } = useMuscleRecovery();

  const suggestion = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) return null;

    // Get muscle groups that are ready (>= 75% recovery)
    const readyMuscles = muscleStatuses
      .filter(status => status.recoveryPercentage >= 75)
      .map(status => status.muscle);

    if (readyMuscles.length === 0) return null;

    // Determine workout type based on ready muscles
    const workoutType = getWorkoutTypeForMuscles(readyMuscles);
    if (!workoutType) return null;

    const workoutSuggestion = WORKOUT_SUGGESTIONS[workoutType];
    if (!workoutSuggestion) return null;

    // Filter exercises to only show those that target ready muscles
    const relevantExercises = workoutSuggestion.exercises.filter(exercise => {
      // Check if any primary muscle of the exercise is in ready muscles
      return exercise.primaryMuscles.some(muscle => readyMuscles.includes(muscle));
    });

    if (relevantExercises.length === 0) return null;

    // Get top 3 most recovered muscles for the reason
    const topRecovered = muscleStatuses
      .filter(s => readyMuscles.includes(s.muscle))
      .sort((a, b) => b.recoveryPercentage - a.recoveryPercentage)
      .slice(0, 3)
      .map(s => {
        const name = s.muscle.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        return name;
      });

    return {
      type: workoutSuggestion.type,
      description: workoutSuggestion.description,
      exercises: relevantExercises.slice(0, 3),
      reason: `Your ${topRecovered.join(', ')} ${topRecovered.length === 1 ? 'is' : 'are'} fully recovered and ready for training.`,
      avgRecovery: Math.round(
        muscleStatuses
          .filter(s => readyMuscles.includes(s.muscle))
          .reduce((sum, s) => sum + s.recoveryPercentage, 0) / readyMuscles.length
      ),
    };
  }, [muscleStatuses, isLoading]);

  if (!suggestion) {
    return null;
  }

  const handleStartWorkout = () => {
    navigate('/log-workout');
  };

  return (
    <div className="mx-4 mb-6">
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/30 shadow-[0_0_15px_rgba(13,242,105,0.1)]">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Suggested Workout</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">{suggestion.type} • {suggestion.avgRecovery}% Recovery</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{suggestion.reason}</p>

        <div className="mb-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">
            Recommended Exercises
          </p>
          <div className="flex flex-col gap-2">
            {suggestion.exercises.map((exercise, index) => (
              <div
                key={exercise.name}
                className="flex items-center gap-2 text-sm text-slate-900 dark:text-white bg-white/50 dark:bg-white/5 rounded-lg px-3 py-2"
              >
                <span className="text-primary font-bold">{index + 1}.</span>
                <span className="flex-1">{exercise.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStartWorkout}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-medium py-3 px-4 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <span>Start {suggestion.type} Workout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

