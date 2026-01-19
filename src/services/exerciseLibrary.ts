import { Exercise, ExerciseAdvancedDetails } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { exerciseDetailsService } from './exerciseDetailsService';
import { logger } from '@/utils/logger';
import { generateAlphanumericId, generateCustomExerciseId } from '@/utils/idGenerator';

export enum EquipmentCategory {
  FREE_WEIGHTS = 'Free Weights',
  MACHINES = 'Machines',
  CABLES = 'Cables',
  BODYWEIGHT = 'Bodyweight',
  FUNCTIONAL = 'Functional',
  OLYMPIC = 'Olympic',
  ASSISTED = 'Assisted',
}

export const EQUIPMENT_CATEGORY_MAP: Record<string, EquipmentCategory> = {
  // Free Weights
  'Barbell': EquipmentCategory.FREE_WEIGHTS,
  'Dumbbells': EquipmentCategory.FREE_WEIGHTS,
  'Kettlebells': EquipmentCategory.FREE_WEIGHTS,
  'Plates': EquipmentCategory.FREE_WEIGHTS,
  'EZ Bar': EquipmentCategory.FREE_WEIGHTS,
  'Hex Bar': EquipmentCategory.FREE_WEIGHTS,
  'Medicine Ball': EquipmentCategory.FREE_WEIGHTS,
  'Resistance Bands': EquipmentCategory.FREE_WEIGHTS,
  // Support equipment for free weights (not machines)
  'Bench': EquipmentCategory.FREE_WEIGHTS,
  'Squat Rack': EquipmentCategory.FREE_WEIGHTS,
  'Preacher Bench': EquipmentCategory.FREE_WEIGHTS,
  'Weight Belt': EquipmentCategory.FREE_WEIGHTS,

  // Machines
  'Leg Press Machine': EquipmentCategory.MACHINES,
  'Smith Machine': EquipmentCategory.MACHINES,
  'Hammer Strength Machine': EquipmentCategory.MACHINES,
  'Seated Row Machine': EquipmentCategory.MACHINES,
  'Lat Pulldown Machine': EquipmentCategory.MACHINES,
  'Chest Press Machine': EquipmentCategory.MACHINES,
  'Shoulder Press Machine': EquipmentCategory.MACHINES,
  'Leg Extension Machine': EquipmentCategory.MACHINES,
  'Leg Curl Machine': EquipmentCategory.MACHINES,
  'Calf Raise Machine': EquipmentCategory.MACHINES,
  'Seated Calf Raise Machine': EquipmentCategory.MACHINES,
  'Hack Squat Machine': EquipmentCategory.MACHINES,
  'Preacher Curl Machine': EquipmentCategory.MACHINES,
  'Tricep Extension Machine': EquipmentCategory.MACHINES,
  'Ab Crunch Machine': EquipmentCategory.MACHINES,
  'Glute Ham Raise Machine': EquipmentCategory.MACHINES,
  'Pec Deck Machine': EquipmentCategory.MACHINES,
  'Reverse Fly Machine': EquipmentCategory.MACHINES,
  'T-Bar Row Machine': EquipmentCategory.MACHINES,
  'Rowing Machine': EquipmentCategory.MACHINES,
  'Assault Bike': EquipmentCategory.MACHINES,
  'Air Bike': EquipmentCategory.MACHINES,
  'Hyperextension Bench': EquipmentCategory.MACHINES,
  'Assisted Pull-up Machine': EquipmentCategory.MACHINES,

  // Cables
  'Cable': EquipmentCategory.CABLES,
  'Cable Machine': EquipmentCategory.CABLES,
  'Cable Pulley': EquipmentCategory.CABLES,

  // Bodyweight
  'Pull-up Bar': EquipmentCategory.BODYWEIGHT,
  'Dip Bar': EquipmentCategory.BODYWEIGHT,
  'Parallel Bars': EquipmentCategory.BODYWEIGHT,
  'Wall': EquipmentCategory.BODYWEIGHT,

  // Functional
  'Battle Ropes': EquipmentCategory.FUNCTIONAL,
  'Sled': EquipmentCategory.FUNCTIONAL,
  'Tire': EquipmentCategory.FUNCTIONAL,
  'Sandbag': EquipmentCategory.FUNCTIONAL,
  'TRX': EquipmentCategory.FUNCTIONAL,
  'Suspension Trainer': EquipmentCategory.FUNCTIONAL,
  'Ab Wheel': EquipmentCategory.FUNCTIONAL,
  'Prowler': EquipmentCategory.FUNCTIONAL,
  'Jump Rope': EquipmentCategory.FUNCTIONAL,
  'Box': EquipmentCategory.FUNCTIONAL,

  // Olympic
  'Olympic Barbell': EquipmentCategory.OLYMPIC,
  'Bumper Plates': EquipmentCategory.OLYMPIC,
  'Platform': EquipmentCategory.OLYMPIC,

  // Assisted
  'Resistance Band': EquipmentCategory.ASSISTED,
};

export function getEquipmentCategories(equipment: string[]): EquipmentCategory[] {
  const categories = new Set<EquipmentCategory>();
  equipment.forEach(eq => {
    const category = EQUIPMENT_CATEGORY_MAP[eq];
    if (category) {
      categories.add(category);
    } else if (eq.length === 0) {
      categories.add(EquipmentCategory.BODYWEIGHT);
    }
  });
  if (equipment.length === 0) {
    categories.add(EquipmentCategory.BODYWEIGHT);
  }
  return Array.from(categories);
}

const CORE_EXERCISES: Omit<Exercise, 'id' | 'isCustom'>[] = [
  // Chest Exercises
  {
    name: 'Barbell Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on bench with feet flat on floor',
      'Grip bar slightly wider than shoulder-width',
      'Lower bar to chest with control',
      'Press bar up explosively',
      'Keep core tight throughout movement'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dumbbell Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'beginner',
    instructions: [
      'Lie on bench holding dumbbells at chest level',
      'Press dumbbells up until arms are extended',
      'Lower with control back to starting position'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Start in plank position',
      'Lower body until chest nearly touches floor',
      'Push back up to starting position',
      'Keep body in straight line'
    ],
    trackingType: 'reps_only',
  },

  // Back Exercises
  {
    name: 'Barbell Deadlift',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.LOWER_BACK, MuscleGroup.TRAPS, MuscleGroup.FOREARMS],
    equipment: ['Barbell', 'Plates'],
    difficulty: 'advanced',
    instructions: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Bend at hips and knees to grip bar',
      'Keep back straight, chest up',
      'Drive through heels to stand up',
      'Lower bar with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Barbell Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Barbell', 'Plates'],
    difficulty: 'intermediate',
    instructions: [
      'Bend at hips, keep back straight',
      'Grip bar slightly wider than shoulder-width',
      'Pull bar to lower chest/upper abdomen',
      'Squeeze back muscles at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Pull-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Pull-up Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Hang from bar with palms facing away',
      'Pull body up until chin clears bar',
      'Lower with control to full arm extension'
    ],
    trackingType: 'reps_only',
  },

  // Shoulder Exercises
  {
    name: 'Overhead Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    equipment: ['Barbell'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hold bar at shoulder level',
      'Press bar overhead until arms are extended',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Lateral Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SIDE_DELTS],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Stand holding dumbbells at sides',
      'Raise arms to sides until parallel to floor',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },

  // Leg Exercises
  {
    name: 'Barbell Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.LOWER_BACK, MuscleGroup.ABS],
    equipment: ['Barbell', 'Squat Rack'],
    difficulty: 'intermediate',
    instructions: [
      'Position bar on upper back',
      'Stand with feet shoulder-width apart',
      'Lower by bending knees and hips',
      'Descend until thighs parallel to floor',
      'Drive through heels to stand up'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Romanian Deadlift',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: ['Barbell'],
    difficulty: 'intermediate',
    instructions: [
      'Hold bar with feet hip-width apart',
      'Hinge at hips, keeping legs mostly straight',
      'Lower bar along legs',
      'Feel stretch in hamstrings',
      'Return to standing by driving hips forward'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Leg Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Leg Press Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit in machine with back against pad',
      'Place feet on platform shoulder-width apart',
      'Lower weight by bending knees',
      'Press platform away until legs are extended'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Walking Lunges',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Step forward into lunge position',
      'Lower back knee toward ground',
      'Push through front heel to step forward',
      'Alternate legs'
    ],
    trackingType: 'weight_reps',
  },

  // Arm Exercises
  {
    name: 'Barbell Bicep Curl',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Barbell'],
    difficulty: 'beginner',
    instructions: [
      'Stand holding bar with palms facing forward',
      'Curl bar toward shoulders',
      'Squeeze biceps at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Tricep Dips',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Dip Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Support body on bars or bench',
      'Lower body by bending arms',
      'Push back up to starting position',
      'Keep elbows close to body'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Close-Grip Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on bench with close grip on bar',
      'Lower bar to lower chest',
      'Press up focusing on triceps'
    ],
    trackingType: 'weight_reps',
  },

  // Core Exercises
  {
    name: 'Plank',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Hold body in straight line',
      'Support on forearms and toes',
      'Keep core tight',
      'Hold position'
    ],
    trackingType: 'duration',
  },
  {
    name: 'Russian Twists',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondaryMuscles: [],
    equipment: ['Medicine Ball'],
    difficulty: 'beginner',
    instructions: [
      'Sit with knees bent, lean back slightly',
      'Rotate torso side to side',
      'Keep core engaged'
    ],
    trackingType: 'weight_reps',
  },

  // Cardio
  {
    name: 'Running',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.CALVES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Maintain steady pace',
      'Keep good posture',
      'Land on mid-foot',
      'Breathe rhythmically'
    ],
    trackingType: 'cardio',
  },
  {
    name: 'Rowing Machine',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.BICEPS],
    equipment: ['Rowing Machine'],
    difficulty: 'beginner',
    instructions: [
      'Push with legs first',
      'Lean back slightly',
      'Pull handle to chest',
      'Return to starting position'
    ],
    trackingType: 'cardio',
  },

  // ========== CHEST EXERCISES (15+) ==========
  {
    name: 'Incline Barbell Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.UPPER_CHEST, MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Set bench to 30-45 degree incline',
      'Lie back with feet flat on floor',
      'Grip bar slightly wider than shoulder-width',
      'Lower bar to upper chest',
      'Press up explosively'
    ],
  trackingType: 'cardio',
    },
  {
    name: 'Decline Barbell Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LOWER_CHEST, MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Set bench to decline position',
      'Secure feet in footrests',
      'Lower bar to lower chest',
      'Press up with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Incline Dumbbell Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.UPPER_CHEST, MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Set bench to 30-45 degree incline',
      'Press dumbbells up and slightly together',
      'Lower with control to chest level'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Decline Dumbbell Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LOWER_CHEST, MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Set bench to decline',
      'Press dumbbells up from chest',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dumbbell Flyes',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Lie on bench with dumbbells above chest',
      'Lower dumbbells in wide arc',
      'Feel stretch in chest',
      'Bring dumbbells back together above chest'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Incline Dumbbell Flyes',
    category: 'strength',
    primaryMuscles: [MuscleGroup.UPPER_CHEST, MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Set bench to incline',
      'Perform flyes with slight bend in elbows',
      'Focus on upper chest stretch'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Crossover',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Set cables to high position',
      'Step forward with one foot',
      'Pull cables down and together',
      'Squeeze chest at bottom'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Flyes',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Set cables at chest height',
      'Stand between cable stations',
      'Pull cables together in front',
      'Control the stretch on return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Pec Deck Flyes',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Pec Deck Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit in machine with back against pad',
      'Place forearms on pads',
      'Squeeze pads together',
      'Control the stretch on return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Smith Machine Bench Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Smith Machine', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Position bench under Smith machine bar',
      'Unrack bar and lower to chest',
      'Press up until arms extended'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hammer Strength Chest Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Hammer Strength Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit in machine with back against pad',
      'Grip handles at chest level',
      'Press handles forward',
      'Control return to starting position'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Weighted Dips',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.TRICEPS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [],
    equipment: ['Dip Bar', 'Weight Belt'],
    difficulty: 'advanced',
    instructions: [
      'Attach weight to belt',
      'Support body on dip bars',
      'Lower body by bending arms',
      'Push up explosively'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Chest Dips',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dip Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Lean forward on dip bars',
      'Lower body with forward lean',
      'Focus on chest contraction',
      'Push up to starting position'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Diamond Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.TRICEPS],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS, MuscleGroup.ABS],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Form diamond shape with hands',
      'Lower body to hands',
      'Push up explosively',
      'Keep core tight'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Wide-Grip Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Place hands wider than shoulder-width',
      'Lower body until chest nearly touches floor',
      'Push back up'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Incline Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LOWER_CHEST, MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS, MuscleGroup.TRICEPS],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Place hands on elevated surface',
      'Keep body in straight line',
      'Lower chest to surface',
      'Push back up'
    ],
    trackingType: 'reps_only',
  },

  // ========== BACK EXERCISES (20+) ==========
  {
    name: 'Wide-Grip Pull-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Pull-up Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Grip bar wider than shoulder-width',
      'Pull body up until chin clears bar',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Close-Grip Pull-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Pull-up Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Grip bar with hands close together',
      'Pull up focusing on lats',
      'Squeeze at top'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Weighted Pull-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Pull-up Bar', 'Weight Belt'],
    difficulty: 'advanced',
    instructions: [
      'Attach weight to belt',
      'Perform pull-ups with added resistance',
      'Maintain strict form'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Chin-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BACK],
    equipment: ['Pull-up Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Grip bar with palms facing you',
      'Pull up until chin clears bar',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Assisted Pull-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Assisted Pull-up Machine'],
    difficulty: 'beginner',
    instructions: [
      'Set assistance weight',
      'Kneel on platform',
      'Pull up with assistance',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Lat Pulldown (Wide Grip)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Lat Pulldown Machine'],
    difficulty: 'beginner',
    instructions: [
      'Grip bar wider than shoulder-width',
      'Pull bar to upper chest',
      'Squeeze lats at bottom',
      'Control return to top'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Lat Pulldown (Close Grip)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Lat Pulldown Machine'],
    difficulty: 'beginner',
    instructions: [
      'Use close-grip attachment',
      'Pull to lower chest',
      'Focus on lat contraction'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Grip Lat Pulldown',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.BACK],
    equipment: ['Lat Pulldown Machine'],
    difficulty: 'beginner',
    instructions: [
      'Grip bar with palms facing you',
      'Pull to upper chest',
      'Squeeze biceps and lats'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Row (Seated)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Sit with feet on platform',
      'Pull handle to lower chest',
      'Squeeze back muscles',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Row (Wide Grip)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.RHOMBOIDS, MuscleGroup.TRAPS],
    secondaryMuscles: [MuscleGroup.LATS, MuscleGroup.BICEPS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Use wide-grip attachment',
      'Pull to upper abdomen',
      'Focus on middle back'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'T-Bar Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['T-Bar Row Machine', 'Plates'],
    difficulty: 'intermediate',
    instructions: [
      'Straddle T-bar with feet on platform',
      'Pull handle to chest',
      'Squeeze back at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Seated Cable Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Seated Row Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with back straight',
      'Pull handle to abdomen',
      'Squeeze shoulder blades together'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'One-Arm Dumbbell Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Place one knee and hand on bench',
      'Pull dumbbell to hip',
      'Squeeze back at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Chest-Supported Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Lie face down on incline bench',
      'Row dumbbells to sides',
      'Squeeze shoulder blades together'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Barbell Shrugs',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRAPS],
    secondaryMuscles: [],
    equipment: ['Barbell'],
    difficulty: 'beginner',
    instructions: [
      'Hold bar with arms extended',
      'Shrug shoulders up',
      'Hold at top for count',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dumbbell Shrugs',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRAPS],
    secondaryMuscles: [],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells at sides',
      'Shrug shoulders straight up',
      'Hold and squeeze',
      'Lower slowly'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Face Pulls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.REAR_DELTS, MuscleGroup.TRAPS, MuscleGroup.RHOMBOIDS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Set cable at face height',
      'Pull rope to face level',
      'Separate handles at end',
      'Squeeze rear delts'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Pullovers',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.CHEST],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Kneel facing away from cable',
      'Pull cable overhead',
      'Focus on lat stretch and contraction'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Lat Pullover',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LATS, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.CHEST],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Kneel facing away from cable machine',
      'Grasp cable attachment with both hands',
      'Pull cable overhead in an arc motion',
      'Focus on lat stretch and contraction',
      'Control the return to starting position'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Wide-Grip Barbell Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.RHOMBOIDS, MuscleGroup.TRAPS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Barbell', 'Plates'],
    difficulty: 'intermediate',
    instructions: [
      'Grip bar wider than shoulder-width',
      'Pull to upper abdomen',
      'Focus on middle back'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hyperextensions',
    category: 'strength',
    primaryMuscles: [MuscleGroup.LOWER_BACK, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Hyperextension Bench'],
    difficulty: 'beginner',
    instructions: [
      'Secure feet in footrests',
      'Lower torso with control',
      'Raise back to parallel',
      'Squeeze glutes and lower back'
    ],
    trackingType: 'weight_reps',
  },

  // ========== SHOULDER EXERCISES (15+) ==========
  {
    name: 'Dumbbell Shoulder Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    equipment: ['Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Press dumbbells overhead',
      'Lower to shoulder level',
      'Keep core tight'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Seated Dumbbell Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Sit with back support',
      'Press dumbbells overhead',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Arnold Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Start with palms facing you',
      'Rotate and press overhead',
      'Reverse motion on way down'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Machine Shoulder Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: ['Shoulder Press Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with back against pad',
      'Press handles overhead',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Front Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Raise dumbbells to shoulder height',
      'Lower with control',
      'Keep slight bend in elbows'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Lateral Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SIDE_DELTS],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with cable at side',
      'Raise arm to side until parallel',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dumbbell Lateral Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SIDE_DELTS],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Raise dumbbells to sides',
      'Keep slight bend in elbows',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Rear Delt Flyes (Dumbbell)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.REAR_DELTS],
    secondaryMuscles: [MuscleGroup.TRAPS, MuscleGroup.RHOMBOIDS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Bend forward on bench',
      'Raise dumbbells to sides',
      'Squeeze rear delts',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Rear Delt Flyes (Cable)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.REAR_DELTS],
    secondaryMuscles: [MuscleGroup.TRAPS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Set cables at shoulder height',
      'Pull cables apart',
      'Squeeze rear delts',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Pec Deck',
    category: 'strength',
    primaryMuscles: [MuscleGroup.REAR_DELTS],
    secondaryMuscles: [MuscleGroup.TRAPS],
    equipment: ['Reverse Fly Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit facing machine',
      'Pull handles apart',
      'Squeeze rear delts',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Upright Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SIDE_DELTS, MuscleGroup.TRAPS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Barbell'],
    difficulty: 'intermediate',
    instructions: [
      'Hold bar with close grip',
      'Pull bar to upper chest',
      'Keep elbows high',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dumbbell Upright Row',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SIDE_DELTS, MuscleGroup.TRAPS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Hold dumbbells with close grip',
      'Pull to upper chest',
      'Focus on side delts'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Front Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Stand with cable behind',
      'Raise cable to shoulder height',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Pike Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Start in downward dog position',
      'Lower head toward floor',
      'Push back up',
      'Keep legs straight'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Handstand Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    equipment: ['Wall'],
    difficulty: 'advanced',
    instructions: [
      'Kick up to handstand against wall',
      'Lower head toward floor',
      'Push back up',
      'Maintain balance'
    ],
  trackingType: 'reps_only',
    },

  // ========== LEG EXERCISES (30+) ==========
  {
    name: 'Front Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS],
    equipment: ['Barbell', 'Squat Rack'],
    difficulty: 'advanced',
    instructions: [
      'Position bar on front shoulders',
      'Cross arms to secure bar',
      'Descend until thighs parallel',
      'Drive through heels to stand'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hack Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Hack Squat Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Position shoulders under pads',
      'Lower until thighs parallel',
      'Drive through heels',
      'Keep back against pad'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Bulgarian Split Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Place rear foot on bench',
      'Lower front leg until thigh parallel',
      'Drive through front heel',
      'Alternate legs'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Goblet Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS],
    equipment: ['Dumbbells', 'Kettlebells'],
    difficulty: 'beginner',
    instructions: [
      'Hold weight at chest',
      'Squat down keeping chest up',
      'Drive through heels to stand'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Sumo Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Barbell', 'Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet wider than shoulder-width',
      'Toes pointed out',
      'Squat down keeping knees out',
      'Drive through heels'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Leg Press (45 Degree)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Leg Press Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with back against pad',
      'Place feet on platform',
      'Lower weight by bending knees',
      'Press up until legs extended'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Single-Leg Press',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Leg Press Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Use one leg at a time',
      'Press with single leg',
      'Focus on stability',
      'Alternate legs'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Leg Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [],
    equipment: ['Leg Extension Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with legs under pad',
      'Extend legs until straight',
      'Squeeze quads at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Leg Curl (Lying)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    equipment: ['Leg Curl Machine'],
    difficulty: 'beginner',
    instructions: [
      'Lie face down on machine',
      'Curl heels toward glutes',
      'Squeeze hamstrings',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Leg Curl (Seated)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    equipment: ['Leg Curl Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with legs over pad',
      'Curl heels toward glutes',
      'Squeeze at bottom',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Romanian Deadlift (Dumbbell)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: ['Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Hold dumbbells at sides',
      'Hinge at hips',
      'Lower along legs',
      'Drive hips forward to stand'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Stiff-Leg Deadlift',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: ['Barbell'],
    difficulty: 'advanced',
    instructions: [
      'Keep legs mostly straight',
      'Hinge at hips',
      'Lower bar along legs',
      'Feel hamstring stretch'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Good Mornings',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.LOWER_BACK, MuscleGroup.GLUTES],
    secondaryMuscles: [],
    equipment: ['Barbell'],
    difficulty: 'advanced',
    instructions: [
      'Position bar on upper back',
      'Hinge at hips',
      'Lower torso toward floor',
      'Return to standing'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hip Thrust',
    category: 'strength',
    primaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.QUADS],
    equipment: ['Barbell', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Position upper back on bench',
      'Place bar across hips',
      'Drive hips up',
      'Squeeze glutes at top'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Glute Bridge',
    category: 'strength',
    primaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Lie on back with knees bent',
      'Drive hips up',
      'Squeeze glutes',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Weighted Glute Bridge',
    category: 'strength',
    primaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    equipment: ['Barbell', 'Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Place weight on hips',
      'Drive hips up',
      'Squeeze glutes at top',
      'Control return'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Calf Raises (Standing)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    equipment: ['Calf Raise Machine', 'Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Stand on balls of feet',
      'Raise heels as high as possible',
      'Squeeze calves at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Calf Raises (Seated)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    equipment: ['Seated Calf Raise Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit with knees under pad',
      'Raise heels',
      'Squeeze calves',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Donkey Calf Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CALVES],
    secondaryMuscles: [],
    equipment: ['Calf Raise Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Bend forward on machine',
      'Raise heels',
      'Focus on deep stretch',
      'Squeeze at top'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Leg Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Attach cable to ankle',
      'Extend leg forward',
      'Squeeze quad',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Leg Curl',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Attach cable to ankle',
      'Curl heel toward glutes',
      'Squeeze hamstring',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Lunges',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Step forward into lunge',
      'Lower back knee toward ground',
      'Push through front heel',
      'Return to start'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Lunges',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Step backward into lunge',
      'Lower back knee',
      'Push through front heel',
      'Return to start'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Lateral Lunges',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [],
    equipment: ['Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      'Step to side',
      'Lower into lunge',
      'Push back to center',
      'Alternate sides'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Pistol Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.ABS, MuscleGroup.CALVES],
    equipment: [],
    difficulty: 'advanced',
    instructions: [
      'Extend one leg forward',
      'Squat down on one leg',
      'Keep extended leg off ground',
      'Push up to standing'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Wall Sit',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [],
    equipment: ['Wall'],
    difficulty: 'beginner',
    instructions: [
      'Slide down wall',
      'Hold position with thighs parallel',
      'Keep back against wall',
      'Hold for time'
    ],
  trackingType: 'duration',
    },
  {
    name: 'Step-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'beginner',
    instructions: [
      'Step up onto platform',
      'Drive through heel',
      'Step down with control',
      'Alternate legs'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Glute Ham Raise',
    category: 'strength',
    primaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.LOWER_BACK],
    equipment: ['Glute Ham Raise Machine'],
    difficulty: 'advanced',
    instructions: [
      'Secure feet in machine',
      'Lower torso with control',
      'Pull body up using hamstrings',
      'Squeeze glutes at top'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Sissy Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS],
    secondaryMuscles: [],
    equipment: [],
    difficulty: 'advanced',
    instructions: [
      'Lean back while bending knees',
      'Lower body with control',
      'Feel quad stretch',
      'Return to standing'
    ],
    trackingType: 'weight_reps',
  },

  // ========== ARM EXERCISES (20+) ==========
  {
    name: 'Hammer Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.FOREARMS],
    secondaryMuscles: [],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Hold dumbbells with neutral grip',
      'Curl to shoulders',
      'Squeeze biceps',
      'Lower with control'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Cable Bicep Curl',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Stand with cable at low position',
      'Curl handle to shoulders',
      'Squeeze biceps',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Preacher Curl (Barbell)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Barbell', 'Preacher Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Rest arms on preacher bench',
      'Curl bar up',
      'Squeeze at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Preacher Curl (Dumbbell)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Dumbbells', 'Preacher Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Rest arm on preacher bench',
      'Curl dumbbell up',
      'Focus on bicep contraction',
      'Alternate arms'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Preacher Curl (Machine)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Preacher Curl Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit in machine',
      'Curl handles up',
      'Squeeze biceps',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Concentration Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [],
    equipment: ['Dumbbells', 'Bench'],
    difficulty: 'intermediate',
    instructions: [
      'Sit with arm resting on thigh',
      'Curl dumbbell up',
      'Squeeze at top',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Hammer Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.FOREARMS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Use rope attachment',
      'Curl with neutral grip',
      'Squeeze biceps and forearms'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: '21s (Bicep Curls)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['Barbell', 'Dumbbells'],
    difficulty: 'intermediate',
    instructions: [
      '7 reps bottom half',
      '7 reps top half',
      '7 full reps',
      'No rest between sets'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Tricep Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Attach rope to high cable',
      'Extend arms down',
      'Squeeze triceps',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Overhead Tricep Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Dumbbells', 'Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Hold weight overhead',
      'Lower behind head',
      'Extend arms up',
      'Squeeze triceps'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Overhead Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Attach rope to low cable',
      'Extend overhead',
      'Squeeze triceps',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Tricep Kickbacks',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Bend forward with arm at side',
      'Extend arm back',
      'Squeeze tricep',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Tricep Kickbacks',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Attach cable to low position',
      'Extend arm back',
      'Squeeze tricep',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Close-Grip Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.CHEST],
    secondaryMuscles: [MuscleGroup.FRONT_DELTS],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Place hands close together',
      'Lower body to hands',
      'Push up focusing on triceps'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Overhead Cable Extension',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Face away from cable',
      'Extend arms overhead',
      'Squeeze triceps',
      'Control return'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Tricep Rope Pushdown',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'beginner',
    instructions: [
      'Use rope attachment',
      'Push down and separate',
      'Squeeze triceps',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'EZ Bar Curl',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BICEPS],
    secondaryMuscles: [MuscleGroup.FOREARMS],
    equipment: ['EZ Bar'],
    difficulty: 'beginner',
    instructions: [
      'Curl EZ bar to shoulders',
      'Squeeze biceps',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FOREARMS],
    secondaryMuscles: [MuscleGroup.BICEPS],
    equipment: ['Barbell', 'EZ Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Grip bar with palms down',
      'Curl bar up',
      'Focus on forearms',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Wrist Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FOREARMS],
    secondaryMuscles: [],
    equipment: ['Barbell', 'Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Rest forearms on bench',
      'Curl wrists up',
      'Squeeze forearms',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Wrist Curls',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FOREARMS],
    secondaryMuscles: [],
    equipment: ['Barbell', 'Dumbbells'],
    difficulty: 'beginner',
    instructions: [
      'Rest forearms on bench',
      'Curl wrists up with palms down',
      'Focus on top of forearms'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Tricep Extension (One Arm)',
    category: 'strength',
    primaryMuscles: [MuscleGroup.TRICEPS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Use single handle',
      'Extend one arm down',
      'Squeeze tricep',
      'Alternate arms'
    ],
    trackingType: 'weight_reps',
  },

  // ========== CORE EXERCISES (15+) ==========
  {
    name: 'Cable Crunches',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Kneel with cable overhead',
      'Crunch down',
      'Squeeze abs',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Ab Wheel Rollout',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.OBLIQUES, MuscleGroup.LOWER_BACK],
    equipment: ['Ab Wheel'],
    difficulty: 'advanced',
    instructions: [
      'Kneel holding ab wheel',
      'Roll forward',
      'Keep core tight',
      'Roll back to start'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hanging Leg Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.HIP_FLEXORS],
    equipment: ['Pull-up Bar'],
    difficulty: 'advanced',
    instructions: [
      'Hang from bar',
      'Raise legs to parallel',
      'Lower with control',
      'Keep core engaged'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Hanging Knee Raises',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.HIP_FLEXORS],
    equipment: ['Pull-up Bar'],
    difficulty: 'intermediate',
    instructions: [
      'Hang from bar',
      'Raise knees to chest',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Machine Crunches',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    equipment: ['Ab Crunch Machine'],
    difficulty: 'beginner',
    instructions: [
      'Sit in machine',
      'Crunch forward',
      'Squeeze abs',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Woodchoppers',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondaryMuscles: [],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Set cable at high position',
      'Pull diagonally down',
      'Rotate torso',
      'Alternate sides'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Side Plank',
    category: 'strength',
    primaryMuscles: [MuscleGroup.OBLIQUES, MuscleGroup.ABS],
    secondaryMuscles: [],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Support on one forearm',
      'Keep body in straight line',
      'Hold position',
      'Alternate sides'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Dead Bug',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Lie on back',
      'Extend opposite arm and leg',
      'Return to start',
      'Alternate sides'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Bicycle Crunches',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.OBLIQUES],
    secondaryMuscles: [],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Lie on back',
      'Bring opposite elbow to knee',
      'Alternate sides',
      'Keep core engaged'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Mountain Climbers',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HIP_FLEXORS],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Start in plank position',
      'Alternate bringing knees to chest',
      'Keep core tight',
      'Maintain pace'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'L-Sit',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.HIP_FLEXORS],
    secondaryMuscles: [MuscleGroup.QUADS],
    equipment: ['Parallel Bars'],
    difficulty: 'advanced',
    instructions: [
      'Support body on bars',
      'Raise legs to parallel',
      'Hold position',
      'Keep core tight'
    ],
  trackingType: 'duration',
    },
  {
    name: 'Dragon Flag',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.HIP_FLEXORS],
    equipment: [],
    difficulty: 'advanced',
    instructions: [
      'Hold bench behind head',
      'Raise body to vertical',
      'Lower with control',
      'Keep legs straight'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Cable Side Bends',
    category: 'strength',
    primaryMuscles: [MuscleGroup.OBLIQUES],
    secondaryMuscles: [MuscleGroup.ABS],
    equipment: ['Cable Machine'],
    difficulty: 'intermediate',
    instructions: [
      'Stand with cable at side',
      'Bend to side',
      'Squeeze obliques',
      'Alternate sides'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Reverse Crunches',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.HIP_FLEXORS],
    equipment: [],
    difficulty: 'beginner',
    instructions: [
      'Lie on back',
      'Bring knees to chest',
      'Lift hips off ground',
      'Lower with control'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'V-Ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.HIP_FLEXORS],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Lie on back',
      'Raise torso and legs simultaneously',
      'Touch toes',
      'Lower with control'
    ],
  trackingType: 'reps_only',
    },

  // ========== CARDIO & FUNCTIONAL (20+) ==========
  {
    name: 'Assault Bike',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS, MuscleGroup.CALVES],
    secondaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.ABS],
    equipment: ['Assault Bike'],
    difficulty: 'intermediate',
    instructions: [
      'Pedal with arms and legs',
      'Maintain steady pace',
      'Keep core engaged',
      'Control breathing'
    ],
  trackingType: 'reps_only',
    },
  {
    name: 'Air Bike',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.CALVES, MuscleGroup.GLUTES],
    equipment: ['Air Bike'],
    difficulty: 'beginner',
    instructions: [
      'Pedal continuously',
      'Adjust resistance as needed',
      'Maintain form'
    ],
  trackingType: 'cardio',
    },
  {
    name: 'Battle Ropes',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.BACK, MuscleGroup.BICEPS, MuscleGroup.TRICEPS],
    equipment: ['Battle Ropes'],
    difficulty: 'intermediate',
    instructions: [
      'Hold ropes with both hands',
      'Alternate slamming ropes',
      'Keep core tight',
      'Maintain rhythm'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Sled Push',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.CALVES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS],
    equipment: ['Sled', 'Prowler'],
    difficulty: 'advanced',
    instructions: [
      'Push sled forward',
      'Drive through legs',
      'Keep back straight',
      'Maintain pace'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Kettlebell Swings',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.ABS, MuscleGroup.SHOULDERS],
    equipment: ['Kettlebells'],
    difficulty: 'intermediate',
    instructions: [
      'Hinge at hips',
      'Swing kettlebell to chest height',
      'Drive through hips',
      'Control descent'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Kettlebell Turkish Get-up',
    category: 'strength',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.ABS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    equipment: ['Kettlebells'],
    difficulty: 'advanced',
    instructions: [
      'Start lying with weight overhead',
      'Sit up',
      'Stand up',
      'Reverse to return'
    ],
  trackingType: 'cardio',
    },
  {
    name: 'Kettlebell Goblet Squat',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS],
    equipment: ['Kettlebells'],
    difficulty: 'beginner',
    instructions: [
      'Hold kettlebell at chest',
      'Squat down',
      'Drive through heels',
      'Keep chest up'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Farmer\'s Walk',
    category: 'strength',
    primaryMuscles: [MuscleGroup.FOREARMS, MuscleGroup.TRAPS, MuscleGroup.ABS],
    secondaryMuscles: [MuscleGroup.GLUTES, MuscleGroup.QUADS],
    equipment: ['Dumbbells', 'Kettlebells'],
    trackingType: 'weight_reps',
    difficulty: 'intermediate',
    instructions: [
      'Hold heavy weights at sides',
      'Walk forward',
      'Keep core tight',
      'Maintain posture'
    ],
  },
  {
    name: 'TRX Rows',
    category: 'strength',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS],
    secondaryMuscles: [MuscleGroup.BICEPS, MuscleGroup.TRAPS],
    equipment: ['TRX', 'Suspension Trainer'],
    difficulty: 'intermediate',
    instructions: [
      'Lean back holding handles',
      'Pull body up',
      'Squeeze back',
      'Control return'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'TRX Push-ups',
    category: 'strength',
    primaryMuscles: [MuscleGroup.CHEST, MuscleGroup.FRONT_DELTS],
    secondaryMuscles: [MuscleGroup.TRICEPS, MuscleGroup.ABS],
    equipment: ['TRX', 'Suspension Trainer'],
    difficulty: 'advanced',
    instructions: [
      'Place feet in straps',
      'Perform push-ups',
      'Keep core tight',
      'Maintain balance'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Box Jumps',
    category: 'plyometric',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.CALVES],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS],
    equipment: ['Box', 'Platform'],
    difficulty: 'intermediate',
    instructions: [
      'Jump onto box',
      'Land softly',
      'Step down',
      'Repeat'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Burpees',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.CHEST, MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.ABS, MuscleGroup.GLUTES],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Squat down',
      'Jump back to plank',
      'Perform push-up',
      'Jump forward and up'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Jump Rope',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.CALVES, MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.ABS],
    equipment: ['Jump Rope'],
    difficulty: 'beginner',
    instructions: [
      'Jump over rope',
      'Maintain rhythm',
      'Land on balls of feet',
      'Keep core engaged'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Tire Flips',
    category: 'strength',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.BACK],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS, MuscleGroup.SHOULDERS],
    equipment: ['Tire'],
    difficulty: 'advanced',
    instructions: [
      'Squat to grip tire',
      'Drive through legs',
      'Flip tire over',
      'Repeat'
    ],
  trackingType: 'cardio',
    },
  {
    name: 'Sandbag Carries',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.BACK, MuscleGroup.GLUTES],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.SHOULDERS],
    equipment: ['Sandbag'],
    difficulty: 'intermediate',
    instructions: [
      'Carry sandbag on shoulder',
      'Walk forward',
      'Keep core tight',
      'Alternate shoulders'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Rowing Machine (Erg)',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.BACK, MuscleGroup.LATS, MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.BICEPS, MuscleGroup.ABS],
    equipment: ['Rowing Machine'],
    difficulty: 'beginner',
    instructions: [
      'Drive with legs',
      'Lean back slightly',
      'Pull handle to chest',
      'Return to start'
    ],
    trackingType: 'weight_reps',
  },
  {
    name: 'Assault Bike Sprints',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.CALVES, MuscleGroup.ABS],
    equipment: ['Assault Bike'],
    difficulty: 'advanced',
    instructions: [
      'Sprint for time',
      'Maximize effort',
      'Control breathing',
      'Maintain form'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Sled Drag',
    category: 'cardio',
    primaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES, MuscleGroup.HAMSTRINGS],
    secondaryMuscles: [MuscleGroup.CALVES, MuscleGroup.ABS],
    equipment: ['Sled'],
    difficulty: 'advanced',
    instructions: [
      'Attach rope to sled',
      'Walk backward pulling sled',
      'Drive through legs',
      'Keep core tight'
    ],
    trackingType: 'reps_only',
  },
  {
    name: 'Kettlebell Snatch',
    category: 'olympic',
    primaryMuscles: [MuscleGroup.SHOULDERS, MuscleGroup.GLUTES, MuscleGroup.QUADS],
    secondaryMuscles: [MuscleGroup.HAMSTRINGS, MuscleGroup.ABS],
    equipment: ['Kettlebells'],
    difficulty: 'advanced',
    instructions: [
      'Swing kettlebell up',
      'Catch overhead',
      'Control descent',
      'Alternate arms'
    ],
  trackingType: 'cardio',
    },
  {
    name: 'Bear Crawl',
    category: 'strength',
    primaryMuscles: [MuscleGroup.ABS, MuscleGroup.SHOULDERS],
    secondaryMuscles: [MuscleGroup.QUADS, MuscleGroup.GLUTES],
    equipment: [],
    difficulty: 'intermediate',
    instructions: [
      'Crawl on hands and feet',
      'Keep knees off ground',
      'Move forward',
      'Maintain core engagement'
    ],
    trackingType: 'reps_only',
  },
];

/**
 * Generate a simple hash of CORE_EXERCISES to detect changes
 * This helps identify when exercise definitions have been updated
 */
function generateExerciseLibraryHash(): string {
  // Create a stable string representation of CORE_EXERCISES
  const normalized = CORE_EXERCISES.map(ex => ({
    name: ex.name.toLowerCase().trim(),
    equipment: [...ex.equipment].sort(),
    category: ex.category,
    trackingType: ex.trackingType,
    primaryMuscles: [...ex.primaryMuscles].sort(),
    secondaryMuscles: [...ex.secondaryMuscles].sort(),
    difficulty: ex.difficulty,
    instructions: ex.instructions,
  })).sort((a, b) => a.name.localeCompare(b.name));
  
  // Simple hash: convert to JSON and create a hash-like string
  const json = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `v${Math.abs(hash).toString(36)}`;
}

/**
 * Check if exercise definitions have changed by comparing library hash
 */
async function hasExerciseLibraryChanged(): Promise<boolean> {
  try {
    const { dbHelpers } = await import('./database');
    const currentHash = generateExerciseLibraryHash();
    const storedHash = await dbHelpers.getSetting('exercise_library_hash');
    
    if (!storedHash || storedHash !== currentHash) {
      logger.info(`Exercise library changed: ${storedHash || 'none'} -> ${currentHash}`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking exercise library hash:', error);
    // If we can't check, assume it changed to be safe
    return true;
  }
}

/**
 * Update stored exercise library hash
 */
async function updateExerciseLibraryHash(): Promise<void> {
  try {
    const { dbHelpers } = await import('./database');
    const currentHash = generateExerciseLibraryHash();
    await dbHelpers.setSetting('exercise_library_hash', currentHash);
    logger.info(`Updated exercise library hash: ${currentHash}`);
  } catch (error) {
    logger.error('Error updating exercise library hash:', error);
  }
}

/**
 * Update existing exercises when their definitions in CORE_EXERCISES change
 * Only updates non-custom exercises to preserve user-created exercises
 */
async function updateExistingExercises(): Promise<number> {
  try {
    const { dbHelpers } = await import('./database');
    const existingExercises = await dbHelpers.getAllExercises();
    
    // Create a map of CORE_EXERCISES by normalized name for quick lookup
    const coreExercisesMap = new Map<string, typeof CORE_EXERCISES[0]>();
    for (const coreEx of CORE_EXERCISES) {
      const normalizedName = coreEx.name.toLowerCase().trim();
      coreExercisesMap.set(normalizedName, coreEx);
    }
    
    let updatedCount = 0;
    
    for (const existingEx of existingExercises) {
      // Skip custom exercises - only update pre-populated exercises
      if (existingEx.isCustom) {
        continue;
      }
      
      const normalizedName = existingEx.name.toLowerCase().trim();
      const coreDefinition = coreExercisesMap.get(normalizedName);
      
      // If exercise exists in CORE_EXERCISES, check if it needs updating
      if (coreDefinition) {
        // Compare key fields that might have changed
        const equipmentChanged = JSON.stringify([...existingEx.equipment].sort()) !== 
                                 JSON.stringify([...coreDefinition.equipment].sort());
        const categoryChanged = existingEx.category !== coreDefinition.category;
        const trackingTypeChanged = existingEx.trackingType !== coreDefinition.trackingType;
        const primaryMusclesChanged = JSON.stringify([...existingEx.primaryMuscles].sort()) !== 
                                      JSON.stringify([...coreDefinition.primaryMuscles].sort());
        const secondaryMusclesChanged = JSON.stringify([...existingEx.secondaryMuscles].sort()) !== 
                                        JSON.stringify([...coreDefinition.secondaryMuscles].sort());
        const difficultyChanged = existingEx.difficulty !== coreDefinition.difficulty;
        const instructionsChanged = JSON.stringify(existingEx.instructions) !== 
                                    JSON.stringify(coreDefinition.instructions);
        
        if (equipmentChanged || categoryChanged || trackingTypeChanged || 
            primaryMusclesChanged || secondaryMusclesChanged || difficultyChanged || instructionsChanged) {
          // Update exercise with new definition while preserving user data
          const updatedExercise: Exercise = {
            ...existingEx,
            equipment: [...coreDefinition.equipment],
            category: coreDefinition.category,
            trackingType: coreDefinition.trackingType,
            primaryMuscles: [...coreDefinition.primaryMuscles],
            secondaryMuscles: [...coreDefinition.secondaryMuscles],
            difficulty: coreDefinition.difficulty,
            instructions: [...coreDefinition.instructions],
            version: (existingEx.version || 1) + 1, // Increment version
          };
          
          try {
            await dbHelpers.saveExercise(updatedExercise);
            updatedCount++;
            logger.info(`Updated exercise: ${existingEx.name} (equipment: ${equipmentChanged ? 'yes' : 'no'}, category: ${categoryChanged ? 'yes' : 'no'}, etc.)`);
          } catch (error) {
            logger.error(`Failed to update exercise ${existingEx.name}:`, error);
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      logger.info(`Updated ${updatedCount} existing exercises with new definitions`);
    }
    
    return updatedCount;
  } catch (error) {
    logger.error('Error updating existing exercises:', error);
    return 0;
  }
}

export const exerciseLibrary = {
  async syncMissingExercises(): Promise<void> {
    try {
      const { dbHelpers } = await import('./database');
      
      // Dexie automatically manages database connections, so we can proceed directly
      const existingExercises = await dbHelpers.getAllExercises();
      const existingNames = new Set(
        existingExercises.map(ex => ex.name.toLowerCase().trim())
      );

      // Check for existing IDs (both old numeric and new alphanumeric formats)
      const existingIds = new Set(existingExercises.map(ex => ex.id));
      
      // Add missing exercises from CORE_EXERCISES (including strength)
      let addedCount = 0;
      
      // Batch operations to avoid overwhelming the database
      const exercisesToAdd: Exercise[] = [];
      
      for (const coreExercise of CORE_EXERCISES) {
        const normalizedName = coreExercise.name.toLowerCase().trim();
        if (!existingNames.has(normalizedName)) {
          // Generate new alphanumeric ID, ensuring uniqueness
          let newId = generateAlphanumericId('exr');
          let attempts = 0;
          while (existingIds.has(newId) && attempts < 10) {
            newId = generateAlphanumericId('exr');
            attempts++;
          }
          
          const exercise: Exercise = {
            ...coreExercise,
            id: newId,
            isCustom: false,
          };
          exercisesToAdd.push(exercise);
          existingNames.add(normalizedName);
          existingIds.add(newId);
        }
      }

      // Save exercises in batches to avoid connection issues
      if (exercisesToAdd.length > 0) {
        for (const exercise of exercisesToAdd) {
          try {
            await dbHelpers.saveExercise(exercise);
            addedCount++;
            logger.info(`Added missing exercise: ${exercise.name}`);
          } catch (error) {
            logger.error(`Failed to add exercise ${exercise.name}:`, error);
            // Continue with other exercises even if one fails
          }
        }
        
        if (addedCount > 0) {
          logger.info(`Synced ${addedCount} new exercises to database`);
        }
      }
      
      // Check if exercise library has changed and update existing exercises
      if (await hasExerciseLibraryChanged()) {
        const updatedCount = await updateExistingExercises();
        if (updatedCount > 0 || addedCount > 0) {
          // Update hash after successful sync
          await updateExerciseLibraryHash();
        }
      }
    } catch (error) {
      logger.error('Error syncing missing exercises:', error);
      // Don't throw - allow app to continue even if sync fails
    }
  },

  async initialize(): Promise<void> {
    const { dbHelpers } = await import('./database');
    const existingExercises = await dbHelpers.getAllExercises();

    // Cleanup duplicates before initialization if exercises exist
    if (existingExercises.length > 0) {
      try {
        await this.cleanupDuplicateExercises();
      } catch (error) {
        logger.warn('Failed to cleanup duplicate exercises during initialization:', error);
        // Continue with initialization even if cleanup fails
      }
    }

    // Re-fetch after cleanup to get accurate count
    const exercisesAfterCleanup = await dbHelpers.getAllExercises();

    if (exercisesAfterCleanup.length === 0) {
      // Start with core exercises, but EXCLUDE strength category exercises
      // Strength category exercises will come from StrengthLog data only
      const existingIds = new Set<string>();
      const exercises: Exercise[] = CORE_EXERCISES
        .filter(ex => ex.category !== 'strength') // Exclude strength exercises from core
        .map((ex) => {
          // Generate unique alphanumeric ID
          let newId = generateAlphanumericId('exr');
          let attempts = 0;
          while (existingIds.has(newId) && attempts < 10) {
            newId = generateAlphanumericId('exr');
            attempts++;
          }
          existingIds.add(newId);
          return {
            ...ex,
            id: newId,
            isCustom: false,
          };
        });

      // Load StrengthLog exercises for strength category ONLY
      try {
        const { STRENGTHLOG_EXERCISES } = await import('@/data/strengthlogExercises');
        
        if (STRENGTHLOG_EXERCISES && STRENGTHLOG_EXERCISES.length > 0) {
          // Create a map of existing exercise names for duplicate checking
          const existingNames = new Set(
            exercises.map(ex => ex.name.toLowerCase().trim())
          );

          // Convert StrengthLog exercises to Exercise format
          STRENGTHLOG_EXERCISES.forEach((slExercise) => {
            const normalizedName = slExercise.name.toLowerCase().trim();
            
            // Skip if already exists (avoid duplicates)
            if (existingNames.has(normalizedName)) {
              return;
            }

            // Generate unique alphanumeric ID
            let newId = generateAlphanumericId('exr');
            let attempts = 0;
            while (existingIds.has(newId) && attempts < 10) {
              newId = generateAlphanumericId('exr');
              attempts++;
            }
            existingIds.add(newId);

            // Use muscle groups from StrengthLog data (already mapped)
            const primaryMuscles = slExercise.primaryMuscles.length > 0 
              ? slExercise.primaryMuscles 
              : [MuscleGroup.CHEST]; // fallback
            const secondaryMuscles = slExercise.secondaryMuscles || [];

            const exercise: Exercise = {
              id: newId,
              name: slExercise.name,
              category: 'strength', // Always 'strength' for StrengthLog exercises
              primaryMuscles: primaryMuscles,
              secondaryMuscles: secondaryMuscles,
              equipment: [], // Will be populated if we can extract from StrengthLog
              difficulty: 'intermediate', // Default
              instructions: [],
              isCustom: false,
              trackingType: 'weight_reps', // Default
              strengthlogSlug: slExercise.strengthlogSlug,
              strengthlogUrl: slExercise.strengthlogUrl,
              anatomyImageUrl: slExercise.anatomyImageUrl, // Use static URL if available
              muscleCategory: slExercise.muscleCategory, // Store for filtering
            };

            exercises.push(exercise);
            existingNames.add(normalizedName);
          });

        } else {
          logger.warn('⚠️ No StrengthLog exercises found. Strength category exercises will be missing.');
        }
      } catch (error) {
        // If StrengthLog exercises file doesn't exist or has errors, log warning
        logger.warn('⚠️ Could not load StrengthLog exercises:', error);
        logger.warn('⚠️ Strength category exercises will not be available.');
      }

      // Save all exercises to database
      for (const exercise of exercises) {
        await dbHelpers.saveExercise(exercise);
      }
      
      // Store initial hash after first initialization
      await updateExerciseLibraryHash();
    } else {
      // Database already has exercises, sync any missing ones and check for updates
      // Run sync asynchronously after initialization to avoid blocking
      // This prevents database connection issues during app startup
      setTimeout(() => {
        this.syncMissingExercises().catch((error) => {
          logger.error('Background exercise sync failed:', error);
        });
      }, 1000); // Delay by 1 second to ensure database is fully ready
    }
  },

  async getAllExercises(): Promise<Exercise[]> {
    const { dbHelpers } = await import('./database');
    return await dbHelpers.getAllExercises();
  },

  async searchExercises(query: string): Promise<Exercise[]> {
    const { dbHelpers } = await import('./database');
    return await dbHelpers.searchExercises(query);
  },

  async getExerciseById(id: string): Promise<Exercise | undefined> {
    const { dbHelpers } = await import('./database');
    return await dbHelpers.getExercise(id);
  },

  async createCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>): Promise<string> {
    const { dbHelpers } = await import('./database');
    const { userContextManager } = await import('./userContextManager');
    
    const userId = userContextManager.getUserId();
    // Generate alphanumeric ID for custom exercises
    const id = generateCustomExerciseId(userId || undefined);
    
    const customExercise: Exercise = {
      ...exercise,
      id,
      isCustom: true,
      userId: userId || undefined,
    };
    await dbHelpers.saveExercise(customExercise);
    return id;
  },

  getEquipmentCategory(equipment: string[]): EquipmentCategory[] {
    return getEquipmentCategories(equipment);
  },

  getAllEquipmentCategories(): string[] {
    return Object.values(EquipmentCategory);
  },

  async getExercisesByEquipment(equipmentCategories: string[]): Promise<Exercise[]> {
    const { dbHelpers } = await import('./database');
    return await dbHelpers.filterExercisesByEquipment(equipmentCategories);
  },

  async getAllUniqueEquipment(): Promise<string[]> {
    const { dbHelpers } = await import('./database');
    const exercises = await dbHelpers.getAllExercises();
    const equipmentSet = new Set<string>();
    exercises.forEach(ex => {
      ex.equipment.forEach(eq => equipmentSet.add(eq));
    });
    return Array.from(equipmentSet).sort();
  },

  /**
   * Get exercise details (anatomy image, advanced details) for an exercise
   * Uses cached data if available and valid (1 month), otherwise fetches fresh
   */
  async getExerciseDetails(exerciseId: string): Promise<ExerciseAdvancedDetails | null> {
    const exercise = await this.getExerciseById(exerciseId);
    
    if (!exercise || !exercise.strengthlogSlug) {
      return null;
    }

    try {
      return await exerciseDetailsService.getExerciseDetails(exercise.strengthlogSlug);
    } catch (error) {
      console.error(`Error getting exercise details for ${exerciseId}:`, error);
      return null;
    }
  },

  /**
   * Force refresh exercise details (bypasses cache)
   */
  async refreshExerciseDetails(exerciseId: string): Promise<ExerciseAdvancedDetails | null> {
    const exercise = await this.getExerciseById(exerciseId);
    
    if (!exercise || !exercise.strengthlogSlug) {
      return null;
    }

    try {
      return await exerciseDetailsService.fetchAndCacheExerciseDetails(exercise.strengthlogSlug);
    } catch (error) {
      console.error(`Error refreshing exercise details for ${exerciseId}:`, error);
      return null;
    }
  },

  /**
   * Get anatomy image URL for an exercise
   */
  getAnatomyImageUrl(_exerciseId: string): string | null {
    // This is a synchronous helper - we'll need to get the exercise first
    // For async version, use getExerciseDetails
    return null; // Return null for sync version, use async getExerciseDetails instead
  },

  /**
   * Cleanup duplicate exercises by normalized name
   * Keeps the first occurrence (or most recent if version is available)
   * Can be called during app initialization or as a migration
   */
  async cleanupDuplicateExercises(): Promise<{ removed: number; kept: number }> {
    try {
      const { dbHelpers, db } = await import('./database');
      // Get all exercises directly from database (before deduplication)
      const allExercises = await db.exercises.toArray();
      
      // Group exercises by normalized name
      const exercisesByName = new Map<string, Exercise[]>();
      
      for (const exercise of allExercises) {
        const normalizedName = exercise.name.toLowerCase().trim();
        if (!exercisesByName.has(normalizedName)) {
          exercisesByName.set(normalizedName, []);
        }
        exercisesByName.get(normalizedName)!.push(exercise);
      }
      
      let removedCount = 0;
      let keptCount = 0;
      
      // For each group, keep one and remove duplicates
      for (const [, duplicates] of exercisesByName.entries()) {
        if (duplicates.length > 1) {
          // Sort by updatedAt if available (most recent first), otherwise keep first
          duplicates.sort((a, b) => {
            const aTime = a.version || 0;
            const bTime = b.version || 0;
            return bTime - aTime; // Most recent first
          });
          
          const toKeep = duplicates[0];
          const toRemove = duplicates.slice(1);
          
          // Remove duplicates
          for (const duplicate of toRemove) {
            try {
              await dbHelpers.deleteExercise(duplicate.id);
              removedCount++;
              logger.info(`Removed duplicate exercise: ${duplicate.name} (ID: ${duplicate.id})`);
            } catch (error) {
              logger.error(`Failed to remove duplicate exercise ${duplicate.name} (ID: ${duplicate.id}):`, error);
            }
          }
          
          keptCount++;
          logger.info(`Kept exercise: ${toKeep.name} (ID: ${toKeep.id})`);
        } else {
          keptCount++;
        }
      }
      
      if (removedCount > 0) {
        logger.info(`Cleanup complete: Removed ${removedCount} duplicate exercises, kept ${keptCount} unique exercises`);
      }
      
      return { removed: removedCount, kept: keptCount };
    } catch (error) {
      logger.error('Error cleaning up duplicate exercises:', error);
      throw error;
    }
  },

  /**
   * Force update all existing exercises from CORE_EXERCISES
   * Useful for manual updates or after library changes
   */
  async updateAllExercises(): Promise<{ updated: number; added: number }> {
    try {
      // First sync missing exercises
      await this.syncMissingExercises();
      
      // Then update existing exercises
      const updatedCount = await updateExistingExercises();
      
      // Update hash after successful update
      await updateExerciseLibraryHash();
      
      return { updated: updatedCount, added: 0 }; // added count is logged in syncMissingExercises
    } catch (error) {
      logger.error('Error updating all exercises:', error);
      throw error;
    }
  },

  /**
   * Check if exercise library needs updating
   */
  async needsUpdate(): Promise<boolean> {
    return await hasExerciseLibraryChanged();
  },
};

