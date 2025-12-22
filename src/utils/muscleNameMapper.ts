import { MuscleGroup } from '@/types/muscle';

/**
 * Maps MuscleGroup enum values to GLB mesh names
 * Handles bilateral muscles (Left/Right) and common naming variations
 */
export const MUSCLE_NAME_MAP: Record<MuscleGroup, string[]> = {
  // Upper Body - Chest
  [MuscleGroup.CHEST]: ['PectoralisMajor_L', 'PectoralisMajor_R', 'Chest_L', 'Chest_R', 'Pec_L', 'Pec_R'],
  [MuscleGroup.UPPER_CHEST]: ['UpperChest_L', 'UpperChest_R', 'UpperPec_L', 'UpperPec_R'],
  [MuscleGroup.LOWER_CHEST]: ['LowerChest_L', 'LowerChest_R', 'LowerPec_L', 'LowerPec_R'],

  // Upper Body - Back
  [MuscleGroup.BACK]: ['LatissimusDorsi_L', 'LatissimusDorsi_R', 'Back_L', 'Back_R'],
  [MuscleGroup.LATS]: ['LatissimusDorsi_L', 'LatissimusDorsi_R', 'Lats_L', 'Lats_R'],
  [MuscleGroup.TRAPS]: ['Trapezius_L', 'Trapezius_R', 'Traps_L', 'Traps_R'],
  [MuscleGroup.RHOMBOIDS]: ['Rhomboids_L', 'Rhomboids_R', 'Rhomboid_L', 'Rhomboid_R'],
  [MuscleGroup.LOWER_BACK]: ['ErectorSpinae_L', 'ErectorSpinae_R', 'LowerBack_L', 'LowerBack_R'],

  // Upper Body - Shoulders
  [MuscleGroup.SHOULDERS]: ['Deltoid_L', 'Deltoid_R', 'Shoulder_L', 'Shoulder_R'],
  [MuscleGroup.FRONT_DELTS]: ['FrontDeltoid_L', 'FrontDeltoid_R', 'AnteriorDeltoid_L', 'AnteriorDeltoid_R'],
  [MuscleGroup.SIDE_DELTS]: ['SideDeltoid_L', 'SideDeltoid_R', 'LateralDeltoid_L', 'LateralDeltoid_R'],
  [MuscleGroup.REAR_DELTS]: ['RearDeltoid_L', 'RearDeltoid_R', 'PosteriorDeltoid_L', 'PosteriorDeltoid_R'],

  // Upper Body - Arms
  [MuscleGroup.BICEPS]: ['Bicep_L', 'Bicep_R', 'Biceps_L', 'Biceps_R', 'BicepsBrachii_L', 'BicepsBrachii_R'],
  [MuscleGroup.TRICEPS]: ['Tricep_L', 'Tricep_R', 'Triceps_L', 'Triceps_R', 'TricepsBrachii_L', 'TricepsBrachii_R'],
  [MuscleGroup.FOREARMS]: ['Forearm_L', 'Forearm_R', 'Forearms_L', 'Forearms_R'],

  // Core
  [MuscleGroup.ABS]: ['RectusAbdominis', 'Abs', 'Abdominals', 'Ab_L', 'Ab_R'],
  [MuscleGroup.OBLIQUES]: ['Oblique_L', 'Oblique_R', 'Obliques_L', 'Obliques_R', 'ExternalOblique_L', 'ExternalOblique_R'],

  // Lower Body
  [MuscleGroup.QUADS]: ['Quadriceps_L', 'Quadriceps_R', 'Quad_L', 'Quad_R', 'QuadricepsFemoris_L', 'QuadricepsFemoris_R'],
  [MuscleGroup.HAMSTRINGS]: ['Hamstring_L', 'Hamstring_R', 'Hamstrings_L', 'Hamstrings_R', 'BicepsFemoris_L', 'BicepsFemoris_R'],
  [MuscleGroup.GLUTES]: ['GluteusMaximus_L', 'GluteusMaximus_R', 'Glute_L', 'Glute_R', 'Glutes_L', 'Glutes_R'],
  [MuscleGroup.CALVES]: ['Calf_L', 'Calf_R', 'Calves_L', 'Calves_R', 'Gastrocnemius_L', 'Gastrocnemius_R'],
  [MuscleGroup.HIP_FLEXORS]: ['HipFlexor_L', 'HipFlexor_R', 'Iliopsoas_L', 'Iliopsoas_R'],
};

/**
 * Get all possible mesh names for a muscle group
 */
export function getMuscleMeshNames(muscleGroup: MuscleGroup): string[] {
  return MUSCLE_NAME_MAP[muscleGroup] || [];
}

/**
 * Check if a mesh name matches a muscle group
 */
export function matchesMuscleGroup(meshName: string, muscleGroup: MuscleGroup): boolean {
  const possibleNames = getMuscleMeshNames(muscleGroup);
  return possibleNames.some(name => 
    meshName.toLowerCase() === name.toLowerCase() ||
    meshName.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(meshName.toLowerCase())
  );
}

/**
 * Find the muscle group for a given mesh name
 */
export function getMuscleGroupFromMeshName(meshName: string): MuscleGroup | null {
  for (const [muscleGroup, names] of Object.entries(MUSCLE_NAME_MAP)) {
    if (names.some(name => 
      meshName.toLowerCase() === name.toLowerCase() ||
      meshName.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(meshName.toLowerCase())
    )) {
      return muscleGroup as MuscleGroup;
    }
  }
  return null;
}

/**
 * Format mesh name for display (e.g., "Bicep_L" -> "Left Bicep")
 */
export function formatMuscleNameForDisplay(meshName: string): string {
  // Remove common suffixes
  let name = meshName.replace(/_L$|_R$/i, '');
  
  // Handle bilateral indicators
  const isLeft = /_L$/i.test(meshName);
  const isRight = /_R$/i.test(meshName);
  
  // Convert to readable format
  name = name.replace(/([A-Z])/g, ' $1').trim();
  name = name.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  // Add side indicator
  if (isLeft) {
    name = `Left ${name}`;
  } else if (isRight) {
    name = `Right ${name}`;
  }
  
  return name;
}

