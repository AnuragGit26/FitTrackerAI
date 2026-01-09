/**
 * Bodyweight exercise multipliers
 * These represent the approximate percentage of bodyweight lifted during the exercise
 * Based on biomechanical research and industry standards
 */

export interface BodyweightMultiplier {
  multiplier: number; // Percentage of bodyweight (0-1)
  description: string;
}

/**
 * Exercise-specific bodyweight multipliers
 * Key: normalized exercise name (lowercase, no special chars)
 */
export const BODYWEIGHT_MULTIPLIERS: Record<string, BodyweightMultiplier> = {
  // Push exercises
  'pushups': { multiplier: 0.64, description: '~64% of bodyweight' },
  'push-ups': { multiplier: 0.64, description: '~64% of bodyweight' },
  'push ups': { multiplier: 0.64, description: '~64% of bodyweight' },
  'diamond pushups': { multiplier: 0.70, description: '~70% of bodyweight' },
  'diamond push-ups': { multiplier: 0.70, description: '~70% of bodyweight' },
  'decline pushups': { multiplier: 0.75, description: '~75% of bodyweight' },
  'decline push-ups': { multiplier: 0.75, description: '~75% of bodyweight' },
  'pike pushups': { multiplier: 0.70, description: '~70% of bodyweight' },
  'pike push-ups': { multiplier: 0.70, description: '~70% of bodyweight' },
  'handstand pushups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'handstand push-ups': { multiplier: 1.0, description: '~100% of bodyweight' },

  // Pull exercises
  'pullups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'pull-ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'pull ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'chin-ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'chinups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'chin ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'australian pullups': { multiplier: 0.50, description: '~50% of bodyweight' },
  'inverted rows': { multiplier: 0.50, description: '~50% of bodyweight' },
  'inverted row': { multiplier: 0.50, description: '~50% of bodyweight' },

  // Dip exercises
  'dips': { multiplier: 1.0, description: '~100% of bodyweight' },
  'chest dips': { multiplier: 1.0, description: '~100% of bodyweight' },
  'tricep dips': { multiplier: 1.0, description: '~100% of bodyweight' },
  'bench dips': { multiplier: 0.65, description: '~65% of bodyweight' },

  // Squat variations
  'bodyweight squats': { multiplier: 0.60, description: '~60% of bodyweight' },
  'bodyweight squat': { multiplier: 0.60, description: '~60% of bodyweight' },
  'air squats': { multiplier: 0.60, description: '~60% of bodyweight' },
  'air squat': { multiplier: 0.60, description: '~60% of bodyweight' },
  'jump squats': { multiplier: 0.70, description: '~70% of bodyweight' },
  'jump squat': { multiplier: 0.70, description: '~70% of bodyweight' },
  'pistol squats': { multiplier: 1.0, description: '~100% of bodyweight' },
  'pistol squat': { multiplier: 1.0, description: '~100% of bodyweight' },
  'sissy squats': { multiplier: 0.70, description: '~70% of bodyweight' },
  'sissy squat': { multiplier: 0.70, description: '~70% of bodyweight' },

  // Lunge variations
  'lunges': { multiplier: 0.60, description: '~60% of bodyweight' },
  'lunge': { multiplier: 0.60, description: '~60% of bodyweight' },
  'walking lunges': { multiplier: 0.60, description: '~60% of bodyweight' },
  'walking lunge': { multiplier: 0.60, description: '~60% of bodyweight' },
  'jump lunges': { multiplier: 0.70, description: '~70% of bodyweight' },
  'jump lunge': { multiplier: 0.70, description: '~70% of bodyweight' },
  'bulgarian split squats': { multiplier: 0.75, description: '~75% of bodyweight' },
  'bulgarian split squat': { multiplier: 0.75, description: '~75% of bodyweight' },

  // Core exercises
  'situps': { multiplier: 0.50, description: '~50% of bodyweight' },
  'sit-ups': { multiplier: 0.50, description: '~50% of bodyweight' },
  'sit ups': { multiplier: 0.50, description: '~50% of bodyweight' },
  'crunches': { multiplier: 0.40, description: '~40% of bodyweight' },
  'crunch': { multiplier: 0.40, description: '~40% of bodyweight' },
  'leg raises': { multiplier: 0.45, description: '~45% of bodyweight' },
  'leg raise': { multiplier: 0.45, description: '~45% of bodyweight' },
  'hanging leg raises': { multiplier: 0.50, description: '~50% of bodyweight' },
  'hanging leg raise': { multiplier: 0.50, description: '~50% of bodyweight' },
  'v-ups': { multiplier: 0.55, description: '~55% of bodyweight' },
  'vups': { multiplier: 0.55, description: '~55% of bodyweight' },

  // Plyometric exercises
  'burpees': { multiplier: 0.70, description: '~70% of bodyweight' },
  'burpee': { multiplier: 0.70, description: '~70% of bodyweight' },
  'mountain climbers': { multiplier: 0.50, description: '~50% of bodyweight' },
  'mountain climber': { multiplier: 0.50, description: '~50% of bodyweight' },
  'jumping jacks': { multiplier: 0.30, description: '~30% of bodyweight' },
  'jumping jack': { multiplier: 0.30, description: '~30% of bodyweight' },
  'box jumps': { multiplier: 0.80, description: '~80% of bodyweight' },
  'box jump': { multiplier: 0.80, description: '~80% of bodyweight' },

  // Calisthenics advanced
  'muscle-ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'muscle ups': { multiplier: 1.0, description: '~100% of bodyweight' },
  'front lever': { multiplier: 1.0, description: '~100% of bodyweight' },
  'back lever': { multiplier: 1.0, description: '~100% of bodyweight' },
  'human flag': { multiplier: 1.0, description: '~100% of bodyweight' },
  'planche': { multiplier: 1.0, description: '~100% of bodyweight' },
  'l-sit': { multiplier: 0.80, description: '~80% of bodyweight' },
  'lsit': { multiplier: 0.80, description: '~80% of bodyweight' },
};

/**
 * Default multiplier for unrecognized bodyweight exercises
 * Conservative estimate of 60% bodyweight
 */
export const DEFAULT_BODYWEIGHT_MULTIPLIER = 0.60;

/**
 * Get bodyweight multiplier for an exercise
 * @param exerciseName - Name of the exercise
 * @returns Multiplier value (0-1) representing percentage of bodyweight
 */
export function getBodyweightMultiplier(exerciseName: string): number {
  // Normalize exercise name for lookup
  const normalized = exerciseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, ''); // Remove special characters except spaces and hyphens

  const multiplierData = BODYWEIGHT_MULTIPLIERS[normalized];

  if (multiplierData) {
    return multiplierData.multiplier;
  }

  // Check if exercise name contains key bodyweight exercise terms
  const keywords = Object.keys(BODYWEIGHT_MULTIPLIERS);
  for (const keyword of keywords) {
    if (normalized.includes(keyword) || keyword.includes(normalized)) {
      return BODYWEIGHT_MULTIPLIERS[keyword].multiplier;
    }
  }

  // Return default if no match found
  return DEFAULT_BODYWEIGHT_MULTIPLIER;
}

/**
 * Get bodyweight multiplier description for an exercise
 * @param exerciseName - Name of the exercise
 * @returns Description string or null if not found
 */
export function getBodyweightMultiplierDescription(exerciseName: string): string | null {
  const normalized = exerciseName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '');

  const multiplierData = BODYWEIGHT_MULTIPLIERS[normalized];

  if (multiplierData) {
    return multiplierData.description;
  }

  return null;
}

/**
 * Calculate effective weight for a bodyweight exercise
 * @param bodyweight - User's bodyweight in kg
 * @param exerciseName - Name of the exercise
 * @returns Effective weight in kg
 */
export function calculateEffectiveBodyweight(
  bodyweight: number,
  exerciseName: string
): number {
  const multiplier = getBodyweightMultiplier(exerciseName);
  return bodyweight * multiplier;
}

/**
 * Format bodyweight volume for display
 * @param volume - Calculated volume (bodyweight * multiplier * reps)
 * @param unit - User's preferred unit
 * @returns Formatted string
 */
export function formatBodyweightVolume(volume: number, unit: 'kg' | 'lbs'): string {
  const rounded = Math.round(volume * 10) / 10; // Round to 1 decimal place
  return `${rounded} ${unit}`;
}
