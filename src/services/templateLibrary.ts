import { WorkoutTemplate } from '@/types/workout';
import { MuscleGroup } from '@/types/muscle';
import { templateService } from './templateService';
import { exerciseLibrary } from './exerciseLibrary';
import { logger } from '@/utils/logger';

// Type for seed data (exerciseId will be resolved during initialization)
type TemplateSeedData = Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'exercises'> & {
    exercises: Array<{
        exerciseName: string;
        sets: number;
        reps: number;
        weight?: number;
        restTime?: number;
    }>;
};

// Default template seed data
// Note: Exercise IDs will be resolved during initialization
const DEFAULT_TEMPLATES: TemplateSeedData[] = [
    // STRENGTH TEMPLATES
    {
        name: 'Upper/Lower Split',
        category: 'strength',
        description: 'A classic 4-day strength training split focusing on upper and lower body separation. Perfect for building foundational strength.',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        estimatedDuration: 60,
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop&q=80', // Upper/Lower Split - Gym strength training with barbells
        isFeatured: true,
        isTrending: false,
        exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Row', sets: 4, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Overhead Press', sets: 3, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Pull-ups', sets: 3, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Barbell Squat', sets: 4, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Deadlift', sets: 3, reps: 5, weight: 0, restTime: 240 },
            { exerciseName: 'Leg Press', sets: 3, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Walking Lunges', sets: 3, reps: 10, weight: 0, restTime: 90 },
        ],
        musclesTargeted: [
            MuscleGroup.CHEST,
            MuscleGroup.BACK,
            MuscleGroup.SHOULDERS,
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.GLUTES,
            MuscleGroup.BICEPS,
            MuscleGroup.TRICEPS,
        ],
    },
    {
        name: '5x5 Stronglifts',
        category: 'strength',
        description: 'The proven 5x5 program for building raw strength. Simple, effective, and perfect for beginners.',
        difficulty: 'beginner',
        daysPerWeek: 3,
        estimatedDuration: 45,
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&h=600&fit=crop&q=80', // 5x5 Stronglifts - Barbell workout
        isFeatured: true,
        isTrending: true,
        exercises: [
            { exerciseName: 'Barbell Squat', sets: 5, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Bench Press', sets: 5, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Row', sets: 5, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Overhead Press', sets: 5, reps: 5, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Deadlift', sets: 1, reps: 5, weight: 0, restTime: 240 },
        ],
        musclesTargeted: [
            MuscleGroup.QUADS,
            MuscleGroup.GLUTES,
            MuscleGroup.CHEST,
            MuscleGroup.BACK,
            MuscleGroup.SHOULDERS,
            MuscleGroup.HAMSTRINGS,
        ],
    },
    {
        name: 'Full Body Strength',
        category: 'strength',
        description: 'Complete full-body strength workout hitting all major muscle groups in one session.',
        difficulty: 'intermediate',
        daysPerWeek: 3,
        estimatedDuration: 75,
        imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&q=80', // Full Body Strength - Full body workout
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Barbell Squat', sets: 4, reps: 6, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 6, weight: 0, restTime: 180 },
            { exerciseName: 'Barbell Deadlift', sets: 3, reps: 5, weight: 0, restTime: 240 },
            { exerciseName: 'Overhead Press', sets: 3, reps: 6, weight: 0, restTime: 120 },
            { exerciseName: 'Barbell Row', sets: 4, reps: 6, weight: 0, restTime: 120 },
            { exerciseName: 'Pull-ups', sets: 3, reps: 8, weight: 0, restTime: 90 },
        ],
        musclesTargeted: [
            MuscleGroup.QUADS,
            MuscleGroup.GLUTES,
            MuscleGroup.CHEST,
            MuscleGroup.BACK,
            MuscleGroup.SHOULDERS,
            MuscleGroup.HAMSTRINGS,
        ],
    },

    // HYPERTROPHY TEMPLATES
    {
        name: 'Push/Pull/Legs',
        category: 'hypertrophy',
        description: 'The gold standard for muscle growth. 6-day split maximizing volume and recovery.',
        difficulty: 'intermediate',
        daysPerWeek: 6,
        estimatedDuration: 75,
        imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&h=600&fit=crop&q=80', // Push/Pull/Legs - Bodybuilding/muscle building
        isFeatured: true,
        isTrending: true,
        exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Dumbbell Flyes', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Overhead Press', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Lateral Raises', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Tricep Dips', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Close-Grip Bench Press', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Barbell Row', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Pull-ups', sets: 4, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Cable Row (Seated)', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Barbell Bicep Curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Barbell Squat', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Leg Press', sets: 4, reps: 12, weight: 0, restTime: 90 },
            { exerciseName: 'Walking Lunges', sets: 3, reps: 12, weight: 0, restTime: 60 },
        ],
        musclesTargeted: [
            MuscleGroup.CHEST,
            MuscleGroup.SHOULDERS,
            MuscleGroup.TRICEPS,
            MuscleGroup.BACK,
            MuscleGroup.BICEPS,
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.GLUTES,
        ],
    },
    {
        name: 'Upper/Lower Hypertrophy',
        category: 'hypertrophy',
        description: 'High-volume upper/lower split optimized for muscle growth. Perfect for intermediate lifters.',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        estimatedDuration: 80,
        imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&h=600&fit=crop&q=80', // Upper/Lower Hypertrophy - Hypertrophy training with dumbbells
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Incline Barbell Bench Press', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Barbell Row', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Lat Pulldown (Wide Grip)', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Overhead Press', sets: 3, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Lateral Raises', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Barbell Bicep Curl', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Tricep Dips', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Barbell Squat', sets: 4, reps: 8, weight: 0, restTime: 120 },
            { exerciseName: 'Romanian Deadlift', sets: 3, reps: 10, weight: 0, restTime: 90 },
            { exerciseName: 'Leg Press', sets: 4, reps: 12, weight: 0, restTime: 90 },
            { exerciseName: 'Walking Lunges', sets: 3, reps: 12, weight: 0, restTime: 60 },
        ],
        musclesTargeted: [
            MuscleGroup.CHEST,
            MuscleGroup.BACK,
            MuscleGroup.SHOULDERS,
            MuscleGroup.BICEPS,
            MuscleGroup.TRICEPS,
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.GLUTES,
        ],
    },

    // CARDIO TEMPLATES
    {
        name: 'HIIT Blaster',
        category: 'cardio',
        description: 'High-intensity interval training for maximum calorie burn and cardiovascular fitness. Advanced level.',
        difficulty: 'advanced',
        daysPerWeek: 5,
        estimatedDuration: 20,
        imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&q=80', // HIIT Blaster - High intensity interval training
        isFeatured: false,
        isTrending: true,
        exercises: [
            { exerciseName: 'Running', sets: 1, reps: 1, weight: 0, restTime: 0 },
            { exerciseName: 'Rowing Machine', sets: 1, reps: 1, weight: 0, restTime: 0 },
        ],
        musclesTargeted: [
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.CALVES,
            MuscleGroup.ABS,
        ],
    },
    {
        name: 'Steady State Cardio',
        category: 'cardio',
        description: 'Moderate-intensity steady-state cardio for endurance building and active recovery.',
        difficulty: 'beginner',
        daysPerWeek: 3,
        estimatedDuration: 30,
        imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&h=600&fit=crop&q=80', // Steady State Cardio - Running/cardio
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Running', sets: 1, reps: 1, weight: 0, restTime: 0 },
        ],
        musclesTargeted: [
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.CALVES,
        ],
    },

    // HOME TEMPLATES
    {
        name: 'Bodyweight Basics',
        category: 'home',
        description: 'Complete bodyweight workout requiring no equipment. Perfect for beginners and home workouts.',
        difficulty: 'beginner',
        daysPerWeek: 3,
        estimatedDuration: 30,
        imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=600&fit=crop&q=80', // Bodyweight Basics - Push-ups and bodyweight exercises
        isFeatured: true,
        isTrending: false,
        exercises: [
            { exerciseName: 'Push-ups', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Walking Lunges', sets: 3, reps: 12, weight: 0, restTime: 60 },
            { exerciseName: 'Plank', sets: 3, reps: 30, weight: 0, restTime: 60 },
            { exerciseName: 'Russian Twists', sets: 3, reps: 20, weight: 0, restTime: 60 },
        ],
        musclesTargeted: [
            MuscleGroup.CHEST,
            MuscleGroup.QUADS,
            MuscleGroup.GLUTES,
            MuscleGroup.ABS,
            MuscleGroup.OBLIQUES,
        ],
    },
    {
        name: 'No Equipment Full Body',
        category: 'home',
        description: 'Comprehensive full-body workout using only bodyweight. Great for maintaining fitness at home.',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        estimatedDuration: 40,
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=600&fit=crop&q=80', // No Equipment Full Body - Home bodyweight workout
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Push-ups', sets: 4, reps: 15, weight: 0, restTime: 60 },
            { exerciseName: 'Walking Lunges', sets: 3, reps: 15, weight: 0, restTime: 60 },
            { exerciseName: 'Plank', sets: 3, reps: 45, weight: 0, restTime: 60 },
            { exerciseName: 'Russian Twists', sets: 3, reps: 25, weight: 0, restTime: 60 },
            { exerciseName: 'Diamond Push-ups', sets: 3, reps: 10, weight: 0, restTime: 60 },
        ],
        musclesTargeted: [
            MuscleGroup.CHEST,
            MuscleGroup.TRICEPS,
            MuscleGroup.QUADS,
            MuscleGroup.GLUTES,
            MuscleGroup.ABS,
            MuscleGroup.OBLIQUES,
        ],
    },

    // FLEXIBILITY TEMPLATES
    {
        name: 'Morning Yoga Flow',
        category: 'flexibility',
        description: 'Gentle yoga flow perfect for starting your day. Improves flexibility, mobility, and mental clarity.',
        difficulty: 'beginner',
        daysPerWeek: 7,
        estimatedDuration: 15,
        imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=600&fit=crop&q=80', // Morning Yoga Flow - Yoga poses
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Plank', sets: 1, reps: 1, weight: 0, restTime: 0 },
        ],
        musclesTargeted: [
            MuscleGroup.ABS,
            MuscleGroup.HIP_FLEXORS,
        ],
    },
    {
        name: 'Mobility Master',
        category: 'flexibility',
        description: 'Comprehensive mobility routine targeting all major joints and muscle groups. All levels welcome.',
        difficulty: 'beginner',
        daysPerWeek: 5,
        estimatedDuration: 20,
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&q=80', // Mobility Master - Stretching and mobility exercises
        isFeatured: false,
        isTrending: false,
        exercises: [
            { exerciseName: 'Plank', sets: 1, reps: 1, weight: 0, restTime: 0 },
            { exerciseName: 'Walking Lunges', sets: 1, reps: 10, weight: 0, restTime: 0 },
        ],
        musclesTargeted: [
            MuscleGroup.HIP_FLEXORS,
            MuscleGroup.QUADS,
            MuscleGroup.HAMSTRINGS,
            MuscleGroup.ABS,
        ],
    },
];

/**
 * Update existing templates that are missing imageUrl
 */
async function updateTemplatesWithImages(userId: string): Promise<void> {
    try {
        const existingTemplates = await templateService.getAllTemplates(userId);
        const templateMap = new Map(DEFAULT_TEMPLATES.map(t => [t.name, t.imageUrl]));

        for (const template of existingTemplates) {
            // If template doesn't have an imageUrl, try to find matching default template
            if (!template.imageUrl) {
                const defaultImageUrl = templateMap.get(template.name);
                if (defaultImageUrl) {
                    await templateService.updateTemplate(template.id, {
                        ...template,
                        imageUrl: defaultImageUrl,
                        updatedAt: new Date(),
                    });
                }
            }
        }
    } catch (error) {
        logger.error('Failed to update templates with images:', error);
    }
}

/**
 * Initialize default templates for a user
 * Only creates templates if user has no existing templates
 * Also updates existing templates that are missing images
 */
export async function initializeDefaultTemplates(userId: string): Promise<void> {
    try {
        // Check if user already has templates
        const existingTemplates = await templateService.getAllTemplates(userId);

        // Update existing templates that are missing images
        if (existingTemplates.length > 0) {
            await updateTemplatesWithImages(userId);
            // Only create defaults if user has no templates
            return;
        }

        // Get all exercises to map names to IDs
        const allExercises = await exerciseLibrary.getAllExercises();
        const exerciseMap = new Map<string, string>();
        allExercises.forEach((ex) => {
            exerciseMap.set(ex.name, ex.id);
        });

        // Create each template
        for (const template of DEFAULT_TEMPLATES) {
            // Map exercise names to IDs
            const exercisesWithIds = template.exercises.map((ex) => {
                const exerciseId = exerciseMap.get(ex.exerciseName);
                if (!exerciseId) {
                    console.warn(`Exercise "${ex.exerciseName}" not found, skipping...`);
                    return null;
                }
                return {
                    exerciseId,
                    exerciseName: ex.exerciseName,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight,
                    restTime: ex.restTime,
                };
            }).filter((ex): ex is NonNullable<typeof ex> => ex !== null);

            // Skip template if no valid exercises found
            if (exercisesWithIds.length === 0) {
                console.warn(`Template "${template.name}" has no valid exercises, skipping...`);
                continue;
            }

            // Create template with user ID
            const templateToCreate = {
                ...template,
                userId,
                exercises: exercisesWithIds,
            };
            
            await templateService.createTemplate(templateToCreate);
        }
    } catch (error) {
        logger.error('Failed to initialize default templates:', error);
        // Don't throw - allow app to continue even if template initialization fails
    }
}

