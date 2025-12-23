import { Workout } from '@/types/workout';
import { PersonalRecord } from '@/types/analytics';
import { MuscleGroup } from '@/types/muscle';
import { calculateEstimatedOneRepMax } from './calculations';
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
  return workouts.filter((w) => {
    const workoutDate = new Date(w.date);
    return workoutDate >= start && workoutDate <= end;
  });
}

export function calculatePersonalRecords(workouts: Workout[]): PersonalRecord[] {
  const records: Map<string, PersonalRecord> = new Map();

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const exerciseName = exercise.exerciseName;
      const existingRecord = records.get(exerciseName);

      exercise.sets.forEach((set) => {
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
            workoutId: workout.id || 0, // Each record is uniquely associated with its workout
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

  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const mapping = exerciseMuscleMap[exercise.exerciseName];
      if (!mapping) return;

      const exerciseVolume = exercise.totalVolume;
      const totalMuscles = mapping.primary.length + mapping.secondary.length;
      const volumePerMuscle = exerciseVolume / totalMuscles;

      [...mapping.primary, ...mapping.secondary].forEach((muscle) => {
        const current = volumeMap.get(muscle) || 0;
        volumeMap.set(muscle, current + volumePerMuscle);
      });
    });
  });

  return volumeMap;
}

export function calculateConsistencyScore(workouts: Workout[], days: number = 30): number {
  if (workouts.length === 0) return 0;

  const { start } = getDateRange('30d');
  const filtered = workouts.filter((w) => new Date(w.date) >= start);

  const uniqueDays = new Set(
    filtered.map((w) => new Date(w.date).toDateString())
  ).size;

  const targetDays = Math.min(days, Math.floor(days * 0.7));
  return Math.min(100, Math.round((uniqueDays / targetDays) * 100));
}

export function getWeeklyWorkoutDays(workouts: Workout[]): boolean[][] {
  const weeks: boolean[][] = [];
  const { start } = getDateRange('30d');

  for (let week = 0; week < 4; week++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + week * 7);
    const weekDays: boolean[] = [];

    for (let day = 0; day < 7; day++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(checkDate.getDate() + day);
      const hasWorkout = workouts.some((w) => {
        const workoutDate = new Date(w.date);
        return (
          workoutDate.getDate() === checkDate.getDate() &&
          workoutDate.getMonth() === checkDate.getMonth() &&
          workoutDate.getFullYear() === checkDate.getFullYear()
        );
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
  return workouts.length >= 7;
}

