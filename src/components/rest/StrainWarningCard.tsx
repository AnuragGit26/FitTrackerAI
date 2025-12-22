import { AlertTriangle } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useMemo } from 'react';

export function StrainWarningCard() {
  const { muscleStatuses } = useMuscleRecovery();

  const highStrainMuscle = useMemo(() => {
    // Find muscle groups with high strain (overworked or very low recovery)
    return muscleStatuses.find(
      (status) =>
        status.recoveryStatus === 'overworked' ||
        (status.recoveryPercentage < 25 && status.workloadScore > 50)
    );
  }, [muscleStatuses]);

  if (!highStrainMuscle) {
    return null;
  }

  const muscleName = highStrainMuscle.muscle
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const recommendedRest = Math.ceil(highStrainMuscle.recommendedRestDays * 24);

  return (
    <div className="bg-warning/10 border border-warning/50 rounded-xl p-3 flex gap-3 items-center">
      <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
      <div>
        <h4 className="text-warning font-bold text-sm">High Strain Detected</h4>
        <p className="text-slate-600 dark:text-white/70 text-xs">
          {muscleName} load is {Math.round(highStrainMuscle.workloadScore)}% above average. Recommended +{recommendedRest}h rest.
        </p>
      </div>
    </div>
  );
}

