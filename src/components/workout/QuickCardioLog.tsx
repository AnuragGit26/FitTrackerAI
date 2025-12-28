import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { dataService } from '@/services/dataService';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/useToast';
import { WorkoutExercise, WorkoutSet, DistanceUnit } from '@/types/exercise';
import { Workout } from '@/types/workout';
import { calculateVolume, estimateCaloriesFromSteps } from '@/utils/calculations';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { MuscleGroup } from '@/types/muscle';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface QuickCardioLogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const CARDIO_ACTIVITIES = [
  { name: 'Running', exerciseId: 'running' },
  { name: 'Cycling', exerciseId: 'cycling' },
  { name: 'Walking', exerciseId: 'walking' },
  { name: 'Rowing Machine', exerciseId: 'rowing-machine' },
  { name: 'Elliptical', exerciseId: 'elliptical' },
  { name: 'Swimming', exerciseId: 'swimming' },
  { name: 'Custom', exerciseId: null },
];

export function QuickCardioLog({ isOpen, onClose, onSaved }: QuickCardioLogProps) {
  const { profile } = useUserStore();
  const { finishWorkout, startWorkout, addExercise } = useWorkoutStore();
  const { success, error: showError } = useToast();
  const shouldReduceMotion = prefersReducedMotion();

  const [activityType, setActivityType] = useState<string>('Running');
  const [customActivityName, setCustomActivityName] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('km');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [steps, setSteps] = useState('');
  const [calories, setCalories] = useState('');
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActivityType('Running');
      setCustomActivityName('');
      setDistance('');
      setDistanceUnit('km');
      setTimeMinutes('');
      setTimeSeconds('');
      setSteps('');
      setCalories('');
      setWorkoutDate(new Date());
    }
  }, [isOpen]);

  // Auto-estimate calories from steps if calories not provided
  useEffect(() => {
    if (steps && !calories) {
      const estimatedCalories = estimateCaloriesFromSteps(parseInt(steps) || 0);
      if (estimatedCalories > 0) {
        // Don't auto-fill, just show hint or let user see it
      }
    }
  }, [steps, calories]);

  const handleSave = async () => {
    if (!profile) {
      showError('Please log in to save workouts');
      return;
    }

    // Validation
    if (!distance || parseFloat(distance) <= 0) {
      showError('Please enter a valid distance');
      return;
    }

    const minutes = parseInt(timeMinutes) || 0;
    const seconds = parseInt(timeSeconds) || 0;
    const totalTimeSeconds = minutes * 60 + seconds;

    if (totalTimeSeconds <= 0) {
      showError('Please enter a valid time');
      return;
    }

    if (activityType === 'Custom' && !customActivityName.trim()) {
      showError('Please enter a custom activity name');
      return;
    }

    setIsSaving(true);

    try {
      // Get or create exercise
      let exerciseId = 'running';
      let exerciseName = 'Running';

      if (activityType === 'Custom') {
        exerciseName = customActivityName.trim();
        exerciseId = `custom-${Date.now()}`;
      } else {
        const activity = CARDIO_ACTIVITIES.find(a => a.name === activityType);
        if (activity?.exerciseId) {
          const exercise = await exerciseLibrary.getExerciseById(activity.exerciseId);
          if (exercise) {
            exerciseId = exercise.id;
            exerciseName = exercise.name;
          } else {
            exerciseName = activityType;
          }
        } else {
          exerciseName = activityType;
        }
      }

      // Create workout set
      const workoutSet: WorkoutSet = {
        setNumber: 1,
        distance: parseFloat(distance),
        distanceUnit,
        time: totalTimeSeconds,
        completed: true,
      };

      // Add optional fields
      if (steps) {
        const stepsNum = parseInt(steps);
        if (stepsNum > 0) {
          workoutSet.steps = stepsNum;
        }
      }

      if (calories) {
        const caloriesNum = parseInt(calories);
        if (caloriesNum > 0) {
          workoutSet.calories = caloriesNum;
        } else if (steps) {
          // Auto-estimate from steps if calories not provided
          workoutSet.calories = estimateCaloriesFromSteps(parseInt(steps) || 0);
        }
      } else if (steps) {
        // Auto-estimate from steps if calories not provided
        workoutSet.calories = estimateCaloriesFromSteps(parseInt(steps) || 0);
      }

      // Calculate volume
      const totalVolume = calculateVolume([workoutSet], 'cardio');

      // Create workout exercise
      const workoutExercise: WorkoutExercise = {
        id: `cardio-${Date.now()}`,
        exerciseId,
        exerciseName,
        sets: [workoutSet],
        totalVolume,
        musclesWorked: [MuscleGroup.QUADS, MuscleGroup.CALVES], // Default cardio muscles
        timestamp: workoutDate,
      };

      // Start workout first
      await startWorkout(profile.id);
      
      // Add the cardio exercise first
      addExercise(workoutExercise);

      // Get the current workout AFTER adding the exercise to ensure it includes the exercise
      const currentWorkout = useWorkoutStore.getState().currentWorkout;
      if (!currentWorkout) {
        throw new Error('Failed to start workout');
      }

      // Verify exercise was added
      if (!currentWorkout.exercises || currentWorkout.exercises.length === 0) {
        throw new Error('Failed to add exercise to workout');
      }

      // Update workout with cardio-specific data (preserving the exercises array)
      const updatedWorkout = {
        ...currentWorkout,
        date: workoutDate,
        startTime: workoutDate,
        endTime: new Date(workoutDate.getTime() + totalTimeSeconds * 1000),
        totalVolume,
        musclesTargeted: workoutExercise.musclesWorked,
        workoutType: 'cardio',
      };
      
      useWorkoutStore.setState({ currentWorkout: updatedWorkout });

      // Finish the workout
      await finishWorkout(workoutSet.calories, totalTimeSeconds);

      success('Cardio workout saved successfully!');
      onSaved?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save cardio workout';
      showError(errorMessage);
      console.error('Error saving cardio workout:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const estimatedCalories = steps ? estimateCaloriesFromSteps(parseInt(steps) || 0) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-xl bg-white dark:bg-[#1c2e24] shadow-2xl border border-gray-200 dark:border-[#316847]/50"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#316847]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Cardio Log</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Activity Type *
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                >
                  {CARDIO_ACTIVITIES.map((activity) => (
                    <option key={activity.name} value={activity.name}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Activity Name */}
              {activityType === 'Custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Activity Name *
                  </label>
                  <input
                    type="text"
                    value={customActivityName}
                    onChange={(e) => setCustomActivityName(e.target.value)}
                    placeholder="e.g., Trail Running"
                    className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                  />
                </div>
              )}

              {/* Distance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Distance *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                  />
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value as DistanceUnit)}
                    className="rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                  >
                    <option value="km">km</option>
                    <option value="miles">miles</option>
                  </select>
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                    placeholder="MM"
                    min="0"
                    max="59"
                    className="w-20 rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3 text-center"
                  />
                  <span className="text-gray-500">:</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={timeSeconds}
                    onChange={(e) => setTimeSeconds(e.target.value)}
                    placeholder="SS"
                    min="0"
                    max="59"
                    className="w-20 rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3 text-center"
                  />
                  <span className="text-sm text-gray-500">(MM:SS)</span>
                </div>
              </div>

              {/* Steps (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steps <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="100000"
                  className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                />
                {steps && estimatedCalories > 0 && !calories && (
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated calories: ~{estimatedCalories} (from steps)
                  </p>
                )}
              </div>

              {/* Calories (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Calories <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder={steps && estimatedCalories > 0 ? `~${estimatedCalories} (estimated)` : '0'}
                  min="0"
                  max="10000"
                  className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={workoutDate.toISOString().slice(0, 16)}
                  onChange={(e) => setWorkoutDate(new Date(e.target.value))}
                  className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary h-10 px-3"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-[#316847]">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 h-12 rounded-lg border border-gray-300 dark:border-[#316847] bg-white dark:bg-transparent text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#224932] transition-colors font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !distance || (!timeMinutes && !timeSeconds)}
                className={cn(
                  'flex-1 h-12 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Workout
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

