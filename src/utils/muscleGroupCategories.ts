import { MuscleGroup } from '@/types/muscle';

export type MuscleGroupCategory = 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';

/**
 * Maps individual muscle groups to their display category
 */
export function getMuscleGroupCategory(muscle: MuscleGroup): MuscleGroupCategory {
  const categoryMap: Record<MuscleGroup, MuscleGroupCategory> = {
    // Chest
    [MuscleGroup.CHEST]: 'Chest',
    [MuscleGroup.UPPER_CHEST]: 'Chest',
    [MuscleGroup.LOWER_CHEST]: 'Chest',
    
    // Back
    [MuscleGroup.BACK]: 'Back',
    [MuscleGroup.LATS]: 'Back',
    [MuscleGroup.TRAPS]: 'Back',
    [MuscleGroup.RHOMBOIDS]: 'Back',
    [MuscleGroup.LOWER_BACK]: 'Back',
    
    // Legs
    [MuscleGroup.QUADS]: 'Legs',
    [MuscleGroup.HAMSTRINGS]: 'Legs',
    [MuscleGroup.GLUTES]: 'Legs',
    [MuscleGroup.CALVES]: 'Legs',
    [MuscleGroup.HIP_FLEXORS]: 'Legs',
    
    // Shoulders
    [MuscleGroup.SHOULDERS]: 'Shoulders',
    [MuscleGroup.FRONT_DELTS]: 'Shoulders',
    [MuscleGroup.SIDE_DELTS]: 'Shoulders',
    [MuscleGroup.REAR_DELTS]: 'Shoulders',
    
    // Arms
    [MuscleGroup.BICEPS]: 'Arms',
    [MuscleGroup.TRICEPS]: 'Arms',
    [MuscleGroup.FOREARMS]: 'Arms',
    
    // Core
    [MuscleGroup.ABS]: 'Core',
    [MuscleGroup.OBLIQUES]: 'Core',
  };
  
  return categoryMap[muscle];
}

/**
 * Gets all muscle groups that belong to a display category
 */
export function getMuscleGroupsInCategory(category: MuscleGroupCategory): MuscleGroup[] {
  const categoryMap: Record<MuscleGroupCategory, MuscleGroup[]> = {
    Chest: [MuscleGroup.CHEST, MuscleGroup.UPPER_CHEST, MuscleGroup.LOWER_CHEST],
    Back: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.TRAPS, MuscleGroup.RHOMBOIDS, MuscleGroup.LOWER_BACK],
    Legs: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES, MuscleGroup.CALVES, MuscleGroup.HIP_FLEXORS],
    Shoulders: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS, MuscleGroup.SIDE_DELTS, MuscleGroup.REAR_DELTS],
    Arms: [MuscleGroup.BICEPS, MuscleGroup.TRICEPS, MuscleGroup.FOREARMS],
    Core: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
  };
  
  return categoryMap[category] || [];
}

/**
 * Checks if an exercise targets any of the selected muscle group categories
 */
export function exerciseTargetsMuscleCategory(
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  selectedCategories: MuscleGroupCategory[]
): boolean {
  if (selectedCategories.length === 0) {
    return true; // No filter applied
  }
  
  const allMuscles = [...primaryMuscles, ...secondaryMuscles];
  const exerciseCategories = new Set(
    allMuscles.map(muscle => getMuscleGroupCategory(muscle))
  );
  
  // Check if any of the exercise's muscle categories match the selected categories
  return selectedCategories.some(category => exerciseCategories.has(category));
}

