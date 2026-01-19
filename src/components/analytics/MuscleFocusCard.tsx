import { Link } from 'react-router-dom';
import { MuscleGroup } from '@/types/muscle';
import { useMemo } from 'react';
import { aggregateVolumeByMuscleGroup } from '@/utils/analyticsHelpers';
import { Workout } from '@/types/workout';

interface MuscleFocusCardProps {
  workouts: Workout[];
}

export function MuscleFocusCard({ workouts }: MuscleFocusCardProps) {
  const topMuscles = useMemo(() => {
    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    return Array.from(muscleVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([muscle]) => muscle);
  }, [workouts]);

  const getFocusZone = (muscles: MuscleGroup[]): string => {
    const hasUpper = muscles.some((m) =>
      [MuscleGroup.CHEST, MuscleGroup.SHOULDERS, MuscleGroup.BACK, MuscleGroup.LATS].includes(m)
    );
    const hasLower = muscles.some((m) =>
      [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES].includes(m)
    );

    if (hasUpper && hasLower) return 'Full Body';
    if (hasUpper) return 'Upper Body';
    return 'Lower Body';
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">Muscle Focus</h3>
        <Link
          to="/anatomy"
          className="text-primary text-xs font-bold uppercase tracking-wide hover:underline"
        >
          Expand
        </Link>
      </div>
      <div className="flex-1 rounded-lg relative overflow-hidden bg-black group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 opacity-80 group-hover:scale-105 transition-transform duration-700"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
        <div className="absolute bottom-3 left-3 z-10">
          <div className="text-white font-bold text-sm">
            {getFocusZone(topMuscles)}
          </div>
          <div className="text-primary text-xs font-medium">High Impact Zone</div>
        </div>
      </div>
    </div>
  );
}

