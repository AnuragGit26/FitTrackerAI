import { dbHelpers } from './database';
import { WorkoutTemplate, TemplateCategory } from '@/types/workout';
import { Workout } from '@/types/workout';
import { WorkoutExercise, WorkoutSet } from '@/types/exercise';

class TemplateService {
    // Validation
    private validateTemplate(template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>): void {
        if (!template.userId) {
            throw new Error('Template must have a userId');
        }
        if (!template.name || template.name.trim() === '') {
            throw new Error('Template must have a name');
        }
        if (!template.category) {
            throw new Error('Template must have a category');
        }
        if (!Array.isArray(template.exercises) || template.exercises.length === 0) {
            throw new Error('Template must have at least one exercise');
        }
        if (template.estimatedDuration < 0) {
            throw new Error('Estimated duration must be non-negative');
        }
    }

    // CRUD Operations
    async createTemplate(template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        this.validateTemplate(template);

        const now = new Date();
        const templateWithMetadata: WorkoutTemplate = {
            ...template,
            id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: now,
            updatedAt: now,
        };

        try {
            return await dbHelpers.saveTemplate(templateWithMetadata);
        } catch (error) {
            throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
        try {
            return await dbHelpers.getTemplate(id);
        } catch (error) {
            throw new Error(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getAllTemplates(userId: string): Promise<WorkoutTemplate[]> {
        try {
            return await dbHelpers.getAllTemplates(userId);
        } catch (error) {
            throw new Error(`Failed to get templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTemplatesByCategory(userId: string, category: TemplateCategory): Promise<WorkoutTemplate[]> {
        try {
            return await dbHelpers.getTemplatesByCategory(userId, category);
        } catch (error) {
            throw new Error(`Failed to get templates by category: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async searchTemplates(userId: string, query: string): Promise<WorkoutTemplate[]> {
        try {
            if (!query.trim()) {
                return await this.getAllTemplates(userId);
            }
            return await dbHelpers.searchTemplates(userId, query);
        } catch (error) {
            throw new Error(`Failed to search templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getFeaturedTemplates(userId: string): Promise<WorkoutTemplate[]> {
        try {
            return await dbHelpers.getFeaturedTemplates(userId);
        } catch (error) {
            throw new Error(`Failed to get featured templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTrendingTemplates(userId: string): Promise<WorkoutTemplate[]> {
        try {
            return await dbHelpers.getTrendingTemplates(userId);
        } catch (error) {
            throw new Error(`Failed to get trending templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async updateTemplate(id: string, updates: Partial<Omit<WorkoutTemplate, 'id' | 'createdAt'>>): Promise<void> {
        try {
            const updatedTemplate = {
                ...updates,
                updatedAt: new Date(),
            };
            await dbHelpers.updateTemplate(id, updatedTemplate);
        } catch (error) {
            throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteTemplate(id: string): Promise<void> {
        try {
            await dbHelpers.deleteTemplate(id);
        } catch (error) {
            throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // Convert workout to template
    async createTemplateFromWorkout(
        workout: Workout,
        templateName: string,
        category: TemplateCategory,
        description?: string
    ): Promise<string> {
        if (!workout.exercises || workout.exercises.length === 0) {
            throw new Error('Workout must have at least one exercise to create a template');
        }

        const exercises = workout.exercises.map((exercise: WorkoutExercise) => {
            // Preserve all set data by storing the full set array
            // This allows templates to maintain different reps/weight per set
            const setData = exercise.sets.map((set) => ({
                reps: set.reps,
                weight: set.weight,
                unit: set.unit,
                distance: set.distance,
                distanceUnit: set.distanceUnit,
                time: set.time,
                calories: set.calories,
                duration: set.duration,
                rpe: set.rpe, // Preserve RPE in template
            }));

            return {
                exerciseId: exercise.exerciseId,
                exerciseName: exercise.exerciseName,
                sets: exercise.sets.length,
                reps: exercise.sets[0]?.reps || 10, // Keep for backward compatibility
                weight: exercise.sets[0]?.weight, // Keep for backward compatibility
                restTime: undefined, // Can be added later
                setData, // Store full set data array
            };
        });

        const estimatedDuration = workout.totalDuration || 60; // Default to 60 minutes if not set

        return await this.createTemplate({
            userId: workout.userId,
            name: templateName,
            category,
            description,
            exercises,
            estimatedDuration,
            musclesTargeted: workout.musclesTargeted,
        });
    }

    // Convert template to workout exercises
    convertTemplateToWorkoutExercises(template: WorkoutTemplate): WorkoutExercise[] {
        return template.exercises.map((templateExercise, index) => {
            // Check if template has setData (preserved from workout)
            const hasSetData = templateExercise.setData && Array.isArray(templateExercise.setData);

            let sets: WorkoutSet[];
            
            if (hasSetData && templateExercise.setData.length === templateExercise.sets) {
                // Use preserved set data from original workout
                sets = templateExercise.setData.map((setData, i) => ({
                    setNumber: i + 1,
                    reps: setData.reps ?? templateExercise.reps ?? 10,
                    weight: setData.weight ?? templateExercise.weight ?? 0,
                    unit: setData.unit ?? 'kg',
                    distance: setData.distance,
                    distanceUnit: setData.distanceUnit,
                    time: setData.time,
                    calories: setData.calories,
                    duration: setData.duration,
                    rpe: setData.rpe, // Preserve RPE if present
                    completed: false,
                }));
            } else {
                // Fallback to legacy behavior (all sets same reps/weight)
                sets = Array.from({ length: templateExercise.sets }, (_, i) => ({
                    setNumber: i + 1,
                    reps: templateExercise.reps,
                    weight: templateExercise.weight || 0,
                    unit: 'kg', // Default unit, can be overridden
                    completed: false,
                }));
            }

            return {
                id: `exercise-${Date.now()}-${index}`,
                exerciseId: templateExercise.exerciseId,
                exerciseName: templateExercise.exerciseName,
                sets,
                totalVolume: sets.reduce((sum, set) => sum + ((set.reps || 0) * (set.weight || 0)), 0),
                musclesWorked: template.musclesTargeted,
                timestamp: new Date(),
            };
        });
    }
}

export const templateService = new TemplateService();

