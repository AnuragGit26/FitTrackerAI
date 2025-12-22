import { MuscleGroup } from '@/types/muscle';

/**
 * Maps StrengthLog muscle category names to our MuscleGroup enum
 */
export function mapStrengthLogCategoryToMuscleGroups(
  category: string
): MuscleGroup[] {
  const normalizedCategory = category.toLowerCase().trim();

  // Direct mappings
  const categoryMap: Record<string, MuscleGroup[]> = {
    // Chest
    'chest': [MuscleGroup.CHEST],
    'chest exercises': [MuscleGroup.CHEST],
    'upper chest': [MuscleGroup.UPPER_CHEST, MuscleGroup.CHEST],
    'lower chest': [MuscleGroup.LOWER_CHEST, MuscleGroup.CHEST],

    // Shoulders
    'shoulder': [MuscleGroup.SHOULDERS],
    'shoulders': [MuscleGroup.SHOULDERS],
    'shoulder exercises': [MuscleGroup.SHOULDERS],
    'front delts': [MuscleGroup.FRONT_DELTS],
    'front deltoids': [MuscleGroup.FRONT_DELTS],
    'lateral delts': [MuscleGroup.SIDE_DELTS],
    'side delts': [MuscleGroup.SIDE_DELTS],
    'rear delts': [MuscleGroup.REAR_DELTS],
    'rear deltoids': [MuscleGroup.REAR_DELTS],

    // Back
    'back': [MuscleGroup.BACK],
    'back exercises': [MuscleGroup.BACK],
    'lats': [MuscleGroup.LATS, MuscleGroup.BACK],
    'latissimus dorsi': [MuscleGroup.LATS, MuscleGroup.BACK],
    'traps': [MuscleGroup.TRAPS, MuscleGroup.BACK],
    'trapezius': [MuscleGroup.TRAPS, MuscleGroup.BACK],
    'rhomboids': [MuscleGroup.RHOMBOIDS, MuscleGroup.BACK],
    'lower back': [MuscleGroup.LOWER_BACK, MuscleGroup.BACK],

    // Arms
    'bicep': [MuscleGroup.BICEPS],
    'biceps': [MuscleGroup.BICEPS],
    'bicep exercises': [MuscleGroup.BICEPS],
    'tricep': [MuscleGroup.TRICEPS],
    'triceps': [MuscleGroup.TRICEPS],
    'triceps exercises': [MuscleGroup.TRICEPS],
    'forearm flexors': [MuscleGroup.FOREARMS],
    'forearm extensors': [MuscleGroup.FOREARMS],
    'forearms': [MuscleGroup.FOREARMS],
    'grip': [MuscleGroup.FOREARMS],

    // Core
    'abs': [MuscleGroup.ABS],
    'abdominal': [MuscleGroup.ABS],
    'abdominals': [MuscleGroup.ABS],
    'ab exercises': [MuscleGroup.ABS],
    'core': [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    'obliques': [MuscleGroup.OBLIQUES],

    // Legs
    'leg': [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    'legs': [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    'leg exercises': [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    'quads': [MuscleGroup.QUADS],
    'quadriceps': [MuscleGroup.QUADS],
    'quad exercises': [MuscleGroup.QUADS],
    'hamstrings': [MuscleGroup.HAMSTRINGS],
    'hamstring exercises': [MuscleGroup.HAMSTRINGS],
    'glutes': [MuscleGroup.GLUTES],
    'glute': [MuscleGroup.GLUTES],
    'glute exercises': [MuscleGroup.GLUTES],
    'calves': [MuscleGroup.CALVES],
    'calf': [MuscleGroup.CALVES],
    'calf exercises': [MuscleGroup.CALVES],
    'hip flexors': [MuscleGroup.HIP_FLEXORS],

    // Other
    'neck': [], // Not in our enum, return empty
    'cardio': [], // Not a muscle group
  };

  // Check for exact match
  if (categoryMap[normalizedCategory]) {
    return categoryMap[normalizedCategory];
  }

  // Check for partial matches
  for (const [key, muscles] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(key) || key.includes(normalizedCategory)) {
      return muscles;
    }
  }

  // Default fallback - try to infer from category name
  if (normalizedCategory.includes('chest')) {
    return [MuscleGroup.CHEST];
  }
  if (normalizedCategory.includes('shoulder')) {
    return [MuscleGroup.SHOULDERS];
  }
  if (normalizedCategory.includes('back')) {
    return [MuscleGroup.BACK];
  }
  if (normalizedCategory.includes('bicep')) {
    return [MuscleGroup.BICEPS];
  }
  if (normalizedCategory.includes('tricep')) {
    return [MuscleGroup.TRICEPS];
  }
  if (normalizedCategory.includes('leg')) {
    return [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS];
  }
  if (normalizedCategory.includes('glute')) {
    return [MuscleGroup.GLUTES];
  }
  if (normalizedCategory.includes('ab') || normalizedCategory.includes('core')) {
    return [MuscleGroup.ABS];
  }
  if (normalizedCategory.includes('calf')) {
    return [MuscleGroup.CALVES];
  }

  // Return empty array if no match found
  return [];
}

/**
 * Maps multiple StrengthLog categories to combined muscle groups
 */
export function mapStrengthLogCategoriesToMuscleGroups(
  categories: string[]
): { primary: MuscleGroup[]; secondary: MuscleGroup[] } {
  const allMuscles = new Set<MuscleGroup>();
  
  categories.forEach(category => {
    const muscles = mapStrengthLogCategoryToMuscleGroups(category);
    muscles.forEach(muscle => allMuscles.add(muscle));
  });

  const musclesArray = Array.from(allMuscles);
  
  // For now, treat all as primary. In the future, we could add logic
  // to determine primary vs secondary based on category order or other factors
  return {
    primary: musclesArray,
    secondary: [],
  };
}

/**
 * Map individual muscle name (e.g., "Chest", "Triceps") to MuscleGroup enum
 */
export function mapMuscleNameToMuscleGroup(muscleName: string): MuscleGroup | null {
  const normalized = muscleName.toLowerCase().trim();
  
  const muscleMap: Record<string, MuscleGroup> = {
    'chest': MuscleGroup.CHEST,
    'upper chest': MuscleGroup.UPPER_CHEST,
    'lower chest': MuscleGroup.LOWER_CHEST,
    'shoulder': MuscleGroup.SHOULDERS,
    'shoulders': MuscleGroup.SHOULDERS,
    'front delts': MuscleGroup.FRONT_DELTS,
    'front deltoids': MuscleGroup.FRONT_DELTS,
    'lateral delts': MuscleGroup.SIDE_DELTS,
    'side delts': MuscleGroup.SIDE_DELTS,
    'rear delts': MuscleGroup.REAR_DELTS,
    'rear deltoids': MuscleGroup.REAR_DELTS,
    'deltoids': MuscleGroup.SHOULDERS,
    'deltoid': MuscleGroup.SHOULDERS,
    'back': MuscleGroup.BACK,
    'lats': MuscleGroup.LATS,
    'latissimus dorsi': MuscleGroup.LATS,
    'traps': MuscleGroup.TRAPS,
    'trapezius': MuscleGroup.TRAPS,
    'rhomboids': MuscleGroup.RHOMBOIDS,
    'lower back': MuscleGroup.LOWER_BACK,
    'bicep': MuscleGroup.BICEPS,
    'biceps': MuscleGroup.BICEPS,
    'tricep': MuscleGroup.TRICEPS,
    'triceps': MuscleGroup.TRICEPS,
    'forearm flexors': MuscleGroup.FOREARMS,
    'forearm extensors': MuscleGroup.FOREARMS,
    'forearms': MuscleGroup.FOREARMS,
    'grip': MuscleGroup.FOREARMS,
    'abs': MuscleGroup.ABS,
    'abdominal': MuscleGroup.ABS,
    'abdominals': MuscleGroup.ABS,
    'core': MuscleGroup.ABS,
    'obliques': MuscleGroup.OBLIQUES,
    'quads': MuscleGroup.QUADS,
    'quadriceps': MuscleGroup.QUADS,
    'hamstrings': MuscleGroup.HAMSTRINGS,
    'hamstring': MuscleGroup.HAMSTRINGS,
    'glutes': MuscleGroup.GLUTES,
    'glute': MuscleGroup.GLUTES,
    'calves': MuscleGroup.CALVES,
    'calf': MuscleGroup.CALVES,
    'hip flexors': MuscleGroup.HIP_FLEXORS,
  };

  // Check exact match
  if (muscleMap[normalized]) {
    return muscleMap[normalized];
  }

  // Check partial matches
  for (const [key, muscle] of Object.entries(muscleMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return muscle;
    }
  }

  return null;
}

