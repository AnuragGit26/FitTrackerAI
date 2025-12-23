import { Workout } from '@/types/workout';
import { PersonalRecord, VolumeData, StrengthProgression, MuscleBalance } from '@/types/analytics';
import { MuscleGroup } from '@/types/muscle';
import {
  getDateRange,
  filterWorkoutsByDateRange,
  calculatePersonalRecords,
  categorizeMuscleGroup,
  aggregateVolumeByMuscleGroup,
  calculateConsistencyScore,
  getWeeklyWorkoutDays,
  hasEnoughWorkoutsForAverages,
  DateRange,
} from '@/utils/analyticsHelpers';
import { calculateEstimatedOneRepMax } from '@/utils/calculations';
import { exerciseMuscleMap } from '@/services/muscleMapping';

export interface AnalyticsMetrics {
  totalVolume: number;
  workoutCount: number;
  currentStreak: number;
  consistencyScore: number;
  volumeTrend: VolumeData[];
  personalRecords: PersonalRecord[];
  strengthProgression: StrengthProgression[];
  muscleVolume: Map<MuscleGroup, number>;
  focusDistribution: {
    legs: number;
    push: number;
    pull: number;
  };
  symmetryScore: number;
  totalCalories?: number;
  averageCalories?: number;
  caloriesTrend?: Array<{ date: string; calories: number }>;
}

export const analyticsService = {
  calculateTotalVolume(workouts: Workout[]): number {
    return workouts.reduce((sum, w) => sum + w.totalVolume, 0);
  },

  calculateVolumeTrend(workouts: Workout[], range: DateRange = '30d'): VolumeData[] {
    const filtered = filterWorkoutsByDateRange(workouts, range);
    const { start } = getDateRange(range);

    const weeklyData: Map<string, number> = new Map();
    const weekCount = range === '30d' ? 4 : range === '90d' ? 12 : 52;

    for (let week = 0; week < weekCount; week++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekKey = `Week ${week + 1}`;
      const weekVolume = filtered
        .filter((w) => {
          const workoutDate = new Date(w.date);
          return workoutDate >= weekStart && workoutDate <= weekEnd;
        })
        .reduce((sum, w) => sum + w.totalVolume, 0);

      weeklyData.set(weekKey, weekVolume);
    }

    return Array.from(weeklyData.entries()).map(([date, totalVolume]) => ({
      date,
      totalVolume,
      volumeByMuscle: {},
    }));
  },

  getPersonalRecords(workouts: Workout[]): PersonalRecord[] {
    return calculatePersonalRecords(workouts);
  },

  calculateStrengthProgression(
    workouts: Workout[],
    exerciseNames: string[] = ['Barbell Squat', 'Barbell Bench Press', 'Barbell Deadlift']
  ): StrengthProgression[] {
    const progressions: StrengthProgression[] = [];

    exerciseNames.forEach((exerciseName) => {
      const dataPoints: StrengthProgression['dataPoints'] = [];
      const exerciseWorkouts = workouts
        .flatMap((w) =>
          w.exercises
            .filter((e) => e.exerciseName === exerciseName)
            .map((e) => ({ workout: w, exercise: e }))
        )
        .sort((a, b) => new Date(a.workout.date).getTime() - new Date(b.workout.date).getTime());

      exerciseWorkouts.forEach(({ workout, exercise }) => {
        const maxSet = exercise.sets
          .filter((s) => s.completed)
          .reduce(
            (max, set) => {
              const estimated1RM = calculateEstimatedOneRepMax(set.weight, set.reps);
              return estimated1RM > max.estimated1RM ? { ...set, estimated1RM } : max;
            },
            { estimated1RM: 0, weight: 0, reps: 0 }
          );

        if (maxSet.estimated1RM > 0) {
          dataPoints.push({
            date: new Date(workout.date).toISOString().split('T')[0],
            maxWeight: maxSet.weight,
            maxReps: maxSet.reps,
            totalVolume: exercise.totalVolume,
          });
        }
      });

      if (dataPoints.length > 0) {
        progressions.push({
          exerciseId: exerciseWorkouts[0]?.exercise.exerciseId || '',
          exerciseName,
          dataPoints,
        });
      }
    });

    return progressions;
  },

  calculateMuscleVolume(workouts: Workout[]): Map<MuscleGroup, number> {
    return aggregateVolumeByMuscleGroup(workouts);
  },

  calculateFocusDistribution(workouts: Workout[]): {
    legs: number;
    push: number;
    pull: number;
  } {
    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    const distribution = { legs: 0, push: 0, pull: 0 };

    muscleVolume.forEach((volume, muscle) => {
      const category = categorizeMuscleGroup(muscle);
      distribution[category] += volume;
    });

    const total = distribution.legs + distribution.push + distribution.pull;
    if (total === 0) return { legs: 0, push: 0, pull: 0 };

    // For new users with < 7 workouts, still show distribution but indicate it's preliminary
    const percentages = {
      legs: Math.round((distribution.legs / total) * 100),
      push: Math.round((distribution.push / total) * 100),
      pull: Math.round((distribution.pull / total) * 100),
    };

    return percentages;
  },

  calculateSymmetryScore(workouts: Workout[]): number {
    // Only calculate averages if user has enough workouts
    if (!hasEnoughWorkoutsForAverages(workouts)) {
      return 85; // Default score for new users
    }

    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    
    const leftRightPairs: Array<[MuscleGroup, MuscleGroup]> = [
      [MuscleGroup.QUADS, MuscleGroup.QUADS],
      [MuscleGroup.HAMSTRINGS, MuscleGroup.HAMSTRINGS],
      [MuscleGroup.BICEPS, MuscleGroup.BICEPS],
      [MuscleGroup.TRICEPS, MuscleGroup.TRICEPS],
    ];

    let totalBalance = 0;
    let pairCount = 0;

    leftRightPairs.forEach(([left, right]) => {
      const leftVol = muscleVolume.get(left) || 0;
      const rightVol = muscleVolume.get(right) || 0;
      
      if (leftVol > 0 || rightVol > 0) {
        const maxVol = Math.max(leftVol, rightVol);
        const minVol = Math.min(leftVol, rightVol);
        const balance = maxVol > 0 ? (minVol / maxVol) * 100 : 100;
        totalBalance += balance;
        pairCount++;
      }
    });

    return pairCount > 0 ? Math.round(totalBalance / pairCount) : 85;
  },

  getMostActiveMuscles(workouts: Workout[], count: number = 3): MuscleGroup[] {
    const muscleVolume = aggregateVolumeByMuscleGroup(workouts);
    return Array.from(muscleVolume.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([muscle]) => muscle);
  },

  getMostActiveMuscleNames(workouts: Workout[], count: number = 3): string[] {
    const muscles = this.getMostActiveMuscles(workouts, count);
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
    return muscles.map((m) => labels[m] || m);
  },

  getConsistencyData(workouts: Workout[]): {
    score: number;
    weeklyDays: boolean[][];
  } {
    return {
      score: calculateConsistencyScore(workouts),
      weeklyDays: getWeeklyWorkoutDays(workouts),
    };
  },

  calculateTotalCalories(workouts: Workout[]): number {
    return workouts.reduce((sum, w) => sum + (w.calories || 0), 0);
  },

  calculateAverageCalories(workouts: Workout[]): number {
    const workoutsWithCalories = workouts.filter(w => w.calories !== undefined && w.calories > 0);
    if (workoutsWithCalories.length === 0) return 0;
    return Math.round(this.calculateTotalCalories(workoutsWithCalories) / workoutsWithCalories.length);
  },

  calculateCaloriesTrend(workouts: Workout[], range: DateRange = '30d'): Array<{ date: string; calories: number }> {
    const filtered = filterWorkoutsByDateRange(workouts, range);
    const { start } = getDateRange(range);
    const weekCount = range === '30d' ? 4 : range === '90d' ? 12 : 52;

    const weeklyData: Map<string, number> = new Map();

    for (let week = 0; week < weekCount; week++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekKey = weekStart.toISOString().split('T')[0];
      const weekWorkouts = filtered.filter(w => {
        const workoutDate = new Date(w.date);
        return workoutDate >= weekStart && workoutDate <= weekEnd;
      });

      const weekCalories = weekWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
      weeklyData.set(weekKey, weekCalories);
    }

    return Array.from(weeklyData.entries()).map(([date, calories]) => ({
      date,
      calories,
    }));
  },

  getAllMetrics(workouts: Workout[], range: DateRange = '30d'): AnalyticsMetrics {
    const filtered = filterWorkoutsByDateRange(workouts, range);

    return {
      totalVolume: this.calculateTotalVolume(filtered),
      workoutCount: filtered.length,
      currentStreak: 0,
      consistencyScore: calculateConsistencyScore(filtered),
      volumeTrend: this.calculateVolumeTrend(filtered, range),
      personalRecords: this.getPersonalRecords(filtered),
      strengthProgression: this.calculateStrengthProgression(filtered),
      muscleVolume: this.calculateMuscleVolume(filtered),
      focusDistribution: this.calculateFocusDistribution(filtered),
      symmetryScore: this.calculateSymmetryScore(filtered),
      totalCalories: this.calculateTotalCalories(filtered),
      averageCalories: this.calculateAverageCalories(filtered),
      caloriesTrend: this.calculateCaloriesTrend(filtered, range),
    };
  },
};

