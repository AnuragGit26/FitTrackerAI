import { MuscleDistribution, FocusArea } from '@/types/workoutSummary';
import { MuscleGroup } from '@/types/muscle';

interface MuscleDistributionChartProps {
  distribution: MuscleDistribution[];
  focusArea: FocusArea;
}

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

const getFocusAreaLabel = (type: FocusArea['type']): string => {
  const labels = {
    push: 'Push Dominant',
    pull: 'Pull Dominant',
    legs: 'Legs Dominant',
    balanced: 'Balanced',
  };
  return labels[type];
};

export function MuscleDistributionChart({
  distribution,
  focusArea,
}: MuscleDistributionChartProps) {
  // Get top 3 muscle groups for display
  const topMuscles = distribution.slice(0, 3);
  const totalPercentage = topMuscles.reduce((sum, m) => sum + m.percentage, 0);

  // Calculate volume change for focus area
  const volumeChange = focusArea.volumeChange
    ? distribution
        .filter((m) => {
          const pushMuscles = [
            MuscleGroup.CHEST,
            MuscleGroup.UPPER_CHEST,
            MuscleGroup.LOWER_CHEST,
            MuscleGroup.FRONT_DELTS,
            MuscleGroup.SIDE_DELTS,
            MuscleGroup.TRICEPS,
          ];
          const pullMuscles = [
            MuscleGroup.BACK,
            MuscleGroup.LATS,
            MuscleGroup.TRAPS,
            MuscleGroup.RHOMBOIDS,
            MuscleGroup.BICEPS,
            MuscleGroup.REAR_DELTS,
          ];
          const legMuscles = [
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.GLUTES,
            MuscleGroup.CALVES,
            MuscleGroup.HIP_FLEXORS,
          ];

          if (focusArea.type === 'push') {
    return pushMuscles.includes(m.muscle);
  }
          if (focusArea.type === 'pull') {
    return pullMuscles.includes(m.muscle);
  }
          if (focusArea.type === 'legs') {
    return legMuscles.includes(m.muscle);
  }
          return true;
        })
        .reduce((sum, m) => sum + (m.changePercent || 0), 0) / topMuscles.length
    : undefined;

  if (topMuscles.length === 0) {
    return (
      <div className="px-4">
        <div className="p-5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 shadow-sm">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            No muscle distribution data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="p-5 rounded-xl bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-[#FF9933] uppercase tracking-wider mb-1">
              Focus Area
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {getFocusAreaLabel(focusArea.type)}
            </h3>
          </div>
          {volumeChange !== undefined && volumeChange > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-primary text-xs font-bold">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>
              <span>+{Math.round(volumeChange)}% Vol</span>
            </div>
          )}
        </div>
        {/* Stacked Bar */}
        <div className="w-full h-4 bg-gray-100 dark:bg-black/40 rounded-full overflow-hidden flex mb-3">
          {topMuscles.map((muscle, index) => {
            const opacity = index === 0 ? 1 : index === 1 ? 0.6 : 0.3;
            return (
              <div
                key={muscle.muscle}
                className="h-full bg-primary"
                style={{
                  width: `${(muscle.percentage / totalPercentage) * 100}%`,
                  opacity,
                }}
              ></div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-300 flex-wrap gap-2">
          {topMuscles.map((muscle, index) => {
            const opacity = index === 0 ? 1 : index === 1 ? 0.6 : 0.3;
            return (
              <div key={muscle.muscle} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-primary"
                  style={{ opacity }}
                ></div>
                <span>
                  {getMuscleLabel(muscle.muscle)} ({Math.round(muscle.percentage)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

