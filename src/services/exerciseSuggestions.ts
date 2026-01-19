import { Exercise, WorkoutExercise } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { logger } from '@/utils/logger';
import { exerciseHistoryService } from './exerciseHistory';

export interface SuggestedExercise {
  exercise: Exercise;
  reason: string; // Why this exercise is being suggested
  score: number; // 0-100, higher = better match
}

interface WorkoutContext {
  muscleBalance: Map<MuscleGroup, number>; // Volume per muscle
  equipmentUsed: Set<string>;
  exerciseCount: number;
}

/**
 * Service for generating smart exercise suggestions based on workout context
 */
class ExerciseSuggestionsService {
  // Muscle group pairings (opposing muscles)
  private readonly MUSCLE_PAIRS: Map<MuscleGroup, MuscleGroup[]> = new Map([
    [MuscleGroup.CHEST, [MuscleGroup.BACK, MuscleGroup.LATS]],
    [MuscleGroup.BACK, [MuscleGroup.CHEST]],
    [MuscleGroup.LATS, [MuscleGroup.CHEST]],
    [MuscleGroup.BICEPS, [MuscleGroup.TRICEPS]],
    [MuscleGroup.TRICEPS, [MuscleGroup.BICEPS]],
    [MuscleGroup.QUADS, [MuscleGroup.HAMSTRINGS]],
    [MuscleGroup.HAMSTRINGS, [MuscleGroup.QUADS]],
    [MuscleGroup.FRONT_DELTS, [MuscleGroup.REAR_DELTS]],
    [MuscleGroup.REAR_DELTS, [MuscleGroup.FRONT_DELTS]],
  ]);

  /**
   * Get complementary exercise suggestions based on current workout
   */
  async getComplementaryExercises(
    userId: string,
    currentWorkoutExercises: WorkoutExercise[],
    allExercises: Exercise[],
    limit: number = 5
  ): Promise<SuggestedExercise[]> {
    try {
      if (currentWorkoutExercises.length === 0) {
        // No exercises yet - suggest popular/recent exercises
        return await this.getStarterSuggestions(userId, allExercises, limit);
      }

      const context = this.analyzeWorkoutContext(currentWorkoutExercises);
      const suggestions: SuggestedExercise[] = [];

      for (const exercise of allExercises) {
        // Skip exercises already in workout
        if (currentWorkoutExercises.some(we => we.exerciseId === exercise.id)) {
          continue;
        }

        const score = await this.scoreExercise(exercise, context, userId);
        const reason = this.generateReason(exercise, context, score);

        if (score > 0) {
          suggestions.push({ exercise, reason, score });
        }
      }

      // Sort by score descending and return top N
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      logger.error('[ExerciseSuggestions] Failed to get complementary exercises:', error);
      return [];
    }
  }

  /**
   * Get starter suggestions when no exercises in workout yet
   */
  private async getStarterSuggestions(
    userId: string,
    allExercises: Exercise[],
    limit: number
  ): Promise<SuggestedExercise[]> {
    try {
      const recent = await exerciseHistoryService.getRecentExercises(userId, limit);
      const recentIds = new Set(recent.map(r => r.exerciseId));

      const suggestions: SuggestedExercise[] = allExercises
        .filter(ex => recentIds.has(ex.id))
        .map(exercise => ({
          exercise,
          reason: 'Recently used',
          score: 70,
        }))
        .slice(0, limit);

      return suggestions;
    } catch (error) {
      logger.error('[ExerciseSuggestions] Failed to get starter suggestions:', error);
      return [];
    }
  }

  /**
   * Analyze workout context to understand muscle balance and equipment
   */
  private analyzeWorkoutContext(exercises: WorkoutExercise[]): WorkoutContext {
    const muscleBalance = new Map<MuscleGroup, number>();
    const equipmentUsed = new Set<string>();

    for (const workoutEx of exercises) {
      // Calculate volume for this exercise
      const volume = workoutEx.sets.reduce((sum: number, set) => {
        if (set.completed && set.weight && set.reps) {
          return sum + (set.weight * set.reps);
        }
        return sum;
      }, 0);

      // Distribute volume across muscles worked
      if (workoutEx.musclesWorked && workoutEx.musclesWorked.length > 0) {
        const volumePerMuscle = volume / workoutEx.musclesWorked.length;
        workoutEx.musclesWorked.forEach((muscle: MuscleGroup) => {
          const current = muscleBalance.get(muscle) || 0;
          muscleBalance.set(muscle, current + volumePerMuscle);
        });
      }
    }

    return {
      muscleBalance,
      equipmentUsed,
      exerciseCount: exercises.length,
    };
  }

  /**
   * Score an exercise based on how well it complements the current workout
   */
  private async scoreExercise(
    exercise: Exercise,
    context: WorkoutContext,
    userId: string
  ): Promise<number> {
    let score = 0;

    // Factor 1: Muscle Balance (up to 50 points)
    // Prioritize underworked muscles and opposing muscle groups
    const muscleScore = this.calculateMuscleScore(exercise, context.muscleBalance);
    score += muscleScore * 0.5;

    // Factor 2: Equipment Match (up to 30 points)
    // Prefer exercises using already-selected equipment
    if (exercise.equipment && exercise.equipment.length > 0) {
      const equipmentOverlap = exercise.equipment.filter(eq => context.equipmentUsed.has(eq)).length;
      const equipmentScore = (equipmentOverlap / exercise.equipment.length) * 100;
      score += equipmentScore * 0.3;
    }

    // Factor 3: Usage Frequency (up to 20 points)
    // Slight boost for frequently used exercises
    const stats = await exerciseHistoryService.getExerciseStats(userId, exercise.id);
    if (stats && stats.useCount > 0) {
      const frequencyScore = Math.min(stats.useCount * 5, 100); // Cap at 100
      score += frequencyScore * 0.2;
    }

    // Factor 4: Recency Penalty (subtract up to 10 points)
    // Slight penalty for recently used exercises to encourage variety
    const wasRecent = await exerciseHistoryService.wasRecentlyUsed(userId, exercise.id, 3);
    if (wasRecent) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score)); // Clamp to 0-100
  }

  /**
   * Calculate how well an exercise balances the current muscle distribution
   */
  private calculateMuscleScore(
    exercise: Exercise,
    muscleBalance: Map<MuscleGroup, number>
  ): number {
    if (!exercise.primaryMuscles || exercise.primaryMuscles.length === 0) {
      return 0;
    }

    let score = 0;
    const totalVolume = Array.from(muscleBalance.values()).reduce((sum, vol) => sum + vol, 0);

    for (const muscle of exercise.primaryMuscles) {
      const currentVolume = muscleBalance.get(muscle) || 0;
      const currentPercentage = totalVolume > 0 ? (currentVolume / totalVolume) * 100 : 0;

      // Score inversely proportional to current volume
      // Underworked muscles get higher scores
      const muscleScore = Math.max(0, 100 - currentPercentage);
      score += muscleScore;

      // Bonus for opposing muscle groups
      const workedMuscles = Array.from(muscleBalance.keys());
      for (const workedMuscle of workedMuscles) {
        const opposingMuscles = this.MUSCLE_PAIRS.get(workedMuscle) || [];
        if (opposingMuscles.includes(muscle)) {
          score += 40; // Significant bonus for opposing muscles
        }
      }
    }

    // Average across all primary muscles
    return score / exercise.primaryMuscles.length;
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateReason(
    exercise: Exercise,
    context: WorkoutContext,
    score: number
  ): string {
    const reasons: string[] = [];

    // Check for opposing muscles
    const workedMuscles = Array.from(context.muscleBalance.keys());
    const opposingMuscles: MuscleGroup[] = [];
    for (const workedMuscle of workedMuscles) {
      const opposing = this.MUSCLE_PAIRS.get(workedMuscle) || [];
      opposingMuscles.push(...opposing);
    }

    if (exercise.primaryMuscles?.some(m => opposingMuscles.includes(m))) {
      const targetMuscle = exercise.primaryMuscles.find(m => opposingMuscles.includes(m));
      reasons.push(`Balances ${this.formatMuscleName(targetMuscle!)}`);
    }

    // Check for equipment match
    if (exercise.equipment && exercise.equipment.length > 0) {
      const matchingEquipment = exercise.equipment.filter(eq => context.equipmentUsed.has(eq));
      if (matchingEquipment.length > 0) {
        reasons.push(`Uses ${matchingEquipment[0]}`);
      }
    }

    // Check for underworked muscles
    const underworkedMuscles = exercise.primaryMuscles?.filter(muscle => {
      const volume = context.muscleBalance.get(muscle) || 0;
      return volume < 1000; // Less than 1000 kg total volume
    });
    if (underworkedMuscles && underworkedMuscles.length > 0) {
      reasons.push(`Targets ${this.formatMuscleName(underworkedMuscles[0])}`);
    }

    return reasons.length > 0 ? reasons[0] : 'Recommended';
  }

  /**
   * Format muscle name for display
   */
  private formatMuscleName(muscle: MuscleGroup): string {
    return muscle
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

export const exerciseSuggestionsService = new ExerciseSuggestionsService();
