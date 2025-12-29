import { Workout } from '@/types/workout';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import {
  WorkoutSummaryData,
  SessionComparison,
  MuscleDistribution,
  FocusArea,
  ExerciseTrend,
  ExerciseComparison,
  SetComparison,
  PersonalRecord,
  WorkoutRating,
  AIInsight,
} from '@/types/workoutSummary';
import { rpeService } from './rpeService';
import { workoutHistoryService } from './workoutHistoryService';
import { analyticsService } from './analyticsService';
import { dataService } from './dataService';
import { calculateEstimatedOneRepMax, calculateVolume } from '@/utils/calculations';
import { categorizeMuscleGroup, aggregateVolumeByMuscleGroup } from '@/utils/analyticsHelpers';

export const workoutSummaryService = {
  /**
   * Generate complete workout summary data
   */
  async generateSummary(workoutId: number, userId: string): Promise<WorkoutSummaryData> {
    const workout = await dataService.getWorkout(workoutId);
    if (!workout) {
      throw new Error('Workout not found');
    }

    // Get all workouts for comparisons and trends
    const allWorkouts = await dataService.getAllWorkouts(userId);
    const previousWorkout = this.findPreviousWorkout(workout, allWorkouts);

    // Calculate all summary components
    const sessionComparison = this.calculateSessionComparison(workout, previousWorkout);
    const muscleDistribution = this.calculateMuscleDistribution(workout, previousWorkout);
    const focusArea = this.calculateFocusArea(muscleDistribution);
    const exerciseComparisons = await this.calculateExerciseComparisons(workout, userId);
    const exerciseTrends = this.calculateExerciseTrends(workout, allWorkouts);
    const personalRecords = this.calculatePersonalRecords(workout, allWorkouts);
    const workoutRating = this.calculateWorkoutRating(
      workout,
      previousWorkout,
      allWorkouts,
      exerciseComparisons
    );
    const aiInsights = this.generateAIInsights(
      workout,
      previousWorkout,
      muscleDistribution,
      exerciseComparisons
    );

    return {
      workout,
      sessionComparison,
      muscleDistribution,
      focusArea,
      exerciseComparisons,
      exerciseTrends,
      personalRecords,
      workoutRating,
      aiInsights,
      previousWorkout,
    };
  },

  /**
   * Find the most recent previous workout
   */
  findPreviousWorkout(currentWorkout: Workout, allWorkouts: Workout[]): Workout | undefined {
    const currentDate = new Date(currentWorkout.date);
    const previous = (allWorkouts ?? [])
      .filter((w) => {
        const wDate = new Date(w.date);
        return wDate < currentDate && w.id !== currentWorkout.id;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return previous;
  },

  /**
   * Calculate session comparison metrics
   */
  calculateSessionComparison(
    current: Workout,
    previous?: Workout
  ): SessionComparison {
    const currentRPE = rpeService.calculateAverageRPE([current]);
    const previousRPE = previous ? rpeService.calculateAverageRPE([previous]) : undefined;

    // Calculate intensity (0-100) based on RPE
    const currentIntensity = (currentRPE / 10) * 100;
    const previousIntensity = previousRPE ? (previousRPE / 10) * 100 : undefined;

    return {
      duration: {
        current: current.totalDuration,
        previous: previous?.totalDuration,
        change: previous
          ? current.totalDuration - previous.totalDuration
          : undefined,
        changePercent: previous && previous.totalDuration > 0
          ? ((current.totalDuration - previous.totalDuration) / previous.totalDuration) * 100
          : undefined,
      },
      volume: {
        current: current.totalVolume,
        previous: previous?.totalVolume,
        change: previous ? current.totalVolume - previous.totalVolume : undefined,
        changePercent: previous && previous.totalVolume > 0
          ? ((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100
          : undefined,
      },
      rpe: {
        current: currentRPE,
        previous: previousRPE,
        change: previousRPE ? currentRPE - previousRPE : undefined,
      },
      intensity: {
        current: currentIntensity,
        previous: previousIntensity,
        change: previousIntensity ? currentIntensity - previousIntensity : undefined,
      },
    };
  },

  /**
   * Calculate muscle group distribution
   */
  calculateMuscleDistribution(
    current: Workout,
    previous?: Workout
  ): MuscleDistribution[] {
    const currentVolumeMap = aggregateVolumeByMuscleGroup([current]);
    const previousVolumeMap = previous ? aggregateVolumeByMuscleGroup([previous]) : new Map();

    const totalVolume = Array.from(currentVolumeMap.values()).reduce((sum, vol) => sum + (vol ?? 0), 0);

    const distribution: MuscleDistribution[] = Array.from(currentVolumeMap.entries())
      .map(([muscle, volume]) => {
        const percentage = totalVolume > 0 ? (volume / totalVolume) * 100 : 0;
        const previousVolume = previousVolumeMap.get(muscle) || 0;
        const changePercent =
          previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : undefined;

        return {
          muscle,
          volume,
          percentage,
          changePercent,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    return distribution;
  },

  /**
   * Calculate focus area (push/pull/legs/balanced)
   */
  calculateFocusArea(distribution: MuscleDistribution[]): FocusArea {
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

    let pushVolume = 0;
    let pullVolume = 0;
    let legsVolume = 0;

    distribution.forEach(({ muscle, volume }) => {
      if (pushMuscles.includes(muscle)) pushVolume += volume;
      else if (pullMuscles.includes(muscle)) pullVolume += volume;
      else if (legMuscles.includes(muscle)) legsVolume += volume;
    });

    const total = pushVolume + pullVolume + legsVolume;
    if (total === 0) {
      return { type: 'balanced', percentage: 0 };
    }

    const pushPercent = (pushVolume / total) * 100;
    const pullPercent = (pullVolume / total) * 100;
    const legsPercent = (legsVolume / total) * 100;

    // Determine dominant type
    const maxPercent = Math.max(pushPercent, pullPercent, legsPercent);
    let type: 'push' | 'pull' | 'legs' | 'balanced' = 'balanced';

    if (maxPercent >= 40) {
      if (pushPercent === maxPercent) type = 'push';
      else if (pullPercent === maxPercent) type = 'pull';
      else if (legsPercent === maxPercent) type = 'legs';
    }

    return {
      type,
      percentage: maxPercent,
      volumeChange: pushVolume + pullVolume + legsVolume, // Total volume for change calculation
    };
  },

  /**
   * Calculate exercise comparisons with previous workout
   */
  async calculateExerciseComparisons(
    workout: Workout,
    userId: string
  ): Promise<ExerciseComparison[]> {
    const comparisons: ExerciseComparison[] = [];

    for (const exercise of workout.exercises ?? []) {
      const previousData = await workoutHistoryService.getLastWorkoutForExercise(
        userId,
        exercise.exerciseId
      );

      const currentSets = (exercise.sets ?? []).filter((s) => s.completed);
      const previousSets = (previousData?.sets ?? []).filter((s) => s.completed);

      // Create set comparisons
      const setComparisons: SetComparison[] = currentSets.map((currentSet, index) => {
        const previousSet = previousSets.find((s) => s.setNumber === currentSet.setNumber) ||
          previousSets[index];

        const currentVolume =
          (currentSet.weight || 0) * (currentSet.reps || 0);
        const previousVolume = previousSet
          ? (previousSet.weight || 0) * (previousSet.reps || 0)
          : undefined;

        return {
          setNumber: currentSet.setNumber,
          previous: previousSet
            ? {
                weight: previousSet.weight,
                reps: previousSet.reps,
                rpe: previousSet.rpe,
                volume: previousVolume,
              }
            : undefined,
          current: {
            weight: currentSet.weight,
            reps: currentSet.reps,
            rpe: currentSet.rpe,
            volume: currentVolume,
          },
          delta: previousSet
            ? {
                weight:
                  currentSet.weight && previousSet.weight
                    ? currentSet.weight - previousSet.weight
                    : undefined,
                reps:
                  currentSet.reps && previousSet.reps
                    ? currentSet.reps - previousSet.reps
                    : undefined,
                volume: previousVolume !== undefined
                  ? currentVolume - previousVolume
                  : undefined,
              }
            : undefined,
        };
      });

      // Find best set
      const bestSet = currentSets.length > 0 ? currentSets.reduce(
        (best, set) => {
          const volume = (set.weight ?? 0) * (set.reps ?? 0);
          const bestVolume = (best.weight ?? 0) * (best.reps ?? 0);
          return volume > bestVolume ? set : best;
        },
        currentSets[0]
      ) : undefined;

      // Calculate estimated 1RM from best set
      const estimated1RM =
        bestSet?.weight && bestSet?.reps
          ? calculateEstimatedOneRepMax(bestSet.weight, bestSet.reps)
          : undefined;

      const previousVolume = previousData?.totalVolume ?? 0;
      const volumeChange = (exercise.totalVolume ?? 0) - previousVolume;

      comparisons.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        currentSets,
        previousSets,
        setComparisons,
        currentVolume: exercise.totalVolume,
        previousVolume: previousVolume > 0 ? previousVolume : undefined,
        volumeChange: previousVolume > 0 ? volumeChange : undefined,
        estimated1RM,
        bestSet: bestSet?.weight && bestSet?.reps
          ? {
              weight: bestSet.weight,
              reps: bestSet.reps,
              volume: (bestSet.weight ?? 0) * (bestSet.reps ?? 0),
            }
          : undefined,
      });
    }

    return comparisons;
  },

  /**
   * Calculate exercise trends for sparklines
   */
  calculateExerciseTrends(workout: Workout, allWorkouts: Workout[]): ExerciseTrend[] {
    const trends: ExerciseTrend[] = [];

    (workout.exercises ?? []).forEach((exercise) => {
      // Get last 5 workouts containing this exercise
      const exerciseWorkouts = (allWorkouts ?? [])
        .filter((w) => {
          const ex = (w.exercises ?? []).find((e) => e.exerciseId === exercise.exerciseId);
          return ex && (ex.sets ?? []).some((s) => s.completed);
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .reverse(); // Oldest first for trend

      const dataPoints = exerciseWorkouts.map((w) => {
        const ex = (w.exercises ?? []).find((e) => e.exerciseId === exercise.exerciseId);
        if (!ex) return null;
        const completedSets = (ex.sets ?? []).filter((s) => s.completed);
        const maxWeight = completedSets.length > 0 ? Math.max(
          ...completedSets.map((s) => s.weight ?? 0),
          0
        ) : 0;
        const maxReps = completedSets.length > 0 ? Math.max(...completedSets.map((s) => s.reps ?? 0), 0) : 0;

        return {
          date: new Date(w.date),
          volume: ex.totalVolume ?? 0,
          maxWeight: maxWeight > 0 ? maxWeight : undefined,
          maxReps: maxReps > 0 ? maxReps : undefined,
        };
      }).filter((dp): dp is NonNullable<typeof dp> => dp !== null);

      // Add current workout
      const completedSets = (exercise.sets ?? []).filter((s) => s.completed);
      const maxWeight = completedSets.length > 0 ? Math.max(...completedSets.map((s) => s.weight ?? 0), 0) : 0;
      const maxReps = completedSets.length > 0 ? Math.max(...completedSets.map((s) => s.reps ?? 0), 0) : 0;
      dataPoints.push({
        date: new Date(workout.date),
        volume: exercise.totalVolume ?? 0,
        maxWeight: maxWeight > 0 ? maxWeight : undefined,
        maxReps: maxReps > 0 ? maxReps : undefined,
      });

      // Generate sparkline data (normalized 0-100)
      const volumes = dataPoints.map((dp) => dp.volume);
      const maxVolume = Math.max(...volumes, 1);
      const sparklineData = volumes.map((vol) => (vol / maxVolume) * 100);

      // Calculate trend
      if (dataPoints.length < 2) {
        trends.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          dataPoints,
          currentVolume: exercise.totalVolume,
          trend: 'stable',
          sparklineData,
        });
        return;
      }

      const firstVolume = dataPoints[0].volume;
      const lastVolume = dataPoints[dataPoints.length - 1].volume;
      const changePercent =
        firstVolume > 0 ? ((lastVolume - firstVolume) / firstVolume) * 100 : 0;

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (changePercent > 5) trend = 'increasing';
      else if (changePercent < -5) trend = 'decreasing';

      trends.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        dataPoints,
        currentVolume: exercise.totalVolume,
        previousVolume: dataPoints.length > 1 ? dataPoints[dataPoints.length - 2].volume : undefined,
        changePercent: dataPoints.length > 1 ? changePercent : undefined,
        trend,
        sparklineData,
      });
    });

    return trends;
  },

  /**
   * Calculate personal records achieved in this workout
   */
  calculatePersonalRecords(workout: Workout, allWorkouts: Workout[]): PersonalRecord[] {
    const records: PersonalRecord[] = [];
    const previousWorkouts = (allWorkouts ?? []).filter((w) => {
      const wDate = new Date(w.date);
      const currentDate = new Date(workout.date);
      return wDate < currentDate && w.id !== workout.id;
    });

    (workout.exercises ?? []).forEach((exercise) => {
      const completedSets = (exercise.sets ?? []).filter((s) => s.completed);

      // Check for 1RM PR
      completedSets.forEach((set) => {
        if (set.weight && set.reps) {
          const estimated1RM = calculateEstimatedOneRepMax(set.weight, set.reps);

          // Find previous max 1RM for this exercise
          let previousMax1RM = 0;
          previousWorkouts.forEach((w) => {
            const prevEx = (w.exercises ?? []).find((e) => e.exerciseId === exercise.exerciseId);
            if (prevEx) {
              (prevEx.sets ?? [])
                .filter((s) => s.completed && s.weight && s.reps)
                .forEach((s) => {
                  const prev1RM = calculateEstimatedOneRepMax(s.weight!, s.reps!);
                  if (prev1RM > previousMax1RM) previousMax1RM = prev1RM;
                });
            }
          });

          if (estimated1RM > previousMax1RM && previousMax1RM > 0) {
            records.push({
              type: '1rm',
              exerciseId: exercise.exerciseId,
              exerciseName: exercise.exerciseName,
              value: estimated1RM,
              unit: 'kg',
              previousValue: previousMax1RM,
              workoutId: workout.id!,
              date: new Date(workout.date),
            });
          }
        }
      });

      // Check for volume PR
      const previousMaxVolume = previousWorkouts.length > 0 ? Math.max(
        ...previousWorkouts
          .map((w) => {
            const prevEx = (w.exercises ?? []).find((e) => e.exerciseId === exercise.exerciseId);
            return prevEx?.totalVolume ?? 0;
          })
          .filter((v) => v > 0),
        0
      ) : 0;

      if ((exercise.totalVolume ?? 0) > previousMaxVolume && previousMaxVolume > 0) {
        records.push({
          type: 'volume',
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          value: exercise.totalVolume ?? 0,
          unit: 'kg',
          previousValue: previousMaxVolume,
          workoutId: workout.id!,
          date: new Date(workout.date),
        });
      }
    });

    // Check for total workout volume PR
    const previousMaxTotalVolume = previousWorkouts.length > 0 ? Math.max(
      ...previousWorkouts.map((w) => w.totalVolume ?? 0),
      0
    ) : 0;
    if ((workout.totalVolume ?? 0) > previousMaxTotalVolume && previousMaxTotalVolume > 0) {
      records.push({
        type: 'volume',
        value: workout.totalVolume ?? 0,
        unit: 'kg',
        previousValue: previousMaxTotalVolume,
        workoutId: workout.id!,
        date: new Date(workout.date),
      });
    }

    return records;
  },

  /**
   * Calculate workout rating (0-10 scale)
   */
  calculateWorkoutRating(
    workout: Workout,
    previous?: Workout,
    allWorkouts?: Workout[],
    exerciseComparisons?: ExerciseComparison[]
  ): WorkoutRating {
    // Volume factor (0-10)
    const avgVolume = allWorkouts && allWorkouts.length > 0
      ? allWorkouts.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0) / allWorkouts.length
      : workout.totalVolume ?? 0;
    const volumeScore = avgVolume > 0 ? Math.min(10, ((workout.totalVolume ?? 0) / (avgVolume * 1.5)) * 10) : 0;

    // Intensity factor (0-10) based on RPE
    const avgRPE = rpeService.calculateAverageRPE([workout]);
    const intensityScore = (avgRPE / 10) * 10;

    // Consistency factor (0-10) - based on completing all sets
    const totalSets = (workout.exercises ?? []).reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0);
    const completedSets = (workout.exercises ?? []).reduce(
      (sum, ex) => sum + (ex.sets ?? []).filter((s) => s.completed).length,
      0
    );
    const consistencyScore = totalSets > 0 ? (completedSets / totalSets) * 10 : 0;

    // Progression factor (0-10) - based on improvements vs previous
    let progressionScore = 5; // Default neutral
    if (previous && exerciseComparisons && exerciseComparisons.length > 0) {
      const improvements = exerciseComparisons.filter(
        (comp) => comp.volumeChange && comp.volumeChange > 0
      ).length;
      const totalExercises = exerciseComparisons.length;
      progressionScore = totalExercises > 0 ? (improvements / totalExercises) * 10 : 5;
    }

    // Calculate overall score
    const overallScore =
      (volumeScore * 0.3 +
        intensityScore * 0.3 +
        consistencyScore * 0.2 +
        progressionScore * 0.2);

    // Determine tier
    let tier: 'S-Tier' | 'A-Tier' | 'B-Tier' | 'C-Tier' | 'D-Tier' = 'C-Tier';
    if (overallScore >= 9) tier = 'S-Tier';
    else if (overallScore >= 8) tier = 'A-Tier';
    else if (overallScore >= 6.5) tier = 'B-Tier';
    else if (overallScore >= 5) tier = 'C-Tier';
    else tier = 'D-Tier';

    // Generate summary
    const volumeChange = previous && previous.totalVolume && previous.totalVolume > 0
      ? (((workout.totalVolume ?? 0) - previous.totalVolume) / previous.totalVolume) * 100
      : 0;
    const summary =
      volumeChange > 0
        ? `Incredible work! You increased your total volume by ${Math.round(volumeChange)}% and maintained a high RPE.`
        : overallScore >= 8
        ? `Great session! You maintained high intensity and consistency throughout.`
        : `Solid workout. Keep pushing to improve your performance metrics.`;

    return {
      score: Math.round(overallScore * 10) / 10,
      tier,
      factors: {
        volume: Math.round(volumeScore * 10) / 10,
        intensity: Math.round(intensityScore * 10) / 10,
        consistency: Math.round(consistencyScore * 10) / 10,
        progression: Math.round(progressionScore * 10) / 10,
      },
      summary,
    };
  },

  /**
   * Generate AI insights
   */
  generateAIInsights(
    workout: Workout,
    previous?: Workout,
    muscleDistribution?: MuscleDistribution[],
    exerciseComparisons?: ExerciseComparison[]
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    // Volume spike insight
    if (previous && previous.totalVolume && previous.totalVolume > 0 && muscleDistribution && muscleDistribution.length > 0) {
      const volumeChange = (((workout.totalVolume ?? 0) - previous.totalVolume) / previous.totalVolume) * 100;
      if (volumeChange > 15) {
        const topMuscle = muscleDistribution[0];
        if (topMuscle && topMuscle.muscle) {
          insights.push({
            type: 'volume',
            title: 'Volume Spike Detected',
            message: `Your ${topMuscle.muscle.toLowerCase()} volume spiked by ${Math.round(
              topMuscle.changePercent || 0
            )}% today. Consider adding an extra rest day before your next heavy session to maximize hypertrophy.`,
            recommendation: 'Add 1-2 extra rest days before targeting this muscle group again.',
            priority: 'high',
          });
        }
      }
    }

    // Recovery insight
    if (muscleDistribution && muscleDistribution.length > 0) {
      const topMuscle = muscleDistribution[0];
      if (topMuscle && topMuscle.muscle && topMuscle.changePercent && topMuscle.changePercent > 10) {
        insights.push({
          type: 'recovery',
          title: 'Recovery Insight',
          message: `Your ${topMuscle.muscle.toLowerCase()} volume increased by ${Math.round(
            topMuscle.changePercent
          )}% today. Consider adding an extra rest day before your next heavy push session to maximize hypertrophy.`,
          recommendation: 'Monitor recovery and adjust rest days accordingly.',
          priority: 'medium',
        });
      }
    }

    // Progression insight
    if (exerciseComparisons && exerciseComparisons.length > 0) {
      const improvements = exerciseComparisons.filter(
        (comp) => comp.volumeChange && comp.volumeChange > 0
      );
      if (improvements.length > 0) {
        insights.push({
          type: 'progression',
          title: 'Strong Progression',
          message: `You improved performance on ${improvements.length} exercise${
            improvements.length > 1 ? 's' : ''
          } compared to your last session. Keep up the momentum!`,
          priority: 'low',
        });
      }
    }

    // Default insight if none generated
    if (insights.length === 0) {
      insights.push({
        type: 'general',
        title: 'Workout Complete',
        message: 'Great job completing your workout! Track your progress and stay consistent.',
        priority: 'low',
      });
    }

    return insights;
  },
};

