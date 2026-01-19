import { Workout } from '@/types/workout';
import { isToday, startOfDay, subDays, isSameDay } from 'date-fns';

export type WorkoutType = 'strength' | 'cardio' | 'mixed';

export interface WorkoutPatternAnalysis {
  hasWorkoutToday: boolean;
  todayWorkout: Workout | null;
  workoutFrequency: {
    workoutsPerWeek: number; // Average over last 4 weeks
    consecutiveDays: number; // Current consecutive workout days
    restDayFrequency: number; // Rest days per week
  };
  workoutTypeDistribution: {
    strengthCount: number; // Last 7 days
    cardioCount: number; // Last 7 days
    strengthCount14Days: number;
    cardioCount14Days: number;
    recentTypes: WorkoutType[]; // Last 5 workouts
  };
  volumeTrends: {
    weeklyVolume: number[]; // Last 4 weeks
    averageVolumePerWorkout: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number; // Percentage change
  };
  restDayPatterns: {
    restDaysLastWeek: number;
    averageRestDaysPerWeek: number; // Over last 4 weeks
  };
}

export interface RecommendationContext {
  hasWorkoutToday: boolean;
  todayWorkout: Workout | null;
  patternAnalysis: WorkoutPatternAnalysis;
  readinessScore: number;
  muscleRecoveryPercentages: number[];
  overworkedMuscles: string[];
  userWorkoutFrequencyGoal: number; // Target workouts per week
  userExperienceLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface WorkoutRecommendation {
  type: 'rest' | 'cardio' | 'strength' | 'light_activity';
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  dataPoints: string[]; // Specific data points used in decision
}

export interface CardioMetrics {
  totalDistance: number; // in km
  totalTime: number; // in seconds
  totalSteps: number;
  averagePace: number; // minutes per km
  totalCalories: number;
  workoutCount: number;
}

export const workoutAnalysisService = {
  /**
   * Calculate cardio-specific metrics from workouts
   */
  calculateCardioMetrics(workouts: Workout[]): CardioMetrics {
    const cardioWorkouts = workouts.filter(w => 
      w.workoutType === 'cardio' || this.classifyWorkoutType(w) === 'cardio'
    );

    let totalDistance = 0;
    let totalTime = 0;
    let totalSteps = 0;
    let totalCalories = 0;

    cardioWorkouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (set.completed) {
            if (set.distance !== undefined) {
              const distanceKm = set.distanceUnit === 'miles' 
                ? set.distance * 1.60934 
                : set.distance;
              totalDistance += distanceKm;
            }
            if (set.time !== undefined) {
              totalTime += set.time;
            }
            if (set.steps !== undefined) {
              totalSteps += set.steps;
            }
            if (set.calories !== undefined) {
              totalCalories += set.calories;
            }
          }
        });
      });
      // Also include workout-level calories if set-level calories not available
      if (workout.calories && totalCalories === 0) {
        totalCalories += workout.calories;
      }
    });

    const averagePace = totalDistance > 0 && totalTime > 0
      ? (totalTime / 60) / totalDistance // minutes per km
      : 0;

    return {
      totalDistance,
      totalTime,
      totalSteps,
      averagePace,
      totalCalories,
      workoutCount: cardioWorkouts.length,
    };
  },

  /**
   * Check if user has completed a workout today
   */
  hasWorkoutToday(workouts: Workout[]): boolean {
    return workouts.some(workout => {
      const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
      return isToday(workoutDate);
    });
  },

  /**
   * Get today's workout if it exists
   */
  getTodayWorkout(workouts: Workout[]): Workout | null {
    const todayWorkout = workouts.find(workout => {
      const workoutDate = workout.date instanceof Date ? workout.date : new Date(workout.date);
      return isToday(workoutDate);
    });
    return todayWorkout || null;
  },

  /**
   * Classify workout type based on exercises
   */
  classifyWorkoutType(workout: Workout): WorkoutType {
    if (workout.exercises.length === 0) {
      return 'mixed';
    }

    let strengthCount = 0;
    let cardioCount = 0;

    workout.exercises.forEach(exercise => {
      // Check if exercise is cardio based on tracking type or name
      const isCardio = 
        exercise.exerciseName.toLowerCase().includes('run') ||
        exercise.exerciseName.toLowerCase().includes('cardio') ||
        exercise.exerciseName.toLowerCase().includes('cycling') ||
        exercise.exerciseName.toLowerCase().includes('rowing') ||
        exercise.exerciseName.toLowerCase().includes('treadmill') ||
        exercise.exerciseName.toLowerCase().includes('elliptical') ||
        exercise.sets.some(set => set.distance !== undefined || set.calories !== undefined);

      if (isCardio) {
        cardioCount++;
      } else {
        strengthCount++;
      }
    });

    if (cardioCount > 0 && strengthCount > 0) {
      return 'mixed';
    }
    if (cardioCount > strengthCount) {
      return 'cardio';
    }
    return 'strength';
  },

  /**
   * Analyze workout patterns and trends
   */
  analyzeWorkoutPatterns(workouts: Workout[]): WorkoutPatternAnalysis {
    const today = new Date();
    // Check if workout today
    const hasWorkoutToday = this.hasWorkoutToday(workouts);
    const todayWorkout = this.getTodayWorkout(workouts);

    // Get workouts from last 30 days for analysis
    const thirtyDaysAgo = subDays(today, 30);
    const recentWorkouts = workouts
      .filter(w => {
        const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
        // Check for invalid date
        if (isNaN(workoutDate.getTime())) {return false;}
        return workoutDate >= thirtyDaysAgo;
      })
      .sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        // Handle invalid dates in sort (though filter should catch them)
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
        return timeB - timeA;
      });

    // Calculate consecutive workout days
    let consecutiveDays = 0;
    let checkDate = startOfDay(today);
    
    // If workout today, start counting from today
    if (hasWorkoutToday) {
      consecutiveDays = 1;
      checkDate = subDays(checkDate, 1);
    }

    // Count backwards to find consecutive days
    while (consecutiveDays < 30) {
      const hasWorkoutOnDate = recentWorkouts.some(w => {
        const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
        if (isNaN(workoutDate.getTime())) {return false;}
        return isSameDay(workoutDate, checkDate);
      });

      if (hasWorkoutOnDate) {
        consecutiveDays++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }

    // Calculate workouts per week (last 4 weeks)
    const weeks: Date[][] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = subDays(today, i * 7 + 7);
      const weekEnd = subDays(today, i * 7);
      weeks.push([weekStart, weekEnd]);
    }

    const workoutsPerWeek = weeks.map(([start, end]) => {
      return recentWorkouts.filter(w => {
        const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
        if (isNaN(workoutDate.getTime())) {return false;}
        return workoutDate >= start && workoutDate <= end;
      }).length;
    });

    const avgWorkoutsPerWeekRaw = workoutsPerWeek.reduce((sum, count) => sum + count, 0) / 4;
    const avgWorkoutsPerWeek = isNaN(avgWorkoutsPerWeekRaw) ? 0 : avgWorkoutsPerWeekRaw;

    // Calculate workout type distribution
    const last7Days = subDays(today, 7);
    const last14Days = subDays(today, 14);

    const workoutsLast7Days = recentWorkouts.filter(w => {
      const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
      if (isNaN(workoutDate.getTime())) {return false;}
      return workoutDate >= last7Days;
    });

    const workoutsLast14Days = recentWorkouts.filter(w => {
      const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
      if (isNaN(workoutDate.getTime())) {return false;}
      return workoutDate >= last14Days;
    });

    let strengthCount = 0;
    let cardioCount = 0;
    let strengthCount14Days = 0;
    let cardioCount14Days = 0;

    workoutsLast7Days.forEach(w => {
      const type = this.classifyWorkoutType(w);
      if (type === 'strength' || type === 'mixed') {
        strengthCount++;
      }
      if (type === 'cardio' || type === 'mixed') {
        cardioCount++;
      }
    });

    workoutsLast14Days.forEach(w => {
      const type = this.classifyWorkoutType(w);
      if (type === 'strength' || type === 'mixed') {
        strengthCount14Days++;
      }
      if (type === 'cardio' || type === 'mixed') {
        cardioCount14Days++;
      }
    });

    // Get recent workout types (last 5)
    const recentTypes = recentWorkouts
      .slice(0, 5)
      .map(w => this.classifyWorkoutType(w));

    // Calculate volume trends
    const weeklyVolumes: number[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = subDays(today, i * 7 + 7);
      const weekEnd = subDays(today, i * 7);
      const weekWorkouts = recentWorkouts.filter(w => {
        const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
        return workoutDate >= weekStart && workoutDate <= weekEnd;
      });
      const weekVolume = weekWorkouts.reduce((sum, w) => sum + w.totalVolume, 0);
      weeklyVolumes.push(weekVolume);
    }

    const avgVolumePerWorkout = recentWorkouts.length > 0
      ? recentWorkouts.reduce((sum, w) => sum + w.totalVolume, 0) / recentWorkouts.length
      : 0;

    // Determine volume trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let trendPercentage = 0;
    
    if (weeklyVolumes.length >= 2 && weeklyVolumes[0] > 0) {
      const latest = weeklyVolumes[0];
      const previous = weeklyVolumes[1];
      trendPercentage = ((latest - previous) / previous) * 100;
      
      if (trendPercentage > 5) {
        trend = 'increasing';
      } else if (trendPercentage < -5) {
        trend = 'decreasing';
      }
    }

    // Calculate rest day patterns
    const lastWeekStart = subDays(today, 7);
    const lastWeekWorkouts = recentWorkouts.filter(w => {
      const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
      return workoutDate >= lastWeekStart;
    });
    
    const workoutDates = lastWeekWorkouts.map(w => {
      const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
      return startOfDay(workoutDate).getTime();
    });
    const uniqueWorkoutDays = new Set(workoutDates).size;
    const restDaysLastWeek = Math.max(0, 7 - uniqueWorkoutDays);

    // Average rest days per week (last 4 weeks)
    const restDaysPerWeek = weeks.map(([start, end]) => {
      const weekWorkouts = recentWorkouts.filter(w => {
        const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
        if (isNaN(workoutDate.getTime())) {return false;}
        return workoutDate >= start && workoutDate <= end;
      });
      const weekWorkoutDates = new Set(
        weekWorkouts.map(w => {
          const workoutDate = w.date instanceof Date ? w.date : new Date(w.date);
          return startOfDay(workoutDate).getTime();
        })
      );
      return Math.max(0, 7 - weekWorkoutDates.size);
    });

    const avgRestDaysPerWeekRaw = restDaysPerWeek.reduce((sum, count) => sum + count, 0) / 4;
    const avgRestDaysPerWeek = isNaN(avgRestDaysPerWeekRaw) ? 0 : avgRestDaysPerWeekRaw;

    return {
      hasWorkoutToday,
      todayWorkout,
      workoutFrequency: {
        workoutsPerWeek: Math.round(avgWorkoutsPerWeek * 10) / 10,
        consecutiveDays,
        restDayFrequency: Math.round(avgRestDaysPerWeek * 10) / 10,
      },
      workoutTypeDistribution: {
        strengthCount,
        cardioCount,
        strengthCount14Days,
        cardioCount14Days,
        recentTypes,
      },
      volumeTrends: {
        weeklyVolume: weeklyVolumes,
        averageVolumePerWorkout: Math.round(avgVolumePerWorkout),
        trend,
        trendPercentage: Math.round(trendPercentage * 10) / 10,
      },
      restDayPatterns: {
        restDaysLastWeek,
        averageRestDaysPerWeek: Math.round(avgRestDaysPerWeek * 10) / 10,
      },
    };
  },

  /**
   * Calculate workout recommendation based on context
   */
  calculateWorkoutRecommendation(context: RecommendationContext): WorkoutRecommendation {
    const { 
      hasWorkoutToday, 
      todayWorkout,
      patternAnalysis, 
      readinessScore,
      overworkedMuscles,
      userWorkoutFrequencyGoal 
    } = context;

    const dataPoints: string[] = [];
    let reasoning = '';
    let type: 'rest' | 'cardio' | 'strength' | 'light_activity' = 'rest';
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    // Decision tree based on plan
    if (hasWorkoutToday && todayWorkout) {
      type = 'rest';
      const workoutType = this.classifyWorkoutType(todayWorkout);
      reasoning = `You've already completed a ${workoutType} workout today. Rest is important for recovery and muscle growth.`;
      dataPoints.push(`Workout completed today: ${workoutType}`);
      confidence = 'high';
    } else if (readinessScore < 50) {
      type = 'rest';
      reasoning = `Recovery is low (${readinessScore}%). Your body needs rest to recover properly.`;
      dataPoints.push(`Readiness score: ${readinessScore}%`);
      if (overworkedMuscles.length > 0) {
        dataPoints.push(`Overworked muscles: ${overworkedMuscles.join(', ')}`);
        reasoning += ` ${overworkedMuscles.length} muscle group(s) are overworked.`;
      }
      confidence = 'high';
    } else if (patternAnalysis.workoutFrequency.consecutiveDays >= 3) {
      type = 'light_activity';
      reasoning = `You've trained ${patternAnalysis.workoutFrequency.consecutiveDays} days in a row. Consider active recovery with light cardio or stretching.`;
      dataPoints.push(`Consecutive workout days: ${patternAnalysis.workoutFrequency.consecutiveDays}`);
      confidence = 'high';
    } else if (
      patternAnalysis.workoutTypeDistribution.strengthCount >= 4 && 
      patternAnalysis.workoutTypeDistribution.cardioCount < 2
    ) {
      type = 'cardio';
      reasoning = `You've done ${patternAnalysis.workoutTypeDistribution.strengthCount} strength workouts this week with only ${patternAnalysis.workoutTypeDistribution.cardioCount} cardio session(s). Balance your training with cardio.`;
      dataPoints.push(`Strength workouts this week: ${patternAnalysis.workoutTypeDistribution.strengthCount}`);
      dataPoints.push(`Cardio workouts this week: ${patternAnalysis.workoutTypeDistribution.cardioCount}`);
      confidence = 'high';
    } else if (
      patternAnalysis.workoutTypeDistribution.cardioCount >= 4 && 
      patternAnalysis.workoutTypeDistribution.strengthCount < 2
    ) {
      type = 'strength';
      reasoning = `You've focused on cardio (${patternAnalysis.workoutTypeDistribution.cardioCount} sessions) this week. Add strength training for balanced fitness.`;
      dataPoints.push(`Cardio workouts this week: ${patternAnalysis.workoutTypeDistribution.cardioCount}`);
      dataPoints.push(`Strength workouts this week: ${patternAnalysis.workoutTypeDistribution.strengthCount}`);
      confidence = 'high';
    } else if (
      patternAnalysis.volumeTrends.trend === 'increasing' && 
      readinessScore < 75
    ) {
      type = 'light_activity';
      reasoning = `Volume is increasing (${patternAnalysis.volumeTrends.trendPercentage > 0 ? '+' : ''}${patternAnalysis.volumeTrends.trendPercentage}%) but recovery is moderate (${readinessScore}%). Take it easy today.`;
      dataPoints.push(`Volume trend: ${patternAnalysis.volumeTrends.trendPercentage}%`);
      dataPoints.push(`Readiness score: ${readinessScore}%`);
      confidence = 'medium';
    } else if (readinessScore >= 80 && overworkedMuscles.length === 0) {
      type = 'strength';
      const avgRecovery = context.muscleRecoveryPercentages.length > 0
        ? Math.round(context.muscleRecoveryPercentages.reduce((sum, p) => sum + p, 0) / context.muscleRecoveryPercentages.length)
        : readinessScore;
      reasoning = `Recovery is optimal (${readinessScore}% readiness, ${avgRecovery}% average muscle recovery). Perfect time for strength training.`;
      dataPoints.push(`Readiness score: ${readinessScore}%`);
      dataPoints.push(`Average muscle recovery: ${avgRecovery}%`);
      confidence = 'high';
    } else {
      // Default: moderate activity
      if (readinessScore >= 60) {
        type = 'cardio';
        reasoning = `Moderate recovery (${readinessScore}%). Light to moderate cardio recommended.`;
      } else {
        type = 'light_activity';
        reasoning = `Recovery is moderate (${readinessScore}%). Light activity like walking or stretching recommended.`;
      }
      dataPoints.push(`Readiness score: ${readinessScore}%`);
      confidence = 'medium';
    }

    // Add frequency context if relevant
    if (patternAnalysis.workoutFrequency.workoutsPerWeek > userWorkoutFrequencyGoal * 1.2) {
      dataPoints.push(`Workout frequency: ${patternAnalysis.workoutFrequency.workoutsPerWeek.toFixed(1)}/week (above goal of ${userWorkoutFrequencyGoal})`);
      if (type !== 'rest') {
        reasoning += ` You're training above your target frequency.`;
      }
    } else if (patternAnalysis.workoutFrequency.workoutsPerWeek < userWorkoutFrequencyGoal * 0.8) {
      dataPoints.push(`Workout frequency: ${patternAnalysis.workoutFrequency.workoutsPerWeek.toFixed(1)}/week (below goal of ${userWorkoutFrequencyGoal})`);
    }

    return {
      type,
      reasoning,
      confidence,
      dataPoints,
    };
  },
};

