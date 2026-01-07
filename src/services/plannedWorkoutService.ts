import { PlannedWorkout } from '@/types/workout';
import { dbHelpers } from './database';
import { templateService } from './templateService';

class PlannedWorkoutService {
  async createPlannedWorkout(
    _userId: string,
    plannedWorkout: Omit<PlannedWorkout, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const id = `planned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const fullPlannedWorkout: PlannedWorkout = {
      ...plannedWorkout,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await dbHelpers.savePlannedWorkout(fullPlannedWorkout);
    return id;
  }

  async getPlannedWorkout(id: string): Promise<PlannedWorkout | undefined> {
    return await dbHelpers.getPlannedWorkout(id);
  }

  async getAllPlannedWorkouts(userId: string): Promise<PlannedWorkout[]> {
    return await dbHelpers.getAllPlannedWorkouts(userId);
  }

  async getPlannedWorkoutsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlannedWorkout[]> {
    return await dbHelpers.getPlannedWorkoutsByDateRange(userId, startDate, endDate);
  }

  async getPlannedWorkoutsByDate(
    userId: string,
    date: Date
  ): Promise<PlannedWorkout[]> {
    return await dbHelpers.getPlannedWorkoutsByDate(userId, date);
  }

  async updatePlannedWorkout(
    id: string,
    updates: Partial<Omit<PlannedWorkout, 'id' | 'createdAt'>>
  ): Promise<void> {
    await dbHelpers.updatePlannedWorkout(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async deletePlannedWorkout(id: string): Promise<void> {
    await dbHelpers.deletePlannedWorkout(id);
  }

  async markAsCompleted(
    id: string,
    completedWorkoutId: string
  ): Promise<void> {
    await dbHelpers.markPlannedWorkoutCompleted(id, completedWorkoutId);
  }

  async createFromTemplate(
    userId: string,
    templateId: string,
    scheduledDate: Date,
    scheduledTime?: Date
  ): Promise<string> {
    const template = await templateService.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const plannedWorkout: Omit<PlannedWorkout, 'id' | 'createdAt' | 'updatedAt'> = {
      userId,
      scheduledDate,
      scheduledTime,
      templateId,
      workoutName: template.name,
      category: template.category,
      estimatedDuration: template.estimatedDuration,
      exercises: template.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        restTime: ex.restTime,
      })),
      musclesTargeted: template.musclesTargeted,
      isCompleted: false,
    };

    return await this.createPlannedWorkout(userId, plannedWorkout);
  }
}

export const plannedWorkoutService = new PlannedWorkoutService();

