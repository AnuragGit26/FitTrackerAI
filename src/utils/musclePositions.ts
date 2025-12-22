import { MuscleGroup } from '@/types/muscle';

export interface MusclePosition3D {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  side?: 'left' | 'right' | 'center';
  shape?: 'capsule' | 'sphere' | 'box' | 'ellipsoid';
}

// Anatomically accurate muscle positions and shapes
export const musclePositions3D: Record<MuscleGroup, MusclePosition3D | MusclePosition3D[]> = {
  // Chest - bilateral
  [MuscleGroup.CHEST]: [
    {
      position: [-0.25, 0.8, 0.35],
      scale: [0.35, 0.5, 0.2],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.25, 0.8, 0.35],
      scale: [0.35, 0.5, 0.2],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.UPPER_CHEST]: [
    {
      position: [-0.2, 1.0, 0.38],
      scale: [0.3, 0.35, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.2, 1.0, 0.38],
      scale: [0.3, 0.35, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.LOWER_CHEST]: [
    {
      position: [-0.25, 0.6, 0.32],
      scale: [0.3, 0.35, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.25, 0.6, 0.32],
      scale: [0.3, 0.35, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],

  // Back - bilateral
  [MuscleGroup.BACK]: {
    position: [0, 0.8, -0.35],
    scale: [0.8, 0.7, 0.25],
    side: 'center',
    shape: 'ellipsoid',
  },
  [MuscleGroup.LATS]: [
    {
      position: [-0.4, 0.7, -0.4],
      scale: [0.25, 0.6, 0.2],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.4, 0.7, -0.4],
      scale: [0.25, 0.6, 0.2],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.TRAPS]: {
    position: [0, 1.2, -0.28],
    scale: [0.8, 0.35, 0.18],
    side: 'center',
    shape: 'ellipsoid',
  },
  [MuscleGroup.RHOMBOIDS]: {
    position: [0, 0.9, -0.32],
    scale: [0.5, 0.35, 0.12],
    side: 'center',
    shape: 'ellipsoid',
  },
  [MuscleGroup.LOWER_BACK]: {
    position: [0, 0.3, -0.32],
    scale: [0.6, 0.5, 0.18],
    side: 'center',
    shape: 'ellipsoid',
  },

  // Shoulders - bilateral
  [MuscleGroup.SHOULDERS]: [
    {
      position: [-0.35, 1.1, 0.25],
      scale: [0.2, 0.35, 0.25],
      side: 'left',
      shape: 'sphere',
    },
    {
      position: [0.35, 1.1, 0.25],
      scale: [0.2, 0.35, 0.25],
      side: 'right',
      shape: 'sphere',
    },
  ],
  [MuscleGroup.FRONT_DELTS]: [
    {
      position: [-0.35, 1.1, 0.38],
      scale: [0.18, 0.3, 0.2],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.35, 1.1, 0.38],
      scale: [0.18, 0.3, 0.2],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.SIDE_DELTS]: [
    {
      position: [-0.42, 1.1, 0.15],
      scale: [0.2, 0.3, 0.2],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.42, 1.1, 0.15],
      scale: [0.2, 0.3, 0.2],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.REAR_DELTS]: [
    {
      position: [-0.35, 1.1, -0.22],
      scale: [0.18, 0.3, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.35, 1.1, -0.22],
      scale: [0.18, 0.3, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],

  // Arms - bilateral
  [MuscleGroup.BICEPS]: [
    {
      position: [-0.35, 0.7, 0.42],
      scale: [0.15, 0.5, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.35, 0.7, 0.42],
      scale: [0.15, 0.5, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.TRICEPS]: [
    {
      position: [-0.35, 0.7, 0.25],
      scale: [0.15, 0.5, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.35, 0.7, 0.25],
      scale: [0.15, 0.5, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.FOREARMS]: [
    {
      position: [-0.3, 0.2, 0.32],
      scale: [0.12, 0.4, 0.12],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.3, 0.2, 0.32],
      scale: [0.12, 0.4, 0.12],
      side: 'right',
      shape: 'capsule',
    },
  ],

  // Core
  [MuscleGroup.ABS]: {
    position: [0, 0.4, 0.38],
    scale: [0.4, 0.6, 0.2],
    side: 'center',
    shape: 'ellipsoid',
  },
  [MuscleGroup.OBLIQUES]: [
    {
      position: [-0.25, 0.4, 0.32],
      scale: [0.2, 0.5, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.25, 0.4, 0.32],
      scale: [0.2, 0.5, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],

  // Lower Body - bilateral
  [MuscleGroup.QUADS]: [
    {
      position: [-0.2, -0.2, 0.35],
      scale: [0.22, 0.65, 0.25],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.2, -0.2, 0.35],
      scale: [0.22, 0.65, 0.25],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.HAMSTRINGS]: [
    {
      position: [-0.2, -0.2, -0.32],
      scale: [0.22, 0.65, 0.25],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.2, -0.2, -0.32],
      scale: [0.22, 0.65, 0.25],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.GLUTES]: [
    {
      position: [-0.2, 0, -0.38],
      scale: [0.25, 0.4, 0.22],
      side: 'left',
      shape: 'ellipsoid',
    },
    {
      position: [0.2, 0, -0.38],
      scale: [0.25, 0.4, 0.22],
      side: 'right',
      shape: 'ellipsoid',
    },
  ],
  [MuscleGroup.CALVES]: [
    {
      position: [-0.15, -0.8, 0.12],
      scale: [0.15, 0.4, 0.15],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.15, -0.8, 0.12],
      scale: [0.15, 0.4, 0.15],
      side: 'right',
      shape: 'capsule',
    },
  ],
  [MuscleGroup.HIP_FLEXORS]: [
    {
      position: [-0.18, 0.1, 0.28],
      scale: [0.18, 0.3, 0.12],
      side: 'left',
      shape: 'capsule',
    },
    {
      position: [0.18, 0.1, 0.28],
      scale: [0.18, 0.3, 0.12],
      side: 'right',
      shape: 'capsule',
    },
  ],
};

export function getMuscleDisplayName(muscle: MuscleGroup): string {
  const names: Record<MuscleGroup, string> = {
    [MuscleGroup.CHEST]: 'Chest',
    [MuscleGroup.UPPER_CHEST]: 'Upper Chest',
    [MuscleGroup.LOWER_CHEST]: 'Lower Chest',
    [MuscleGroup.BACK]: 'Back',
    [MuscleGroup.LATS]: 'Lats',
    [MuscleGroup.TRAPS]: 'Traps',
    [MuscleGroup.RHOMBOIDS]: 'Rhomboids',
    [MuscleGroup.LOWER_BACK]: 'Lower Back',
    [MuscleGroup.SHOULDERS]: 'Shoulders',
    [MuscleGroup.FRONT_DELTS]: 'Front Delts',
    [MuscleGroup.SIDE_DELTS]: 'Side Delts',
    [MuscleGroup.REAR_DELTS]: 'Rear Delts',
    [MuscleGroup.BICEPS]: 'Biceps',
    [MuscleGroup.TRICEPS]: 'Triceps',
    [MuscleGroup.FOREARMS]: 'Forearms',
    [MuscleGroup.ABS]: 'Abs',
    [MuscleGroup.OBLIQUES]: 'Obliques',
    [MuscleGroup.QUADS]: 'Quadriceps',
    [MuscleGroup.HAMSTRINGS]: 'Hamstrings',
    [MuscleGroup.GLUTES]: 'Glutes',
    [MuscleGroup.CALVES]: 'Calves',
    [MuscleGroup.HIP_FLEXORS]: 'Hip Flexors',
  };
  return names[muscle] || muscle;
}
