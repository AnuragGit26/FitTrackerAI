import { Workout } from '@/types/workout';
import { WorkoutSet } from '@/types/exercise';
import { DateRange, filterWorkoutsByDateRange } from '@/utils/analyticsHelpers';

export interface RPETrendData {
  date: string;
  rpe: number;
  exerciseId?: string;
  exerciseName?: string;
}

export interface RPEMetrics {
  averageRPE: number;
  trend: RPETrendData[];
  exerciseBreakdown: Array<{
    exerciseId: string;
    exerciseName: string;
    averageRPE: number;
    setCount: number;
  }>;
  volumeCorrelation: {
    volume: number;
    averageRPE: number;
  }[];
}

export const rpeService = {
  /**
   * Calculate average RPE for workouts
   */
  calculateAverageRPE(workouts: Workout[]): number {
    const allSets: WorkoutSet[] = [];
    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed && set.rpe !== undefined) {
            allSets.push(set);
          }
        });
      });
    });

    if (allSets.length === 0) {
    return 0;
  }

    const sum = allSets.reduce((acc, set) => acc + (set.rpe || 0), 0);
    return sum / allSets.length;
  },

  /**
   * Calculate RPE trend over time
   */
  calculateRPETrend(
    workouts: Workout[],
    range: DateRange = '30d'
  ): RPETrendData[] {
    const filtered = filterWorkoutsByDateRange(workouts, range);
    const trendMap = new Map<string, { rpe: number; count: number }>();

    filtered.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      const dateKey = workoutDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      let totalRPE = 0;
      let setCount = 0;

      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed && set.rpe !== undefined) {
            totalRPE += set.rpe;
            setCount++;
          }
        });
      });

      if (setCount > 0) {
        const avgRPE = totalRPE / setCount;
        const existing = trendMap.get(dateKey);
        if (existing) {
          trendMap.set(dateKey, {
            rpe: (existing.rpe * existing.count + avgRPE) / (existing.count + 1),
            count: existing.count + 1,
          });
        } else {
          trendMap.set(dateKey, { rpe: avgRPE, count: 1 });
        }
      }
    });

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, rpe: data.rpe }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  /**
   * Get RPE breakdown by exercise
   */
  getExerciseBreakdown(workouts: Workout[]): Array<{
    exerciseId: string;
    exerciseName: string;
    averageRPE: number;
    setCount: number;
  }> {
    const exerciseMap = new Map<
      string,
      { name: string; rpe: number; count: number }
    >();

    workouts.forEach((workout) => {
      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed && set.rpe !== undefined) {
            const existing = exerciseMap.get(exercise.exerciseId);
            if (existing) {
              exerciseMap.set(exercise.exerciseId, {
                name: exercise.exerciseName,
                rpe: (existing.rpe * existing.count + set.rpe) / (existing.count + 1),
                count: existing.count + 1,
              });
            } else {
              exerciseMap.set(exercise.exerciseId, {
                name: exercise.exerciseName,
                rpe: set.rpe,
                count: 1,
              });
            }
          }
        });
      });
    });

    return Array.from(exerciseMap.entries())
      .map(([exerciseId, data]) => ({
        exerciseId,
        exerciseName: data.name,
        averageRPE: data.rpe,
        setCount: data.count,
      }))
      .sort((a, b) => b.averageRPE - a.averageRPE);
  },

  /**
   * Calculate RPE vs Volume correlation
   */
  calculateVolumeCorrelation(
    workouts: Workout[],
    range: DateRange = '30d'
  ): { volume: number; averageRPE: number }[] {
    const filtered = filterWorkoutsByDateRange(workouts, range);
    const weeklyData = new Map<
      string,
      { volume: number; rpe: number; count: number }
    >();

    filtered.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      const weekStart = new Date(workoutDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = `Week ${Math.ceil(
        (workoutDate.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )}`;

      let totalRPE = 0;
      let setCount = 0;

      workout.exercises.forEach((exercise) => {
        exercise.sets.forEach((set) => {
          if (set.completed && set.rpe !== undefined) {
            totalRPE += set.rpe;
            setCount++;
          }
        });
      });

      if (setCount > 0) {
        const avgRPE = totalRPE / setCount;
        const existing = weeklyData.get(weekKey);
        if (existing) {
          weeklyData.set(weekKey, {
            volume: existing.volume + workout.totalVolume,
            rpe: (existing.rpe * existing.count + avgRPE) / (existing.count + 1),
            count: existing.count + 1,
          });
        } else {
          weeklyData.set(weekKey, {
            volume: workout.totalVolume,
            rpe: avgRPE,
            count: 1,
          });
        }
      }
    });

    return Array.from(weeklyData.entries())
      .map(([_, data]) => ({
        volume: data.volume,
        averageRPE: data.rpe,
      }))
      .sort((a, b) => a.volume - b.volume);
  },

  /**
   * Get all RPE metrics
   */
  getAllMetrics(workouts: Workout[], range: DateRange = '30d'): RPEMetrics {
    return {
      averageRPE: this.calculateAverageRPE(workouts),
      trend: this.calculateRPETrend(workouts, range),
      exerciseBreakdown: this.getExerciseBreakdown(workouts),
      volumeCorrelation: this.calculateVolumeCorrelation(workouts, range),
    };
  },

  /**
   * Detect RPE trend (increasing/decreasing)
   */
  detectTrend(rpeData: RPETrendData[]): 'increasing' | 'decreasing' | 'stable' {
    if (rpeData.length < 2) {
    return 'stable';
  }

    const recent = rpeData.slice(-7); // Last 7 data points
    if (recent.length < 2) {
    return 'stable';
  }

    const first = recent[0].rpe;
    const last = recent[recent.length - 1].rpe;
    const diff = last - first;

    if (Math.abs(diff) < 0.3) {return 'stable';}
    return diff > 0 ? 'increasing' : 'decreasing';
  },
};

