import { dataService } from '@/services/dataService';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { Workout } from '@/types/workout';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { logger } from '@/utils/logger';

/**
 * Seed the database with varied workout logs for testing analytics and insights
 * This creates workouts with different dates, times, and exercise types
 */
export async function seedWorkoutLogs(userId: string = 'user-1'): Promise<void> {
  // Ensure exercises are initialized
  await exerciseLibrary.initialize();
  const allExercises = await exerciseLibrary.getAllExercises();

  // Helper to get exercise by name
  const getExercise = (name: string) => {
    return allExercises.find(ex => ex.name === name);
  };

  // Helper to create a date N days ago at a specific hour
  const daysAgo = (days: number, hour: number = 9, minute: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  // Helper to create workout sets
  const createWeightRepsSets = (
    setCount: number,
    baseWeight: number,
    baseReps: number,
    variation: number = 0
  ): WorkoutSet[] => {
    return Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      weight: baseWeight + (i * variation),
      reps: baseReps - (i * 2),
      unit: 'kg' as const,
      completed: true,
      rpe: 7 + Math.floor(Math.random() * 2),
      restTime: 90,
    }));
  };

  const createRepsOnlySets = (setCount: number, baseReps: number): WorkoutSet[] => {
    return Array.from({ length: setCount }, (_, i) => ({
      setNumber: i + 1,
      reps: baseReps - (i * 2),
      completed: true,
      rpe: 7 + Math.floor(Math.random() * 2),
      restTime: 60,
    }));
  };

  const createCardioSets = (distance: number, unit: 'km' | 'miles' = 'km'): WorkoutSet[] => {
    return [{
      setNumber: 1,
      distance,
      distanceUnit: unit,
      time: distance * 300, // ~5 min per km
      calories: Math.round(distance * 60),
      completed: true,
    }];
  };

  const createDurationSets = (duration: number): WorkoutSet[] => {
    return [{
      setNumber: 1,
      duration,
      completed: true,
    }];
  };

  // Helper to calculate total volume for an exercise
  const calculateVolume = (exercise: WorkoutExercise): number => {
    return exercise.sets.reduce((sum, set) => {
      if (!set.completed) return sum;
      if (set.weight !== undefined && set.reps !== undefined) {
        return sum + (set.reps * set.weight);
      }
      if (set.reps !== undefined) {
        return sum + set.reps;
      }
      if (set.distance !== undefined) {
        const distanceKm = set.distanceUnit === 'miles' ? set.distance * 1.60934 : set.distance;
        return sum + distanceKm;
      }
      if (set.duration !== undefined) {
        return sum + set.duration;
      }
      return sum;
    }, 0);
  };

  // Helper to create workout exercise
  const createWorkoutExercise = (
    exerciseName: string,
    sets: WorkoutSet[],
    notes?: string
  ): WorkoutExercise | null => {
    const exercise = getExercise(exerciseName);
    if (!exercise) {
      console.warn(`Exercise "${exerciseName}" not found`);
      return null;
    }

    const workoutExercise: WorkoutExercise = {
      id: `ex-${Date.now()}-${Math.random()}`,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets,
      totalVolume: 0, // Will be calculated
      musclesWorked: [...exercise.primaryMuscles, ...exercise.secondaryMuscles],
      timestamp: new Date(),
      notes,
    };

    workoutExercise.totalVolume = calculateVolume(workoutExercise);
    return workoutExercise;
  };

  const workouts: Omit<Workout, 'id'>[] = [];

  // ===== WEEK 1 (Most Recent) =====

  // Day 0 (Today) - Morning Push Workout
  const todayPush = daysAgo(0, 7, 30);
  const pushExercises: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Bench Press', createWeightRepsSets(4, 80, 10, 2.5))!,
    createWorkoutExercise('Dumbbell Bench Press', createWeightRepsSets(3, 30, 12))!,
    createWorkoutExercise('Overhead Press', createWeightRepsSets(3, 50, 8))!,
    createWorkoutExercise('Tricep Dips', createRepsOnlySets(3, 12))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: todayPush,
    startTime: todayPush,
    endTime: new Date(todayPush.getTime() + 60 * 60 * 1000), // 1 hour later
    exercises: pushExercises,
    totalDuration: 60,
    totalVolume: pushExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pushExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'great',
    notes: 'Great session! Felt strong on bench press.',
  });

  // Day 1 (Yesterday) - Evening Cardio
  const yesterdayCardio = daysAgo(1, 18, 0);
  const cardioExercises: WorkoutExercise[] = [
    createWorkoutExercise('Running', createCardioSets(5, 'km'))!,
    createWorkoutExercise('Plank', createDurationSets(60))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: yesterdayCardio,
    startTime: yesterdayCardio,
    endTime: new Date(yesterdayCardio.getTime() + 35 * 60 * 1000), // 35 min later
    exercises: cardioExercises,
    totalDuration: 35,
    totalVolume: cardioExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(cardioExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'cardio',
    mood: 'good',
  });

  // Day 2 - Pull Workout
  const day2Pull = daysAgo(2, 8, 0);
  const pullExercises: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Deadlift', createWeightRepsSets(5, 120, 5))!,
    createWorkoutExercise('Barbell Row', createWeightRepsSets(4, 70, 8))!,
    createWorkoutExercise('Pull-ups', createRepsOnlySets(4, 10))!,
    createWorkoutExercise('Barbell Bicep Curl', createWeightRepsSets(3, 20, 12))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day2Pull,
    startTime: day2Pull,
    endTime: new Date(day2Pull.getTime() + 70 * 60 * 1000),
    exercises: pullExercises,
    totalDuration: 70,
    totalVolume: pullExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pullExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'good',
  });

  // ===== WEEK 2 =====

  // Day 3 - Leg Day
  const day3Legs = daysAgo(3, 10, 0);
  const legExercises: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Squat', createWeightRepsSets(5, 100, 8, 5))!,
    createWorkoutExercise('Romanian Deadlift', createWeightRepsSets(4, 80, 10))!,
    createWorkoutExercise('Leg Press', createWeightRepsSets(3, 150, 15))!,
    createWorkoutExercise('Leg Curl (Lying)', createWeightRepsSets(3, 40, 12))!,
    createWorkoutExercise('Calf Raises (Standing)', createWeightRepsSets(4, 50, 15))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day3Legs,
    startTime: day3Legs,
    endTime: new Date(day3Legs.getTime() + 75 * 60 * 1000),
    exercises: legExercises,
    totalDuration: 75,
    totalVolume: legExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(legExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'tired',
    notes: 'Legs were burning!',
  });

  // Day 4 - Rest day (no workout)

  // Day 5 - Full Body
  const day5FullBody = daysAgo(5, 9, 30);
  const fullBodyExercises: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Bench Press', createWeightRepsSets(3, 75, 10))!,
    createWorkoutExercise('Barbell Row', createWeightRepsSets(3, 65, 10))!,
    createWorkoutExercise('Barbell Squat', createWeightRepsSets(3, 90, 10))!,
    createWorkoutExercise('Overhead Press', createWeightRepsSets(3, 45, 8))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day5FullBody,
    startTime: day5FullBody,
    endTime: new Date(day5FullBody.getTime() + 55 * 60 * 1000),
    exercises: fullBodyExercises,
    totalDuration: 55,
    totalVolume: fullBodyExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(fullBodyExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'okay',
  });

  // Day 6 - Cardio + Core
  const day6Cardio = daysAgo(6, 17, 30);
  const cardioCoreExercises: WorkoutExercise[] = [
    createWorkoutExercise('Rowing Machine', createCardioSets(3, 'km'))!,
    createWorkoutExercise('Plank', createDurationSets(45))!,
    createWorkoutExercise('Russian Twists', createWeightRepsSets(3, 5, 20))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day6Cardio,
    startTime: day6Cardio,
    endTime: new Date(day6Cardio.getTime() + 40 * 60 * 1000),
    exercises: cardioCoreExercises,
    totalDuration: 40,
    totalVolume: cardioCoreExercises.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(cardioCoreExercises.flatMap(ex => ex.musclesWorked))),
    workoutType: 'cardio',
    mood: 'good',
  });

  // ===== WEEK 3 =====

  // Day 7 - Push Workout (Morning)
  const day7Push = daysAgo(7, 6, 45);
  const pushExercises2: WorkoutExercise[] = [
    createWorkoutExercise('Dumbbell Bench Press', createWeightRepsSets(4, 28, 12))!,
    createWorkoutExercise('Incline Dumbbell Press', createWeightRepsSets(3, 25, 10))!,
    createWorkoutExercise('Dumbbell Lateral Raises', createWeightRepsSets(3, 8, 15))!,
    createWorkoutExercise('Cable Tricep Extension', createWeightRepsSets(3, 15, 12))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day7Push,
    startTime: day7Push,
    endTime: new Date(day7Push.getTime() + 50 * 60 * 1000),
    exercises: pushExercises2,
    totalDuration: 50,
    totalVolume: pushExercises2.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pushExercises2.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'great',
  });

  // Day 8 - Pull Workout
  const day8Pull = daysAgo(8, 19, 0);
  const pullExercises2: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Deadlift', createWeightRepsSets(5, 115, 5))!,
    createWorkoutExercise('Pull-ups', createRepsOnlySets(4, 9))!,
    createWorkoutExercise('Seated Cable Row', createWeightRepsSets(3, 60, 10))!,
    createWorkoutExercise('Hammer Curls', createWeightRepsSets(3, 18, 12))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day8Pull,
    startTime: day8Pull,
    endTime: new Date(day8Pull.getTime() + 65 * 60 * 1000),
    exercises: pullExercises2,
    totalDuration: 65,
    totalVolume: pullExercises2.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pullExercises2.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'okay',
  });

  // Day 9 - Rest day

  // Day 10 - Leg Day
  const day10Legs = daysAgo(10, 11, 0);
  const legExercises2: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Squat', createWeightRepsSets(5, 95, 8, 5))!,
    createWorkoutExercise('Romanian Deadlift', createWeightRepsSets(4, 75, 10))!,
    createWorkoutExercise('Leg Extension', createWeightRepsSets(3, 50, 12))!,
    createWorkoutExercise('Leg Curl (Lying)', createWeightRepsSets(3, 38, 12))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day10Legs,
    startTime: day10Legs,
    endTime: new Date(day10Legs.getTime() + 70 * 60 * 1000),
    exercises: legExercises2,
    totalDuration: 70,
    totalVolume: legExercises2.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(legExercises2.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'exhausted',
    notes: 'Very challenging leg day',
  });

  // Day 11 - Cardio
  const day11Cardio = daysAgo(11, 16, 30);
  const cardioExercises2: WorkoutExercise[] = [
    createWorkoutExercise('Running', createCardioSets(4.5, 'km'))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day11Cardio,
    startTime: day11Cardio,
    endTime: new Date(day11Cardio.getTime() + 25 * 60 * 1000),
    exercises: cardioExercises2,
    totalDuration: 25,
    totalVolume: cardioExercises2.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(cardioExercises2.flatMap(ex => ex.musclesWorked))),
    workoutType: 'cardio',
    mood: 'good',
  });

  // ===== WEEK 4 =====

  // Day 12 - Push Workout
  const day12Push = daysAgo(12, 8, 15);
  const pushExercises3: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Bench Press', createWeightRepsSets(4, 77, 10, 2.5))!,
    createWorkoutExercise('Dumbbell Flyes', createWeightRepsSets(3, 20, 12))!,
    createWorkoutExercise('Overhead Press', createWeightRepsSets(3, 48, 8))!,
    createWorkoutExercise('Tricep Dips', createRepsOnlySets(3, 11))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day12Push,
    startTime: day12Push,
    endTime: new Date(day12Push.getTime() + 58 * 60 * 1000),
    exercises: pushExercises3,
    totalDuration: 58,
    totalVolume: pushExercises3.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pushExercises3.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'good',
  });

  // Day 13 - Pull Workout
  const day13Pull = daysAgo(13, 20, 0);
  const pullExercises3: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Row', createWeightRepsSets(4, 68, 8))!,
    createWorkoutExercise('Pull-ups', createRepsOnlySets(4, 9))!,
    createWorkoutExercise('Barbell Bicep Curl', createWeightRepsSets(3, 19, 12))!,
    createWorkoutExercise('Seated Cable Row', createWeightRepsSets(3, 58, 10))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day13Pull,
    startTime: day13Pull,
    endTime: new Date(day13Pull.getTime() + 55 * 60 * 1000),
    exercises: pullExercises3,
    totalDuration: 55,
    totalVolume: pullExercises3.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pullExercises3.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'okay',
  });

  // Day 14 - Full Body
  const day14FullBody = daysAgo(14, 9, 0);
  const fullBodyExercises2: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Squat', createWeightRepsSets(3, 88, 10))!,
    createWorkoutExercise('Barbell Bench Press', createWeightRepsSets(3, 73, 10))!,
    createWorkoutExercise('Barbell Row', createWeightRepsSets(3, 63, 10))!,
    createWorkoutExercise('Overhead Press', createWeightRepsSets(3, 43, 8))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day14FullBody,
    startTime: day14FullBody,
    endTime: new Date(day14FullBody.getTime() + 52 * 60 * 1000),
    exercises: fullBodyExercises2,
    totalDuration: 52,
    totalVolume: fullBodyExercises2.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(fullBodyExercises2.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'good',
  });

  // Day 15 - Cardio
  const day15Cardio = daysAgo(15, 17, 45);
  const cardioExercises3: WorkoutExercise[] = [
    createWorkoutExercise('Running', createCardioSets(6, 'km'))!,
    createWorkoutExercise('Plank', createDurationSets(50))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day15Cardio,
    startTime: day15Cardio,
    endTime: new Date(day15Cardio.getTime() + 38 * 60 * 1000),
    exercises: cardioExercises3,
    totalDuration: 38,
    totalVolume: cardioExercises3.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(cardioExercises3.flatMap(ex => ex.musclesWorked))),
    workoutType: 'cardio',
    mood: 'great',
  });

  // ===== OLDER WORKOUTS (for trend analysis) =====

  // Day 20 - Push (3 weeks ago)
  const day20Push = daysAgo(20, 10, 0);
  const pushExercises4: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Bench Press', createWeightRepsSets(4, 72, 10, 2))!,
    createWorkoutExercise('Dumbbell Bench Press', createWeightRepsSets(3, 26, 12))!,
    createWorkoutExercise('Overhead Press', createWeightRepsSets(3, 42, 8))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day20Push,
    startTime: day20Push,
    endTime: new Date(day20Push.getTime() + 50 * 60 * 1000),
    exercises: pushExercises4,
    totalDuration: 50,
    totalVolume: pushExercises4.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pushExercises4.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'okay',
  });

  // Day 25 - Pull (3.5 weeks ago)
  const day25Pull = daysAgo(25, 19, 30);
  const pullExercises4: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Deadlift', createWeightRepsSets(5, 110, 5))!,
    createWorkoutExercise('Barbell Row', createWeightRepsSets(4, 65, 8))!,
    createWorkoutExercise('Pull-ups', createRepsOnlySets(3, 8))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day25Pull,
    startTime: day25Pull,
    endTime: new Date(day25Pull.getTime() + 60 * 60 * 1000),
    exercises: pullExercises4,
    totalDuration: 60,
    totalVolume: pullExercises4.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(pullExercises4.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'good',
  });

  // Day 30 - Leg Day (1 month ago)
  const day30Legs = daysAgo(30, 11, 15);
  const legExercises3: WorkoutExercise[] = [
    createWorkoutExercise('Barbell Squat', createWeightRepsSets(5, 85, 8, 5))!,
    createWorkoutExercise('Romanian Deadlift', createWeightRepsSets(4, 70, 10))!,
    createWorkoutExercise('Leg Press', createWeightRepsSets(3, 140, 15))!,
  ].filter(Boolean);

  workouts.push({
    userId,
    date: day30Legs,
    startTime: day30Legs,
    endTime: new Date(day30Legs.getTime() + 65 * 60 * 1000),
    exercises: legExercises3,
    totalDuration: 65,
    totalVolume: legExercises3.reduce((sum, ex) => sum + ex.totalVolume, 0),
    musclesTargeted: Array.from(new Set(legExercises3.flatMap(ex => ex.musclesWorked))),
    workoutType: 'strength',
    mood: 'tired',
  });

  // Save all workouts
  for (const workout of workouts) {
    try {
      await dataService.createWorkout(workout);
    } catch (error) {
      logger.error(`✗ Failed to create workout:`, error);
    }
  }
}

