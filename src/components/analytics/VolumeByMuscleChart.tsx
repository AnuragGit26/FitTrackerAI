import { useMemo, memo } from 'react';
import { MuscleGroup } from '@/types/muscle';
import { aggregateVolumeByMuscleGroup } from '@/utils/analyticsHelpers';
import { Workout } from '@/types/workout';
import { useUserStore } from '@/store/userStore';

interface VolumeByMuscleChartProps {
  workouts: Workout[];
}

export const VolumeByMuscleChart = memo(function VolumeByMuscleChart({ workouts }: VolumeByMuscleChartProps) {
  const { profile } = useUserStore();
  const unit = profile?.preferredUnit || 'kg';

  const muscleData = useMemo(() => {
    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    const sorted = Array.from(muscleVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const maxVolume = sorted[0]?.[1] || 1;

    return sorted.map(([muscle, volume]) => ({
      muscle,
      volume,
      percentage: Math.round((volume / maxVolume) * 100),
    }));
  }, [workouts]);

  const getMuscleLabel = (muscle: MuscleGroup): string => {
    const labels: Record<MuscleGroup, string> = {
      [MuscleGroup.CHEST]: 'Chest',
      [MuscleGroup.UPPER_CHEST]: 'Upper Chest',
      [MuscleGroup.LOWER_CHEST]: 'Lower Chest',
      [MuscleGroup.BACK]: 'Back',
      [MuscleGroup.LATS]: 'Lats',
      [MuscleGroup.TRAPS]: 'Traps',
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
      [MuscleGroup.QUADS]: 'Quads',
      [MuscleGroup.HAMSTRINGS]: 'Hamstrings',
      [MuscleGroup.GLUTES]: 'Glutes',
      [MuscleGroup.CALVES]: 'Calves',
      [MuscleGroup.HIP_FLEXORS]: 'Hip Flexors',
    };
    return labels[muscle] || muscle;
  };

  if (muscleData.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 border border-gray-100 dark:border-border-dark">
        <p className="text-slate-500 dark:text-gray-400 text-center py-4">
          No muscle volume data available
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white dark:bg-surface-dark p-5 border border-gray-100 dark:border-border-dark">
      {muscleData.map(({ muscle, volume, percentage }) => {
        const isLow = percentage < 30;
        return (
          <div key={muscle} className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <p className="text-slate-700 dark:text-white text-sm font-medium">
                {getMuscleLabel(muscle)}
              </p>
              <p className="text-slate-500 dark:text-gray-400 text-xs font-bold">
                {volume.toLocaleString('en-US', { maximumFractionDigits: 0 })} {unit}
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-white dark:bg-[#11261a]">
              <div
                className={`h-2 rounded-full transition-all ${
                  isLow
                    ? 'bg-red-400'
                    : percentage > 70
                    ? 'bg-primary shadow-[0_0_8px_rgba(255,153,51,0.4)]'
                    : 'bg-primary/80'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

