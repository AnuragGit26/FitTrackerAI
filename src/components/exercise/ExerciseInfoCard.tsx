import { Exercise } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { ExerciseMuscleDiagram } from './ExerciseMuscleDiagram';
import { Dumbbell } from 'lucide-react';
import { getMuscleMapping } from '@/services/muscleMapping';

interface ExerciseInfoCardProps {
  exercise: Exercise | null;
  className?: string;
}

function getCategoryLabel(category: Exercise['category']): string {
  const labels: Record<Exercise['category'], string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    flexibility: 'Flexibility',
    olympic: 'Olympic',
    plyometric: 'Plyometric',
  };
  return labels[category] || category;
}

function getMuscleGroupLabel(muscle: MuscleGroup): string {
  const labels: Record<string, string> = {
    [MuscleGroup.CHEST]: 'Pectoralis Major',
    [MuscleGroup.UPPER_CHEST]: 'Upper Chest',
    [MuscleGroup.LOWER_CHEST]: 'Lower Chest',
    [MuscleGroup.BACK]: 'Back',
    [MuscleGroup.LATS]: 'Latissimus Dorsi',
    [MuscleGroup.TRAPS]: 'Trapezius',
    [MuscleGroup.RHOMBOIDS]: 'Rhomboids',
    [MuscleGroup.LOWER_BACK]: 'Lower Back',
    [MuscleGroup.SHOULDERS]: 'Shoulders',
    [MuscleGroup.FRONT_DELTS]: 'Front Delts',
    [MuscleGroup.SIDE_DELTS]: 'Side Delts',
    [MuscleGroup.REAR_DELTS]: 'Rear Delts',
    [MuscleGroup.BICEPS]: 'Biceps',
    [MuscleGroup.TRICEPS]: 'Triceps',
    [MuscleGroup.FOREARMS]: 'Forearms',
    [MuscleGroup.ABS]: 'Abs',
    [MuscleGroup.OBLIQUES]: 'Obliques',
    [MuscleGroup.QUADS]: 'Quadriceps',
    [MuscleGroup.HAMSTRINGS]: 'Hamstrings',
    [MuscleGroup.GLUTES]: 'Glutes',
    [MuscleGroup.CALVES]: 'Calves',
    [MuscleGroup.HIP_FLEXORS]: 'Hip Flexors',
  };
  return labels[muscle] || muscle;
}

export function ExerciseInfoCard({ exercise, className }: ExerciseInfoCardProps) {
  if (!exercise) {
    return (
      <div
        className={`rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-border-dark shadow-sm min-h-[140px] ${className || ''}`}
      >
        <div className="flex items-center justify-center h-full p-4">
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Select an exercise to view details
          </p>
        </div>
      </div>
    );
  }

  const muscleMapping = getMuscleMapping(exercise.name);
  const primaryMuscles = muscleMapping?.primary || exercise.primaryMuscles;
  const secondaryMuscles = muscleMapping?.secondary || exercise.secondaryMuscles;

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-border-dark shadow-sm ${className || ''}`}
    >
      <div className="flex flex-row">
        {/* Left side - Muscle diagram with dark background */}
        <div className="relative w-1/3 bg-[#0a160f] min-h-[140px] flex items-center justify-center p-2">
          <ExerciseMuscleDiagram
            primaryMuscles={primaryMuscles}
            secondaryMuscles={secondaryMuscles}
          />
        </div>

        {/* Right side - Exercise info */}
        <div className="flex-1 p-4 flex flex-col justify-center">
          {/* Category badge */}
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
            <Dumbbell className="w-4 h-4" />
            {getCategoryLabel(exercise.category)}
          </span>

          {/* Exercise name */}
          <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
            {exercise.name}
          </h3>

          {/* Target muscles */}
          <div className="flex flex-col gap-1">
            {primaryMuscles.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-gray-300 flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary"></span>
                Primary:{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {primaryMuscles.map(getMuscleGroupLabel).join(', ')}
                </span>
              </p>
            )}
            {secondaryMuscles.length > 0 && (
              <p className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2">
                <span className="size-2 rounded-full bg-gray-500"></span>
                Secondary: {secondaryMuscles.map(getMuscleGroupLabel).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

