export enum MuscleGroup {
  // Upper Body - Chest
  CHEST = 'chest',
  UPPER_CHEST = 'upper_chest',
  LOWER_CHEST = 'lower_chest',
  
  // Upper Body - Back
  BACK = 'back',
  LATS = 'lats',
  TRAPS = 'traps',
  RHOMBOIDS = 'rhomboids',
  LOWER_BACK = 'lower_back',
  
  // Upper Body - Shoulders
  SHOULDERS = 'shoulders',
  FRONT_DELTS = 'front_delts',
  SIDE_DELTS = 'side_delts',
  REAR_DELTS = 'rear_delts',
  
  // Upper Body - Arms
  BICEPS = 'biceps',
  TRICEPS = 'triceps',
  FOREARMS = 'forearms',
  
  // Core
  ABS = 'abs',
  OBLIQUES = 'obliques',
  
  // Lower Body
  QUADS = 'quads',
  HAMSTRINGS = 'hamstrings',
  GLUTES = 'glutes',
  CALVES = 'calves',
  HIP_FLEXORS = 'hip_flexors',
}

export type RecoveryStatus = 'fresh' | 'recovering' | 'sore' | 'ready' | 'overworked';

export interface MuscleStatus {
  id?: number;
  muscle: MuscleGroup;
  lastWorked: Date | null;
  recoveryStatus: RecoveryStatus;
  recoveryPercentage: number; // 0-100
  workloadScore: number; // cumulative fatigue score
  recommendedRestDays: number;
  totalVolumeLast7Days: number;
  trainingFrequency: number; // times per week
  userId?: string; // User ID for multi-user support
  version?: number; // For optimistic locking
  deletedAt?: Date | null; // Soft delete timestamp
}

export interface RecoverySettings {
  beginnerRestDays: Partial<Record<MuscleGroup, number>>;
  intermediateRestDays: Partial<Record<MuscleGroup, number>>;
  advancedRestDays: Partial<Record<MuscleGroup, number>>;
  overtrainingThreshold: number;
}

export const DEFAULT_RECOVERY_SETTINGS: RecoverySettings = {
  beginnerRestDays: {
    [MuscleGroup.CHEST]: 3,
    [MuscleGroup.BACK]: 3,
    [MuscleGroup.SHOULDERS]: 2,
    [MuscleGroup.BICEPS]: 2,
    [MuscleGroup.TRICEPS]: 2,
    [MuscleGroup.QUADS]: 4,
    [MuscleGroup.HAMSTRINGS]: 4,
    [MuscleGroup.GLUTES]: 3,
    [MuscleGroup.ABS]: 1,
  },
  intermediateRestDays: {
    [MuscleGroup.CHEST]: 2,
    [MuscleGroup.BACK]: 2,
    [MuscleGroup.SHOULDERS]: 2,
    [MuscleGroup.BICEPS]: 1,
    [MuscleGroup.TRICEPS]: 1,
    [MuscleGroup.QUADS]: 3,
    [MuscleGroup.HAMSTRINGS]: 3,
    [MuscleGroup.GLUTES]: 2,
    [MuscleGroup.ABS]: 1,
  },
  advancedRestDays: {
    [MuscleGroup.CHEST]: 1,
    [MuscleGroup.BACK]: 1,
    [MuscleGroup.SHOULDERS]: 1,
    [MuscleGroup.BICEPS]: 1,
    [MuscleGroup.TRICEPS]: 1,
    [MuscleGroup.QUADS]: 2,
    [MuscleGroup.HAMSTRINGS]: 2,
    [MuscleGroup.GLUTES]: 1,
    [MuscleGroup.ABS]: 1,
  },
  overtrainingThreshold: 80,
};

