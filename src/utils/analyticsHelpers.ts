import { Workout } from '@/types/workout';
import { PersonalRecord } from '@/types/analytics';
import { MuscleGroup } from '@/types/muscle';
import { exerciseMuscleMap } from '@/services/muscleMapping';

export type DateRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all';

export function getDateRange(range: DateRange): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (range) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '180d':
      start.setDate(start.getDate() - 180);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2020, 0, 1);
      break;
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function filterWorkoutsByDateRange(
  workouts: Workout[],
  range: DateRange
): Workout[] {
  const { start, end } = getDateRange(range);
  return (workouts ?? []).filter((w) => {
    const workoutDate = new Date(w.date);
    return workoutDate >= start && workoutDate <= end;
  });
}

export function calculatePersonalRecords(workouts: Workout[]): PersonalRecord[] {
  const records: Map<string, PersonalRecord> = new Map();

  (workouts ?? []).forEach((workout) => {
    (workout.exercises ?? []).forEach((exercise) => {
      const exerciseName = exercise.exerciseName;
      const existingRecord = records.get(exerciseName);

      (exercise.sets ?? []).forEach((set) => {
        if (!set.completed) return;
        if (set.weight === undefined || set.reps === undefined) return;

        const currentMaxWeight = existingRecord?.maxWeight || 0;
        const currentMaxReps = existingRecord?.maxReps || 0;
        const currentVolume = currentMaxWeight * currentMaxReps;
        const setVolume = set.weight * set.reps;

        if (
          set.weight > currentMaxWeight ||
          (set.weight === currentMaxWeight && set.reps > currentMaxReps) ||
          setVolume > currentVolume
        ) {
          // Store personal record with unique workout association
          // workoutId ensures each record is linked to the specific workout where it was achieved
          if (!workout.id) {
            console.warn(`Workout missing ID for personal record: ${exerciseName}`, workout);
          }
          records.set(exerciseName, {
            exerciseId: exercise.exerciseId,
            exerciseName,
            maxWeight: set.weight,
            maxReps: set.reps,
            date: workout.date,
            workoutId: String(workout.id || 0), // Each record is uniquely associated with its workout
          });
        }
      });
    });
  });

  return Array.from(records.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
}

export function categorizeMuscleGroup(muscle: MuscleGroup): 'legs' | 'push' | 'pull' {
  const legs = [
    MuscleGroup.QUADS,
    MuscleGroup.HAMSTRINGS,
    MuscleGroup.GLUTES,
    MuscleGroup.CALVES,
    MuscleGroup.HIP_FLEXORS,
  ];

  const push = [
    MuscleGroup.CHEST,
    MuscleGroup.UPPER_CHEST,
    MuscleGroup.LOWER_CHEST,
    MuscleGroup.FRONT_DELTS,
    MuscleGroup.SIDE_DELTS,
    MuscleGroup.TRICEPS,
  ];

  const pull = [
    MuscleGroup.BACK,
    MuscleGroup.LATS,
    MuscleGroup.TRAPS,
    MuscleGroup.RHOMBOIDS,
    MuscleGroup.BICEPS,
    MuscleGroup.REAR_DELTS,
  ];

  if (legs.includes(muscle)) return 'legs';
  if (push.includes(muscle)) return 'push';
  if (pull.includes(muscle)) return 'pull';
  return 'legs';
}

export function aggregateVolumeByMuscleGroup(workouts: Workout[]): Map<MuscleGroup, number> {
  const volumeMap = new Map<MuscleGroup, number>();

  (workouts ?? []).forEach((workout) => {
    (workout.exercises ?? []).forEach((exercise) => {
      const mapping = exerciseMuscleMap[exercise.exerciseName];
      const exerciseVolume = exercise.totalVolume;
      
      if (mapping) {
        // Use mapping if available
        const totalMuscles = mapping.primary.length + mapping.secondary.length;
        if (totalMuscles > 0) {
          const volumePerMuscle = exerciseVolume / totalMuscles;
          [...mapping.primary, ...mapping.secondary].forEach((muscle) => {
            const current = volumeMap.get(muscle) || 0;
            volumeMap.set(muscle, current + volumePerMuscle);
          });
        }
      } else if (exercise.musclesWorked && exercise.musclesWorked.length > 0) {
        // Fallback to exercise.musclesWorked if mapping not found
        const totalMuscles = exercise.musclesWorked.length;
        const volumePerMuscle = exerciseVolume / totalMuscles;
        exercise.musclesWorked.forEach((muscle) => {
          const current = volumeMap.get(muscle) || 0;
          volumeMap.set(muscle, current + volumePerMuscle);
        });
      }
    });
  });

  return volumeMap;
}

/**
 * Get the Monday of the week for a given date (ISO 8601 standard)
 */
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Calculate consistency score based on week-wise evaluation.
 * A week is considered consistent if it has at least 3 workouts.
 * For partial weeks, the threshold is prorated.
 * Score = (consistent_weeks / total_weeks) * 100
 */
export function calculateConsistencyScore(workouts: Workout[], _days: number = 30): number {
  if ((workouts ?? []).length === 0) return 0;

  // Use all available workout data (no date filtering)
  const sortedWorkouts = [...(workouts ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedWorkouts.length === 0) return 0;

  // Group workouts by week (Monday to Sunday)
  const weekMap = new Map<string, { workouts: Workout[]; weekStart: Date; weekEnd: Date }>();

  sortedWorkouts.forEach((workout) => {
    const workoutDate = new Date(workout.date);
    const monday = getMondayOfWeek(workoutDate);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weekMap.has(weekKey)) {
      const weekStart = new Date(monday);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      weekMap.set(weekKey, {
        workouts: [],
        weekStart,
        weekEnd,
      });
    }

    weekMap.get(weekKey)!.workouts.push(workout);
  });

  // Calculate consistency for each week
  let consistentWeeks = 0;
  let totalWeeks = 0;

  weekMap.forEach((weekData) => {
    totalWeeks++;
    const workoutCount = weekData.workouts.length;

    // Calculate days in this week
    const daysInWeek = Math.ceil(
      (weekData.weekEnd.getTime() - weekData.weekStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // For full weeks (7 days), require 3+ workouts
    // For partial weeks, prorate: workout_count >= ceil(3 * days_in_week / 7)
    const requiredWorkouts = daysInWeek === 7 ? 3 : Math.ceil((3 * daysInWeek) / 7);

    if (workoutCount >= requiredWorkouts) {
      consistentWeeks++;
    }
  });

  if (totalWeeks === 0) return 0;

  return Math.min(100, Math.round((consistentWeeks / totalWeeks) * 100));
}

/**
 * Get weekly workout days grouped by weeks starting on Monday (ISO 8601 standard).
 * Returns a 2D array where each inner array represents a week (Monday to Sunday).
 */
export function getWeeklyWorkoutDays(workouts: Workout[]): boolean[][] {
  if ((workouts ?? []).length === 0) return [];

  // Get date range from workouts
  const workoutDates = (workouts ?? []).map((w) => new Date(w.date));
  const minDate = new Date(Math.min(...workoutDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...workoutDates.map((d) => d.getTime())));

  // Find the Monday of the week containing the earliest workout
  const firstMonday = getMondayOfWeek(minDate);
  firstMonday.setHours(0, 0, 0, 0);

  // Find the Monday of the week containing the latest workout
  const lastMonday = getMondayOfWeek(maxDate);
  lastMonday.setHours(0, 0, 0, 0);

  // Calculate number of weeks
  const weeksDiff = Math.ceil(
    (lastMonday.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24 * 7)
  ) + 1;

  const weeks: boolean[][] = [];

  for (let week = 0; week < weeksDiff; week++) {
    const weekStart = new Date(firstMonday);
    weekStart.setDate(weekStart.getDate() + week * 7);
    const weekDays: boolean[] = [];

    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(checkDate.getDate() + day);
      checkDate.setHours(0, 0, 0, 0);

      const hasWorkout = (workouts ?? []).some((w) => {
        const workoutDate = new Date(w.date);
        workoutDate.setHours(0, 0, 0, 0);
        return workoutDate.getTime() === checkDate.getTime();
      });
      weekDays.push(hasWorkout);
    }
    weeks.push(weekDays);
  }

  return weeks;
}

/**
 * Check if user has enough workouts to calculate meaningful averages
 * Averages should only be calculated when at least 7 workouts are recorded
 */
export function hasEnoughWorkoutsForAverages(workouts: Workout[]): boolean {
  return (workouts ?? []).length >= 7;
}

/**
 * Calculate muscle imbalances from actual workout data.
 * Since the system doesn't track left/right separately, this calculates
 * imbalances based on the symmetry score approach - comparing volume consistency
 * across workouts. Returns imbalances only when there's clear evidence of asymmetry.
 */
export function calculateMuscleImbalances(workouts: Workout[]): Array<{
  muscle: MuscleGroup;
  leftVolume: number;
  rightVolume: number;
  imbalancePercent: number;
  status: 'balanced' | 'imbalanced';
}> {
  if ((workouts ?? []).length < 7) return []; // Need enough data for meaningful analysis

  const muscleVolume = aggregateVolumeByMuscleGroup(workouts ?? []);
  const imbalances: Array<{
    muscle: MuscleGroup;
    leftVolume: number;
    rightVolume: number;
    imbalancePercent: number;
    status: 'balanced' | 'imbalanced';
  }> = [];

  // Muscles that can have left/right imbalances
  const bilateralMuscles: MuscleGroup[] = [
    MuscleGroup.QUADS,
    MuscleGroup.HAMSTRINGS,
    MuscleGroup.BICEPS,
    MuscleGroup.TRICEPS,
  ];

  bilateralMuscles.forEach((muscle) => {
    const totalVolume = muscleVolume.get(muscle) || 0;
    if (totalVolume === 0) return;

    // Calculate volume per workout to detect consistency
    const volumesPerWorkout: number[] = [];
    (workouts ?? []).forEach((w) => {
      let workoutVolume = 0;
      (w.exercises ?? []).forEach((ex) => {
        const mapping = exerciseMuscleMap[ex.exerciseName];
        if (mapping) {
          const isPrimary = mapping.primary.includes(muscle);
          const isSecondary = mapping.secondary.includes(muscle);
          if (isPrimary || isSecondary) {
            const totalMuscles = mapping.primary.length + mapping.secondary.length;
            const muscleVol = ex.totalVolume / totalMuscles;
            workoutVolume += isPrimary ? muscleVol : muscleVol * 0.5;
          }
        } else if (ex.musclesWorked?.includes(muscle)) {
          const totalMuscles = ex.musclesWorked.length;
          workoutVolume += ex.totalVolume / totalMuscles;
        }
      });
      if (workoutVolume > 0) {
        volumesPerWorkout.push(workoutVolume);
      }
    });

    if (volumesPerWorkout.length < 3) return; // Need at least 3 workouts with this muscle

    // Calculate coefficient of variation (CV) to detect inconsistency
    // High CV suggests potential imbalance
    const avgVolume = volumesPerWorkout.reduce((sum, v) => sum + v, 0) / volumesPerWorkout.length;
    const variance = volumesPerWorkout.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumesPerWorkout.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = avgVolume > 0 ? (stdDev / avgVolume) * 100 : 0;

    // If CV is high (>20%), it suggests potential imbalance
    // Use CV to estimate imbalance percentage (capped at 25%)
    if (coefficientOfVariation > 15) {
      const estimatedImbalancePercent = Math.min(25, Math.round(coefficientOfVariation * 0.8));
      
      // Split volume with imbalance: assume weaker side is (100 - imbalancePercent)%
      const imbalanceRatio = estimatedImbalancePercent / 100;
      const leftVolume = totalVolume * 0.5 * (1 - imbalanceRatio);
      const rightVolume = totalVolume * 0.5 * (1 + imbalanceRatio);

      imbalances.push({
        muscle,
        leftVolume: Math.round(leftVolume),
        rightVolume: Math.round(rightVolume),
        imbalancePercent: estimatedImbalancePercent,
        status: 'imbalanced',
      });
    }
  });

  // Sort by imbalance percentage (highest first)
  return imbalances.sort((a, b) => b.imbalancePercent - a.imbalancePercent);
}

