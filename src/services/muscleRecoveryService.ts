import { Workout } from '@/types/workout';
import { WorkoutExercise } from '@/types/exercise';
import { MuscleGroup, MuscleStatus } from '@/types/muscle';
import { getMuscleMapping } from './muscleMapping';
import { calculateWorkloadScore } from './recoveryCalculator';
import { dataService } from './dataService';
import { subDays } from 'date-fns';

/**
 * Service for calculating and updating muscle recovery statuses from workouts
 */
class MuscleRecoveryService {
  /**
   * Calculate workload score for a specific muscle from an exercise
   */
  calculateWorkloadForMuscle(
    muscle: MuscleGroup,
    exercise: WorkoutExercise,
    mapping: { primary: MuscleGroup[]; secondary: MuscleGroup[]; intensity: 'high' | 'medium' | 'low' }
  ): number {
    const isPrimary = mapping.primary.includes(muscle);
    const isSecondary = mapping.secondary.includes(muscle);

    if (!isPrimary && !isSecondary) return 0;

    // Calculate volume contribution for this muscle
    const totalMuscles = mapping.primary.length + mapping.secondary.length;
    const muscleVolume = exercise.totalVolume / totalMuscles;

    // Primary muscles get full intensity, secondary get 0.5x
    const intensityMultiplier = isPrimary ? 1.0 : 0.5;
    const adjustedVolume = muscleVolume * intensityMultiplier;

    // Calculate workload score using the recovery calculator
    const workloadScore = calculateWorkloadScore(
      adjustedVolume,
      mapping.intensity,
      exercise.sets.find(s => s.completed)?.rpe
    );

    return workloadScore;
  }

  /**
   * Calculate total volume for a muscle over the last 7 days
   */
  calculateVolumeLast7Days(muscle: MuscleGroup, workouts: Workout[]): number {
    const sevenDaysAgo = subDays(new Date(), 7);
    let totalVolume = 0;

    workouts.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      if (workoutDate < sevenDaysAgo) return;

      workout.exercises.forEach((exercise) => {
        const mapping = getMuscleMapping(exercise.exerciseName);
        if (!mapping) return;

        const isPrimary = mapping.primary.includes(muscle);
        const isSecondary = mapping.secondary.includes(muscle);
        if (!isPrimary && !isSecondary) return;

        const totalMuscles = mapping.primary.length + mapping.secondary.length;
        const muscleVolume = exercise.totalVolume / totalMuscles;
        const intensityMultiplier = isPrimary ? 1.0 : 0.5;
        totalVolume += muscleVolume * intensityMultiplier;
      });
    });

    return totalVolume;
  }

  /**
   * Calculate training frequency (times per week) for a muscle
   */
  calculateTrainingFrequency(muscle: MuscleGroup, workouts: Workout[]): number {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const muscleWorkouts = new Set<string>();

    workouts.forEach((workout) => {
      const workoutDate = new Date(workout.date);
      if (workoutDate < thirtyDaysAgo) return;

      workout.exercises.forEach((exercise) => {
        const mapping = getMuscleMapping(exercise.exerciseName);
        if (!mapping) return;

        if (mapping.primary.includes(muscle) || mapping.secondary.includes(muscle)) {
          const dateKey = workoutDate.toDateString();
          muscleWorkouts.add(dateKey);
        }
      });
    });

    // Convert to times per week (average over 30 days)
    const uniqueDays = muscleWorkouts.size;
    return (uniqueDays / 30) * 7;
  }

  /**
   * Get all unique muscles worked in a workout
   */
  getMusclesFromWorkout(workout: Workout): Set<MuscleGroup> {
    const muscles = new Set<MuscleGroup>();

    workout.exercises.forEach((exercise) => {
      const mapping = getMuscleMapping(exercise.exerciseName);
      if (mapping) {
        mapping.primary.forEach(m => muscles.add(m));
        mapping.secondary.forEach(m => muscles.add(m));
      }
      // Also check musclesWorked array if it exists
      if (exercise.musclesWorked) {
        exercise.musclesWorked.forEach(m => muscles.add(m));
      }
    });

    return muscles;
  }

  /**
   * Update muscle statuses from a completed workout
   */
  async updateMuscleStatusesFromWorkout(workout: Workout, userId: string): Promise<void> {
    const muscles = this.getMusclesFromWorkout(workout);
    const workoutDate = new Date(workout.date);

    // Get all workouts for calculating volume and frequency
    const allWorkouts = await dataService.getAllWorkouts(userId);

    for (const muscle of muscles) {
      // Get existing muscle status or create new one
      const existingStatus = await dataService.getMuscleStatus(muscle);

      // Calculate workload for this muscle from this workout
      let totalWorkload = 0;
      workout.exercises.forEach((exercise) => {
        const mapping = getMuscleMapping(exercise.exerciseName);
        if (mapping) {
          totalWorkload += this.calculateWorkloadForMuscle(muscle, exercise, mapping);
        }
      });

      // Calculate volume last 7 days
      const volumeLast7Days = this.calculateVolumeLast7Days(muscle, allWorkouts);

      // Calculate training frequency
      const trainingFrequency = this.calculateTrainingFrequency(muscle, allWorkouts);

      // Update or create muscle status
      const updatedStatus: MuscleStatus = {
        id: existingStatus?.id,
        muscle,
        lastWorked: workoutDate,
        recoveryStatus: 'sore', // Will be recalculated by recovery calculator
        recoveryPercentage: 0, // Will be recalculated by recovery calculator
        workloadScore: totalWorkload,
        recommendedRestDays: 0, // Will be recalculated by recovery calculator
        totalVolumeLast7Days: volumeLast7Days,
        trainingFrequency,
      };

      await dataService.upsertMuscleStatus(updatedStatus);
    }
  }

  /**
   * Recalculate muscle statuses after a workout is edited
   * This is called when a workout is updated to ensure muscle recovery is accurate
   */
  async recalculateMuscleStatusesAfterWorkoutUpdate(workoutId: number, userId: string): Promise<void> {
    try {
      // Get the updated workout
      const workout = await dataService.getWorkout(workoutId);
      if (!workout) {
        console.warn(`Workout ${workoutId} not found for muscle recovery recalculation`);
        return;
      }

      // Recalculate all muscle statuses (this will include the updated workout)
      await this.recalculateAllMuscleStatuses(userId);
    } catch (error) {
      console.error('Failed to recalculate muscle statuses after workout update:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Initialize muscle statuses from workout history
   */
  async initializeMuscleStatusesFromHistory(workouts: Workout[], _userId: string): Promise<void> {
    if (workouts.length === 0) return;

    // Get all unique muscles from all workouts
    const allMuscles = new Set<MuscleGroup>();
    workouts.forEach((workout) => {
      const muscles = this.getMusclesFromWorkout(workout);
      muscles.forEach(m => allMuscles.add(m));
    });

    // For each muscle, find the most recent workout and create/update status
    for (const muscle of allMuscles) {
      // Find most recent workout that worked this muscle
      let mostRecentWorkout: Workout | null = null;
      let mostRecentDate: Date | null = null;

      workouts.forEach((workout) => {
        const muscles = this.getMusclesFromWorkout(workout);
        if (muscles.has(muscle)) {
          const workoutDate = new Date(workout.date);
          if (!mostRecentDate || workoutDate > mostRecentDate) {
            mostRecentDate = workoutDate;
            mostRecentWorkout = workout;
          }
        }
      });

      if (!mostRecentWorkout || !mostRecentDate) continue;

      // Check if status already exists
      const existingStatus = await dataService.getMuscleStatus(muscle);
      if (existingStatus) continue; // Skip if already exists

      // Calculate metrics
      const volumeLast7Days = this.calculateVolumeLast7Days(muscle, workouts);
      const trainingFrequency = this.calculateTrainingFrequency(muscle, workouts);

      // Calculate workload from most recent workout
      // TypeScript needs explicit type assertion after the null check
      const workout: Workout = mostRecentWorkout;
      let totalWorkload = 0;
      workout.exercises.forEach((exercise: WorkoutExercise) => {
        const mapping = getMuscleMapping(exercise.exerciseName);
        if (mapping) {
          totalWorkload += this.calculateWorkloadForMuscle(muscle, exercise, mapping);
        }
      });

      // Create initial status
      const initialStatus: MuscleStatus = {
        muscle,
        lastWorked: mostRecentDate,
        recoveryStatus: 'sore', // Will be recalculated by recovery calculator
        recoveryPercentage: 0, // Will be recalculated by recovery calculator
        workloadScore: totalWorkload,
        recommendedRestDays: 0, // Will be recalculated by recovery calculator
        totalVolumeLast7Days: volumeLast7Days,
        trainingFrequency,
      };

      await dataService.createMuscleStatus(initialStatus);
    }
  }

  /**
   * Trigger recalculation of all muscle recovery statuses
   * This can be called from outside React components (e.g., service worker)
   */
  async recalculateAllMuscleStatuses(userId: string): Promise<void> {
    try {
      const allWorkouts = await dataService.getAllWorkouts(userId);
      const allStatuses = await dataService.getAllMuscleStatuses();
      
      // Get all unique muscles from workouts
      const allMuscles = new Set<MuscleGroup>();
      allWorkouts.forEach((workout) => {
        const muscles = this.getMusclesFromWorkout(workout);
        muscles.forEach(m => allMuscles.add(m));
      });

      // Recalculate status for each muscle
      for (const muscle of allMuscles) {
        const existingStatus = allStatuses.find((s: MuscleStatus) => s.muscle === muscle);
        if (!existingStatus) continue;

        const volumeLast7Days = this.calculateVolumeLast7Days(muscle, allWorkouts);
        const trainingFrequency = this.calculateTrainingFrequency(muscle, allWorkouts);
        
        // Find most recent workout for this muscle
        let mostRecentWorkout: Workout | null = null;
        let mostRecentDate: Date | null = null;
        
        allWorkouts.forEach((workout: Workout) => {
          const muscles = this.getMusclesFromWorkout(workout);
          if (muscles.has(muscle)) {
            const workoutDate = new Date(workout.date);
            if (!mostRecentDate || workoutDate > mostRecentDate) {
              mostRecentDate = workoutDate;
              mostRecentWorkout = workout;
            }
          }
        });

        if (!mostRecentWorkout || !mostRecentDate) continue;

        // Calculate workload from most recent workout
        // TypeScript needs explicit type assertion after the null check
        const workout: Workout = mostRecentWorkout;
        let totalWorkload = 0;
        workout.exercises.forEach((exercise: WorkoutExercise) => {
          const mapping = getMuscleMapping(exercise.exerciseName);
          if (mapping) {
            totalWorkload += this.calculateWorkloadForMuscle(muscle, exercise, mapping);
          }
        });

        // Update status (recovery calculation will be done by the hook when it reads this)
        const updatedStatus: MuscleStatus = {
          ...existingStatus,
          lastWorked: mostRecentDate,
          workloadScore: totalWorkload,
          totalVolumeLast7Days: volumeLast7Days,
          trainingFrequency,
        };

        await dataService.upsertMuscleStatus(updatedStatus);
      }
    } catch (error) {
      console.error('Failed to recalculate muscle statuses:', error);
      throw error;
    }
  }
}

export const muscleRecoveryService = new MuscleRecoveryService();

