import { AlertTriangle } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useMemo } from 'react';

export function StrainWarningCard() {
  const { muscleStatuses } = useMuscleRecovery();

  const { highStrainMuscle, percentageAboveAverage } = useMemo(() => {
    // Find muscle groups with high strain (overworked or very low recovery)
    const highStrain = muscleStatuses.find(
      (status) =>
        status.recoveryStatus === 'overworked' ||
        (status.recoveryPercentage < 25 && status.workloadScore > 50)
    );

    if (!highStrain || muscleStatuses.length === 0) {
      return { highStrainMuscle: null, percentageAboveAverage: 0 };
    }

    // Calculate average workload score across all muscle groups
    const avgWorkload = muscleStatuses.reduce((sum, m) => sum + m.workloadScore, 0) / muscleStatuses.length;

    // Calculate percentage above average
    let percentageAbove = 0;
    if (avgWorkload > 0) {
      percentageAbove = Math.round(((highStrain.workloadScore - avgWorkload) / avgWorkload) * 100);
      // Ensure non-negative (if below average, show 0%)
      percentageAbove = Math.max(0, percentageAbove);
    } else {
      // If average is 0, we can't calculate percentage, but muscle has high strain
      // Use a fallback to indicate high load
      percentageAbove = highStrain.workloadScore > 0 ? 100 : 0;
    }

    return { highStrainMuscle: highStrain, percentageAboveAverage: percentageAbove };
  }, [muscleStatuses]);

  if (!highStrainMuscle || percentageAboveAverage === 0) {
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
          {muscleName} load is {percentageAboveAverage}% above average. Recommended +{recommendedRest}h rest.
        </p>
      </div>
    </div>
  );
}

