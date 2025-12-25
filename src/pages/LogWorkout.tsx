import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, Check, Edit, ChevronDown, Trash2, Loader2, BookOpen, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { ExerciseFilters } from '@/components/exercise/ExerciseFilters';
import { ExerciseInfoCard } from '@/components/exercise/ExerciseInfoCard';
import { SetRow } from '@/components/exercise/SetRow';
import { RestTimerToggle } from '@/components/exercise/RestTimerToggle';
import { RestTimer } from '@/components/exercise/RestTimer';
import { WorkoutTimerCard } from '@/components/exercise/WorkoutTimerCard';
import { ToastContainer } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { Exercise, WorkoutExercise, WorkoutSet, ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { getMuscleMapping } from '@/services/muscleMapping';
import { calculateVolume } from '@/utils/calculations';
import { useNavigate, useLocation } from 'react-router-dom';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { validateExerciseSets, validateNotes } from '@/utils/validators';
import { sanitizeNotes, sanitizeString } from '@/utils/sanitize';
import { staggerContainer, slideUp, slideLeft, checkmarkAnimation, prefersReducedMotion } from '@/utils/animations';
import { templateService } from '@/services/templateService';
import { TemplateCategory } from '@/types/workout';
import { Workout } from '@/types/workout';
import { useWorkoutDuration } from '@/hooks/useWorkoutDuration';
import { useSetDuration } from '@/hooks/useSetDuration';
import { useSettingsStore } from '@/store/settingsStore';
import { saveLogWorkoutState, loadLogWorkoutState, clearWorkoutState, loadWorkoutState } from '@/utils/workoutStatePersistence';

// Helper function to format date for datetime-local input (local time, not UTC)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function LogWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWorkout, startWorkout, addExercise, updateExercise, removeExercise, finishWorkout, cancelWorkout, templateId } =
    useWorkoutStore();
  const { profile } = useUserStore();
  const { toasts, removeToast, success, error: showError } = useToast();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [restTimerEnabled, setRestTimerEnabled] = useState(false);
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showClearWorkoutModal, setShowClearWorkoutModal] = useState(false);
  const [showCancelWorkoutModal, setShowCancelWorkoutModal] = useState(false);
  const [showFinishWorkoutModal, setShowFinishWorkoutModal] = useState(false);
  const [workoutCalories, setWorkoutCalories] = useState<number | ''>('');
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('strength');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroupCategory[]>([]);
  const repeatWorkoutProcessedRef = useRef<string | null>(null);
  const shouldReduceMotion = prefersReducedMotion();
  const isRestoringStateRef = useRef(true);

  // Rest timer state
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerRemaining, setRestTimerRemaining] = useState(60); // Default 60 seconds
  const [restTimerStartTime, setRestTimerStartTime] = useState<Date | null>(null);
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [restTimerOriginalDuration, setRestTimerOriginalDuration] = useState<number | null>(null);
  const { settings } = useSettingsStore();
  const defaultRestDuration = 60; // Default 60 seconds (1 minute)

  // Workout duration tracking - starts when first exercise is selected
  const [workoutTimerStartTime, setWorkoutTimerStartTime] = useState<Date | null>(null);
  const { formattedTime: workoutDuration, isRunning: workoutTimerRunning, pause: pauseWorkoutTimer, resume: resumeWorkoutTimer, reset: resetWorkoutTimer } = useWorkoutDuration(workoutTimerStartTime);

  // Set duration tracking
  const { startSet, completeSet, reset: resetSetDuration } = useSetDuration();
  const currentSetStartTimeRef = useRef<Date | null>(null);
  // Track workout timer state before rest timer pause to restore it later
  const workoutTimerWasRunningBeforeRestPauseRef = useRef<boolean | null>(null);

  // Restore persisted state on mount
  useEffect(() => {
    const persistedState = loadLogWorkoutState();
    if (persistedState) {
      // Restore component state
      setRestTimerEnabled(persistedState.restTimerEnabled);
      setWorkoutDate(new Date(persistedState.workoutDate));
      setNotes(persistedState.notes);
      setEditingExerciseId(persistedState.editingExerciseId);
      setSelectedCategory(persistedState.selectedCategory);
      setSelectedMuscleGroups(persistedState.selectedMuscleGroups);
      setShowAdditionalDetails(persistedState.showAdditionalDetails);
      setRestTimerVisible(persistedState.restTimerVisible);
      setRestTimerPaused(persistedState.restTimerPaused);

      // Restore rest timer with elapsed time calculation
      if (persistedState.restTimerStartTime && persistedState.restTimerVisible) {
        const restStartTime = new Date(persistedState.restTimerStartTime);
        const now = new Date();
        
        // Calculate remaining time accounting for elapsed time (only if not paused)
        let remainingTime = persistedState.restTimerRemaining;
        if (!persistedState.restTimerPaused) {
          // Calculate total elapsed time since the timer started
          const totalElapsedSeconds = Math.floor((now.getTime() - restStartTime.getTime()) / 1000);
          
          // Use original duration if available to correctly calculate remaining time
          const originalDuration = persistedState.restTimerOriginalDuration;
          if (originalDuration !== null && originalDuration !== undefined) {
            // Calculate remaining time from original duration minus total elapsed time
            remainingTime = Math.max(0, originalDuration - totalElapsedSeconds);
          } else {
            // Fallback for old saved states without originalDuration:
            // Use saved remaining time as-is (slightly inaccurate but better than the bug)
            // The timer will continue counting down from the saved value
            remainingTime = persistedState.restTimerRemaining;
          }
        } else {
          // Timer was paused - use the persisted remaining time directly
          // This is now correct because handleRestRemainingTimeChange syncs the state when paused
          remainingTime = persistedState.restTimerRemaining;
        }
        
        setRestTimerStartTime(restStartTime);
        setRestTimerRemaining(remainingTime);
        setRestTimerOriginalDuration(persistedState.restTimerOriginalDuration || null);
      } else {
        setRestTimerRemaining(persistedState.restTimerRemaining);
        setRestTimerStartTime(persistedState.restTimerStartTime ? new Date(persistedState.restTimerStartTime) : null);
        setRestTimerOriginalDuration(persistedState.restTimerOriginalDuration || null);
      }

      // Restore workout timer start time (will be handled by useWorkoutDuration hook)
      if (persistedState.workoutTimerStartTime) {
        setWorkoutTimerStartTime(new Date(persistedState.workoutTimerStartTime));
      }

      // Restore selected exercise and sets if editing
      if (persistedState.selectedExerciseId) {
        exerciseLibrary.getExerciseById(persistedState.selectedExerciseId).then((exercise) => {
          if (exercise) {
            setSelectedExercise(exercise);
            if (persistedState.editingExerciseId) {
              // If editing, restore sets
              setSets(persistedState.sets);
            }
          }
          // Mark restoration as complete
          isRestoringStateRef.current = false;
        }).catch(() => {
          // Exercise not found, ignore
          isRestoringStateRef.current = false;
        });
      } else {
        isRestoringStateRef.current = false;
      }
    } else {
      isRestoringStateRef.current = false;
    }
  }, []); // Only run on mount

  useEffect(() => {
    if (!currentWorkout && profile) {
      // Check if we have persisted workout state
      const persistedWorkoutState = loadWorkoutState();
      if (!persistedWorkoutState?.currentWorkout) {
        // Only start new workout if no persisted state exists
        const persistedLogState = loadLogWorkoutState();
        if (!persistedLogState) {
          startWorkout(profile.id);
        }
      }
      // If persisted state exists, it will be loaded by the store initialization
    }
  }, [currentWorkout, profile, startWorkout]);

  // Handle repeat workout from navigation state
  useEffect(() => {
    const locationState = location.state as { repeatWorkout?: Workout; recommendedWorkoutExercises?: WorkoutExercise[] };
    const repeatWorkout = locationState?.repeatWorkout;
    const recommendedWorkoutExercises = locationState?.recommendedWorkoutExercises;

    // Handle recommended workout exercises
    if (recommendedWorkoutExercises && currentWorkout && profile && currentWorkout.exercises.length === 0) {
      const recommendedWorkoutId = `recommended-${Date.now()}`;

      if (repeatWorkoutProcessedRef.current !== recommendedWorkoutId) {
        repeatWorkoutProcessedRef.current = recommendedWorkoutId;

        const processRecommendedWorkout = async () => {
          try {
            // Add all recommended exercises to current workout
            for (const exercise of recommendedWorkoutExercises) {
              addExercise(exercise);
            }

            // Show success message
            success('Recommended workout loaded. Ready to log!');

            // Clear the recommendedWorkoutExercises from location state to prevent re-processing
            window.history.replaceState({}, document.title);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load recommended workout';
            showError(errorMessage);
            console.error('Error loading recommended workout:', err);
            repeatWorkoutProcessedRef.current = null;
          }
        };

        // Process after a short delay to ensure workout is ready
        const timeoutId = setTimeout(processRecommendedWorkout, 100);

        return () => {
          clearTimeout(timeoutId);
        };
      }
    }

    // Handle repeat workout
    if (repeatWorkout && currentWorkout && profile && currentWorkout.exercises.length === 0) {
      // Only process if current workout is empty and we have a repeat workout
      const isRepeatWorkout = repeatWorkout.exercises.length > 0;

      // Create a unique identifier for this repeat workout to prevent duplicate processing
      const startTime = repeatWorkout.startTime instanceof Date
        ? repeatWorkout.startTime.getTime()
        : new Date(repeatWorkout.startTime).getTime();
      const repeatWorkoutId = repeatWorkout.id
        ? `repeat-${repeatWorkout.id}-${startTime}`
        : `repeat-${startTime}`;

      if (isRepeatWorkout && repeatWorkoutProcessedRef.current !== repeatWorkoutId) {
        repeatWorkoutProcessedRef.current = repeatWorkoutId;

        const processRepeatWorkout = async () => {
          try {
            // Populate exercises from previous workout
            for (const prevExercise of repeatWorkout.exercises) {
              // Get exercise data from library
              const exerciseData = await exerciseLibrary.getExerciseById(prevExercise.exerciseId);

              if (exerciseData) {
                // Create new sets with initial state (uncompleted, default values)
                // Use the same number of sets as previous workout, but reset values
                const newSets: WorkoutSet[] = prevExercise.sets.map((prevSet, index) => {
                  const baseSet: WorkoutSet = {
                    setNumber: index + 1,
                    completed: false,
                  };

                  // Copy relevant fields based on tracking type, but reset to defaults
                  switch (exerciseData.trackingType) {
                    case 'weight_reps':
                      return {
                        ...baseSet,
                        reps: 10, // Default reps
                        weight: 0, // Reset weight
                        unit: prevSet.unit || profile?.preferredUnit || 'kg',
                      };
                    case 'reps_only':
                      return {
                        ...baseSet,
                        reps: 10, // Default reps
                      };
                    case 'cardio':
                      return {
                        ...baseSet,
                        distance: 0,
                        distanceUnit: prevSet.distanceUnit || 'km',
                        time: 0,
                        calories: undefined,
                      };
                    case 'duration':
                      return {
                        ...baseSet,
                        duration: 0,
                      };
                    default:
                      return {
                        ...baseSet,
                        reps: 10,
                        weight: 0,
                        unit: profile?.preferredUnit || 'kg',
                      };
                  }
                });

                // Calculate initial volume (will be 0 since sets are not completed)
                const initialVolume = calculateVolume(newSets, exerciseData.trackingType);

                // Create new workout exercise
                const newWorkoutExercise: WorkoutExercise = {
                  id: `${Date.now()}-${Math.random()}-${prevExercise.exerciseId}`,
                  exerciseId: prevExercise.exerciseId,
                  exerciseName: prevExercise.exerciseName,
                  sets: newSets,
                  totalVolume: initialVolume,
                  musclesWorked: prevExercise.musclesWorked,
                  timestamp: new Date(),
                  notes: prevExercise.notes,
                };

                // Add exercise to current workout
                addExercise(newWorkoutExercise);
              }
            }

            // Show success message
            success('Previous workout loaded. Ready to log!');

            // Clear the repeatWorkout from location state to prevent re-processing
            window.history.replaceState({}, document.title);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load previous workout';
            showError(errorMessage);
            console.error('Error repeating workout:', err);
            // Reset the ref on error so user can try again
            repeatWorkoutProcessedRef.current = null;
          }
        };

        // Process after a short delay to ensure workout is ready
        const timeoutId = setTimeout(processRepeatWorkout, 100);

        return () => {
          clearTimeout(timeoutId);
        };
      }
    }
  }, [location.state, currentWorkout, profile, addExercise, success, showError]);

  useEffect(() => {
    // Load template name if workout started from template
    if (templateId && !currentTemplateName) {
      templateService.getTemplate(templateId).then((template) => {
        if (template) {
          setCurrentTemplateName(template.name);
        }
      });
    }
  }, [templateId, currentTemplateName]);

  useEffect(() => {
  }, [currentWorkout]);

  // Helper function to save all state
  const saveAllState = useCallback(() => {
    // Don't save during initial state restoration
    if (isRestoringStateRef.current) {
      return;
    }

    // Read set duration state from localStorage (managed by useSetDuration hook)
    let setDurationStartTime: string | null = null;
    let setDurationElapsed = 0;
    try {
      const setStartTimeStr = localStorage.getItem('fittrackai_set_duration_startTime');
      const isTracking = localStorage.getItem('fittrackai_set_duration_isTracking') === 'true';
      if (setStartTimeStr && isTracking) {
        setDurationStartTime = setStartTimeStr;
        const startTime = new Date(setStartTimeStr);
        const now = new Date();
        setDurationElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      }
    } catch (error) {
      console.error('Failed to read set duration state:', error);
    }

    if (selectedExercise || sets.length > 0 || notes || editingExerciseId || selectedCategory || selectedMuscleGroups.length > 0 || restTimerEnabled || workoutTimerStartTime || showAdditionalDetails) {
      saveLogWorkoutState({
        selectedExerciseId: selectedExercise?.id || null,
        sets,
        restTimerEnabled,
        workoutDate: workoutDate.toISOString(),
        notes,
        editingExerciseId,
        selectedCategory,
        selectedMuscleGroups,
        restTimerVisible,
        restTimerRemaining,
        restTimerStartTime: restTimerStartTime?.toISOString() || null,
        restTimerPaused,
        restTimerOriginalDuration,
        workoutTimerStartTime: workoutTimerStartTime?.toISOString() || null,
        showAdditionalDetails,
        setDurationStartTime,
        setDurationElapsed,
      });
    }
  }, [selectedExercise, sets, restTimerEnabled, workoutDate, notes, editingExerciseId, selectedCategory, selectedMuscleGroups, restTimerVisible, restTimerRemaining, restTimerStartTime, restTimerPaused, restTimerOriginalDuration, workoutTimerStartTime, showAdditionalDetails]);

  // Auto-save component state whenever relevant state changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveAllState();
    }, 500); // Debounce by 500ms

    return () => clearTimeout(timeoutId);
  }, [saveAllState]);

  // Save state on navigation/background events
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveAllState();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App going to background - save state
        saveAllState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveAllState]);

  useEffect(() => {
    if (selectedExercise && !editingExerciseId) {
      const trackingType = selectedExercise.trackingType;
      let initialSet: WorkoutSet;

      switch (trackingType) {
        case 'weight_reps':
          initialSet = {
            setNumber: 1,
            reps: 10,
            weight: 0,
            unit: profile?.preferredUnit || 'kg',
            completed: false,
          };
          break;
        case 'reps_only':
          initialSet = {
            setNumber: 1,
            reps: 10,
            completed: false,
          };
          break;
        case 'cardio':
          initialSet = {
            setNumber: 1,
            distance: 0,
            distanceUnit: 'km',
            time: 0,
            calories: undefined,
            completed: false,
          };
          break;
        case 'duration':
          initialSet = {
            setNumber: 1,
            duration: 0,
            completed: false,
          };
          break;
        default:
          initialSet = {
            setNumber: 1,
            reps: 10,
            weight: 0,
            unit: profile?.preferredUnit || 'kg',
            completed: false,
          };
      }
      setSets([initialSet]);
      setNotes('');
      setWorkoutDate(new Date());
      setValidationErrors({});

      // Start tracking first set
      resetSetDuration();
      currentSetStartTimeRef.current = new Date();
      startSet();
    } else if (!selectedExercise) {
      setSets([]);
      setNotes('');
      setValidationErrors({});
      resetSetDuration();
      currentSetStartTimeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise, editingExerciseId, profile?.preferredUnit]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setEditingExerciseId(null);
    setValidationErrors({});

    // Start workout timer when first exercise is selected
    if (!workoutTimerStartTime) {
      setWorkoutTimerStartTime(new Date());
    }

    // Save state
    saveLogWorkoutState({
      selectedExerciseId: exercise.id,
      sets,
      restTimerEnabled,
      workoutDate: workoutDate.toISOString(),
      notes,
      editingExerciseId: null,
      selectedCategory,
      selectedMuscleGroups,
      restTimerVisible,
      restTimerRemaining,
      restTimerStartTime: restTimerStartTime?.toISOString() || null,
      restTimerPaused,
      restTimerOriginalDuration,
      workoutTimerStartTime: workoutTimerStartTime?.toISOString() || null,
      showAdditionalDetails,
      setDurationStartTime: null,
      setDurationElapsed: 0,
    });
  };

  const handleCategoryChange = (category: ExerciseCategory | null) => {
    setSelectedCategory(category);
    // When category changes, reset muscle group filters if they don't apply to the new category
    setSelectedMuscleGroups([]);
  };

  const handleMuscleGroupsChange = (groups: MuscleGroupCategory[]) => {
    setSelectedMuscleGroups(groups);
  };

  // Rest timer handlers
  const handleRestComplete = () => {
    const actualRestTime = restTimerStartTime
      ? Math.floor((new Date().getTime() - restTimerStartTime.getTime()) / 1000)
      : defaultRestDuration;

    // Store rest time in the last completed set
    if (sets.length > 0) {
      const lastCompletedSet = [...sets].reverse().find(s => s.completed);
      if (lastCompletedSet) {
        handleUpdateSet(lastCompletedSet.setNumber, { restTime: actualRestTime });
      }
    }

    setRestTimerVisible(false);
    setRestTimerRemaining(defaultRestDuration);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);

    // Restore workout timer if it was running before rest timer
    if (workoutTimerWasRunningBeforeRestPauseRef.current === true && workoutTimerStartTime && !workoutTimerRunning) {
      resumeWorkoutTimer();
    }
    workoutTimerWasRunningBeforeRestPauseRef.current = null;

    // Start tracking next set
    currentSetStartTimeRef.current = new Date();
    startSet();
  };

  const handleRestSkip = () => {
    const actualRestTime = restTimerStartTime
      ? Math.floor((new Date().getTime() - restTimerStartTime.getTime()) / 1000)
      : 0;

    // Store rest time in the last completed set
    if (sets.length > 0) {
      const lastCompletedSet = [...sets].reverse().find(s => s.completed);
      if (lastCompletedSet) {
        handleUpdateSet(lastCompletedSet.setNumber, { restTime: actualRestTime });
      }
    }

    setRestTimerVisible(false);
    setRestTimerRemaining(defaultRestDuration);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);

    // Restore workout timer if it was running before rest timer
    if (workoutTimerWasRunningBeforeRestPauseRef.current === true && workoutTimerStartTime && !workoutTimerRunning) {
      resumeWorkoutTimer();
    }
    workoutTimerWasRunningBeforeRestPauseRef.current = null;

    // Start tracking next set
    currentSetStartTimeRef.current = new Date();
    startSet();
  };

  const handleRestTimeAdjust = (seconds: number) => {
    setRestTimerRemaining((prev) => Math.max(0, prev + seconds));
  };

  const handleRestRemainingTimeChange = (remainingTime: number) => {
    // Sync the parent state with the RestTimer's current remaining time
    // This is especially important when the timer is paused
    setRestTimerRemaining(remainingTime);
  };

  const handleRestPause = (paused: boolean) => {
    setRestTimerPaused(paused);
    
    // Sync workout timer with rest timer pause/resume
    if (paused) {
      // Rest timer is being paused - pause workout timer if it's running
      if (workoutTimerRunning && workoutTimerStartTime) {
        workoutTimerWasRunningBeforeRestPauseRef.current = true;
        pauseWorkoutTimer();
      } else {
        workoutTimerWasRunningBeforeRestPauseRef.current = false;
      }
    } else {
      // Rest timer is being resumed - resume workout timer if it was running before
      if (workoutTimerWasRunningBeforeRestPauseRef.current === true && workoutTimerStartTime) {
        resumeWorkoutTimer();
      }
      workoutTimerWasRunningBeforeRestPauseRef.current = null;
    }
  };

  const handleEditExercise = async (exercise: WorkoutExercise) => {
    try {
      const exerciseData = await exerciseLibrary.getExerciseById(exercise.exerciseId);
      if (exerciseData) {
        setSelectedExercise(exerciseData);
        setSets(exercise.sets.map((set, index) => ({
          ...set,
          setNumber: index + 1,
        })));
        setNotes(exercise.notes || '');
        setWorkoutDate(exercise.timestamp);
        setEditingExerciseId(exercise.id);
        setShowAdditionalDetails(false);
        setValidationErrors({});
      } else {
        showError('Exercise not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load exercise';
      showError(errorMessage);
      console.error('Error loading exercise:', err);
    }
  };

  const handleCancelEdit = () => {
    setSelectedExercise(null);
    setSets([]);
    setNotes('');
    setWorkoutDate(new Date());
    setEditingExerciseId(null);
    setValidationErrors({});

    // Save state after cancel
    saveLogWorkoutState({
      selectedExerciseId: null,
      sets: [],
      restTimerEnabled,
      workoutDate: new Date().toISOString(),
      notes: '',
      editingExerciseId: null,
      selectedCategory,
      selectedMuscleGroups,
      restTimerVisible,
      restTimerRemaining,
      restTimerStartTime: restTimerStartTime?.toISOString() || null,
      restTimerPaused,
      restTimerOriginalDuration: null,
      workoutTimerStartTime: workoutTimerStartTime?.toISOString() || null,
      showAdditionalDetails,
      setDurationStartTime: null,
      setDurationElapsed: 0,
    });
  };

  const handleAddSet = () => {
    if (!selectedExercise) return;

    const trackingType = selectedExercise.trackingType;
    const newSetNumber = sets.length + 1;
    const lastSet = sets[sets.length - 1];
    let newSet: WorkoutSet;

    switch (trackingType) {
      case 'weight_reps':
        newSet = {
          setNumber: newSetNumber,
          reps: lastSet?.reps ?? 10,
          weight: lastSet?.weight ?? 0,
          unit: lastSet?.unit || profile?.preferredUnit || 'kg',
          completed: false,
        };
        break;
      case 'reps_only':
        newSet = {
          setNumber: newSetNumber,
          reps: lastSet?.reps ?? 10,
          completed: false,
        };
        break;
      case 'cardio':
        newSet = {
          setNumber: newSetNumber,
          distance: lastSet?.distance ?? 0,
          distanceUnit: lastSet?.distanceUnit || 'km',
          time: lastSet?.time ?? 0,
          calories: lastSet?.calories,
          completed: false,
        };
        break;
      case 'duration':
        newSet = {
          setNumber: newSetNumber,
          duration: lastSet?.duration ?? 0,
          completed: false,
        };
        break;
      default:
        newSet = {
          setNumber: newSetNumber,
          reps: lastSet?.reps ?? 10,
          weight: lastSet?.weight ?? 0,
          unit: lastSet?.unit || profile?.preferredUnit || 'kg',
          completed: false,
        };
    }

    setSets([...sets, newSet]);
    setValidationErrors((prev) => ({ ...prev, sets: '' }));

    // If previous set was completed, start tracking new set
    if (lastSet?.completed) {
      currentSetStartTimeRef.current = new Date();
      startSet();
    }
  };

  const handleDeleteSet = (setNumber: number) => {
    if (sets.length <= 1) {
      showError('At least one set is required');
      return;
    }

    const updatedSets = sets
      .filter((set) => set.setNumber !== setNumber)
      .map((set, index) => ({
        ...set,
        setNumber: index + 1,
      }));
    setSets(updatedSets);
    setValidationErrors((prev) => ({ ...prev, sets: '' }));
  };

  const handleUpdateSet = (setNumber: number, updates: Partial<WorkoutSet>) => {
    setSets((prevSets) => {
      const updated = prevSets.map((set) => {
        if (set.setNumber === setNumber) {
          const wasCompleted = set.completed;
          const updatedSet = { ...set, ...updates };

          // If set is being completed, track duration and start rest timer
          if (!wasCompleted && updatedSet.completed) {
            const setDuration = completeSet();
            const setEndTime = new Date();
            updatedSet.setDuration = setDuration;
            updatedSet.setEndTime = setEndTime;
            if (currentSetStartTimeRef.current) {
              updatedSet.setStartTime = currentSetStartTimeRef.current;
            }

            // Start rest timer if enabled
            if (restTimerEnabled && settings.autoStartRestTimer) {
              setRestTimerRemaining(defaultRestDuration);
              setRestTimerStartTime(new Date());
              setRestTimerOriginalDuration(defaultRestDuration);
              setRestTimerVisible(true);
            }
          }

          // If set is being uncompleted, reset duration tracking
          if (wasCompleted && !updatedSet.completed) {
            resetSetDuration();
            currentSetStartTimeRef.current = new Date();
            startSet();
            updatedSet.setDuration = undefined;
            updatedSet.setStartTime = undefined;
            updatedSet.setEndTime = undefined;
            updatedSet.restTime = undefined;
          }

          // Validation is now handled by validateExerciseSets in validateForm
          // Clear any previous validation errors for this set
          if (updatedSet.completed) {
            setValidationErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[`set-${setNumber}-weight`];
              delete newErrors[`set-${setNumber}-reps`];
              delete newErrors[`set-${setNumber}-distance`];
              delete newErrors[`set-${setNumber}-duration`];
              return newErrors;
            });
          }

          return updatedSet;
        }
        return set;
      });
      return updated;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedExercise) {
      errors.exercise = 'Please select an exercise';
    }

    const setsValidation = selectedExercise
      ? validateExerciseSets(sets, selectedExercise.trackingType, profile?.preferredUnit || 'kg', 'km')
      : { valid: false, error: 'Please select an exercise' };
    if (!setsValidation.valid) {
      errors.sets = setsValidation.error || 'Invalid sets';
    }

    if (notes && !validateNotes(notes)) {
      errors.notes = 'Notes must be 1000 characters or less';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!selectedExercise || !currentWorkout) {
      showError('Please select an exercise');
      return;
    }

    if (!validateForm()) {
      showError('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    setValidationErrors({});

    try {
      const muscleMapping = getMuscleMapping(selectedExercise.name);
      const musclesWorked = muscleMapping
        ? [...muscleMapping.primary, ...muscleMapping.secondary]
        : selectedExercise.primaryMuscles;

      const totalVolume = calculateVolume(sets, selectedExercise.trackingType);

      const workoutExercise: WorkoutExercise = {
        id: editingExerciseId || `exercise-${Date.now()}`,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        sets: sets,
        totalVolume,
        musclesWorked,
        timestamp: workoutDate,
        notes: notes.trim() ? sanitizeNotes(notes.trim()) : undefined,
      };

      if (editingExerciseId) {
        updateExercise(editingExerciseId, workoutExercise);
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        success('Exercise updated successfully');
      } else {
        addExercise(workoutExercise);
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
        success('Exercise added successfully');
      }

      handleCancelEdit();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save exercise';
      showError(errorMessage);
      console.error('Error saving exercise:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (window.confirm('Are you sure you want to remove this exercise from the workout?')) {
      try {
        removeExercise(exerciseId);
        success('Exercise removed successfully');
        if (editingExerciseId === exerciseId) {
          handleCancelEdit();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove exercise';
        showError(errorMessage);
        console.error('Error removing exercise:', err);
      }
    }
  };

  const handleCreateCustom = () => {
    navigate('/create-exercise');
  };

  const handleSaveAsTemplate = async () => {
    if (!currentWorkout || !profile) {
      showError('No workout to save');
      return;
    }

    if (!templateName.trim()) {
      showError('Please enter a template name');
      return;
    }

    if (currentWorkout.exercises.length === 0) {
      showError('Please add at least one exercise before saving as template');
      return;
    }

    setIsSavingTemplate(true);

    try {
      await templateService.createTemplateFromWorkout(
        currentWorkout,
        templateName.trim(),
        templateCategory,
        templateDescription.trim() || undefined
      );
      success('Template saved successfully!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleUseTemplate = () => {
    navigate('/workout-templates');
  };

  const handleClearWorkout = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      return;
    }
    setShowClearWorkoutModal(true);
  };

  const handleConfirmClearWorkout = () => {
    cancelWorkout();
    // Clear persisted state
    clearWorkoutState();
    setShowClearWorkoutModal(false);
    // Reset component state
    setSelectedExercise(null);
    setSets([]);
    setNotes('');
    setWorkoutDate(new Date());
    setEditingExerciseId(null);
    setSelectedCategory(null);
    setSelectedMuscleGroups([]);
    setRestTimerEnabled(false);
    setRestTimerVisible(false);
    setRestTimerRemaining(60);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);
    setWorkoutTimerStartTime(null);
    resetWorkoutTimer();
    resetSetDuration();
    success('Workout cleared');
    if (profile) {
      startWorkout(profile.id);
    }
  };

  const handleCancelLogWorkout = () => {
    // Check if there's anything to cancel (exercises, selected exercise, or timers running)
    const hasExercises = currentWorkout && currentWorkout.exercises.length > 0;
    const hasSelectedExercise = selectedExercise !== null;
    const hasTimers = workoutTimerStartTime !== null || restTimerVisible;

    if (hasExercises || hasSelectedExercise || hasTimers) {
      setShowCancelWorkoutModal(true);
    } else {
      // Nothing to cancel, just navigate away
      navigate(-1);
    }
  };

  const handleConfirmCancelWorkout = () => {
    // Cancel workout from store (clears all exercises)
    cancelWorkout();

    // Clear persisted state
    clearWorkoutState();

    // Reset all component state
    setSelectedExercise(null);
    setSets([]);
    setNotes('');
    setWorkoutDate(new Date());
    setEditingExerciseId(null);
    setSelectedCategory(null);
    setSelectedMuscleGroups([]);
    setRestTimerEnabled(false);
    setRestTimerVisible(false);
    setRestTimerRemaining(60);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);
    setWorkoutTimerStartTime(null);

    // Reset all timers
    resetWorkoutTimer();
    resetSetDuration();
    currentSetStartTimeRef.current = null;

    setShowCancelWorkoutModal(false);
    success('Workout cancelled');

    // Navigate back
    navigate(-1);
  };

  const handleFinishWorkoutClick = () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      showError('Please add at least one exercise before finishing the workout');
      return;
    }
    setShowFinishWorkoutModal(true);
  };

  const handleConfirmFinishWorkout = async () => {
    if (!currentWorkout) return;

    setIsSaving(true);
    try {
      const calories = workoutCalories !== '' ? Number(workoutCalories) : undefined;
      await finishWorkout(calories);
      // Reset timer when workout is finished
      resetWorkoutTimer();
      // Clear persisted state (already cleared in finishWorkout, but ensure it's cleared)
      clearWorkoutState();
      // Reset component state
      setSelectedExercise(null);
      setSets([]);
      setNotes('');
      setWorkoutDate(new Date());
      setEditingExerciseId(null);
      setSelectedCategory(null);
      setSelectedMuscleGroups([]);
      setRestTimerEnabled(false);
      setRestTimerVisible(false);
      setRestTimerRemaining(60);
      setRestTimerStartTime(null);
      setRestTimerPaused(false);
      setWorkoutTimerStartTime(null);
      setWorkoutCalories('');
      setShowFinishWorkoutModal(false);
      success('Workout saved successfully!');
      navigate('/home');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      showError(errorMessage);
      console.error('Error finishing workout:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSetNumber =
    sets.find((set) => !set.completed)?.setNumber || sets.length;

  const existingExercises = currentWorkout?.exercises || [];

  const isSaveButtonDisabled = !selectedExercise || sets.length === 0 || isSaving;

  return (
    <div className="relative flex min-h-screen w-full flex-col mx-auto max-w-md bg-background-light dark:bg-background-dark overflow-hidden">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-[#316847]">
        <button
          onClick={handleCancelLogWorkout}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Cancel Workout"
        >
          <X className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            {editingExerciseId ? 'Edit Exercise' : 'Log Workout'}
          </h2>
          {currentTemplateName && !editingExerciseId && (
            <p className="text-xs text-primary mt-0.5 flex items-center justify-center gap-1">
              <BookOpen className="w-3 h-3" />
              {currentTemplateName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editingExerciseId && existingExercises.length === 0 && (
            <button
              onClick={handleUseTemplate}
              className="flex h-10 px-3 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Use Template"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
          {!editingExerciseId && existingExercises.length > 0 && (
            <>
              <button
                onClick={handleClearWorkout}
                className="flex h-10 px-3 items-center justify-center rounded-full bg-error/10 text-error hover:bg-error/20 transition-colors"
                title="Clear Workout"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex h-10 px-3 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Save as Template"
              >
                <Save className="w-4 h-4" />
              </button>
            </>
          )}
          {editingExerciseId && (
            <button
              onClick={handleCancelEdit}
              className="flex h-10 px-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm font-bold leading-normal tracking-[0.015em]">
                Cancel
              </span>
            </button>
          )}
          <motion.button
            onClick={handleSave}
            disabled={isSaveButtonDisabled}
            className={cn(
              'flex h-10 px-4 items-center justify-center rounded-full transition-colors gap-2 relative overflow-hidden',
              !isSaveButtonDisabled
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            whileHover={!isSaveButtonDisabled && !shouldReduceMotion ? { scale: 1.05 } : {}}
            whileTap={!isSaveButtonDisabled && !shouldReduceMotion ? { scale: 0.95 } : {}}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-bold leading-normal tracking-[0.015em]">
                  Saving...
                </span>
              </>
            ) : showSuccessAnimation ? (
              <motion.span
                variants={shouldReduceMotion ? {} : checkmarkAnimation}
                initial="initial"
                animate="animate"
                className="text-sm font-bold leading-normal tracking-[0.015em] flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Saved!
              </motion.span>
            ) : (
              <span className="text-sm font-bold leading-normal tracking-[0.015em]">
                {editingExerciseId ? 'Update' : 'Save'}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Existing Exercises List */}
        {existingExercises.length > 0 && !editingExerciseId && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-[#316847]">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Exercises in Workout ({existingExercises.length})
            </h3>
            <motion.div
              className="space-y-2"
              variants={shouldReduceMotion ? {} : staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {existingExercises.map((exercise) => (
                  <motion.div
                    key={exercise.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-[#316847]"
                    variants={shouldReduceMotion ? {} : slideUp}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    whileHover={shouldReduceMotion ? {} : { scale: 1.02, y: -2 }}
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {exercise.exerciseName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''} •{' '}
                        {exercise.sets.filter((s) => s.completed).length} completed
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => handleEditExercise(exercise)}
                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                        aria-label="Edit exercise"
                        whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                      >
                        <Edit className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                        aria-label="Delete exercise"
                        whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}

        {/* Exercise Filters */}
        <ExerciseFilters
          selectedCategory={selectedCategory}
          selectedMuscleGroups={selectedMuscleGroups}
          onCategoryChange={handleCategoryChange}
          onMuscleGroupsChange={handleMuscleGroupsChange}
        />

        {/* Workout Timer Card */}
        <WorkoutTimerCard
          formattedTime={workoutDuration}
          isVisible={!!workoutTimerStartTime && !editingExerciseId}
          isRunning={workoutTimerRunning}
          onPause={pauseWorkoutTimer}
          onResume={resumeWorkoutTimer}
          onReset={resetWorkoutTimer}
        />

        <div className="px-4 py-6">
          {/* Exercise Selector */}
          <ExerciseSelectorDropdown
            selectedExercise={selectedExercise}
            onSelect={handleSelectExercise}
            onCreateCustom={handleCreateCustom}
            selectedCategory={selectedCategory}
            selectedMuscleGroups={selectedMuscleGroups}
          />
          {validationErrors.exercise && (
            <p className="text-xs text-error mt-1">{validationErrors.exercise}</p>
          )}
        </div>

        {/* Exercise Info Card */}
        {selectedExercise && (
          <div className="px-4 mb-6">
            <ExerciseInfoCard exercise={selectedExercise} />
          </div>
        )}

        {/* Sets Section */}
        {selectedExercise && (
          <>
            <div className="sticky top-[72px] z-10 bg-background-light dark:bg-background-dark py-2 px-4 flex items-center justify-between border-b border-gray-200 dark:border-[#316847]/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Sets
              </h3>
              <RestTimerToggle
                enabled={restTimerEnabled}
                onChange={setRestTimerEnabled}
              />
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Column headers */}
              {(() => {
                const trackingType = selectedExercise?.trackingType || 'weight_reps';
                const getGridCols = () => {
                  switch (trackingType) {
                    case 'weight_reps':
                      return 'grid-cols-[30px_1fr_1fr_44px]';
                    case 'reps_only':
                      return 'grid-cols-[30px_1fr_44px]';
                    case 'cardio':
                      return 'grid-cols-[30px_1fr_1fr_1fr_44px]';
                    case 'duration':
                      return 'grid-cols-[30px_1fr_44px]';
                    default:
                      return 'grid-cols-[30px_1fr_1fr_44px]';
                  }
                };

                return (
                  <div className={`grid ${getGridCols()} gap-3 px-2 mb-1`}>
                    <div className="text-xs font-bold text-gray-400 text-center self-end">
                      SET
                    </div>
                    {trackingType === 'weight_reps' && (
                      <>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          {profile?.preferredUnit === 'lbs' ? 'LBS' : 'KG'}
                        </div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          REPS
                        </div>
                      </>
                    )}
                    {trackingType === 'reps_only' && (
                      <div className="text-xs font-bold text-gray-400 text-center self-end">
                        REPS
                      </div>
                    )}
                    {trackingType === 'cardio' && (
                      <>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          DISTANCE
                        </div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          TIME
                        </div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          CAL
                        </div>
                      </>
                    )}
                    {trackingType === 'duration' && (
                      <div className="text-xs font-bold text-gray-400 text-center self-end">
                        DURATION
                      </div>
                    )}
                    <div className="text-xs font-bold text-gray-400 text-center self-end">
                      <Check className="w-3 h-3 mx-auto" />
                    </div>
                  </div>
                );
              })()}

              {/* Set rows */}
              <AnimatePresence>
                {sets.map((set) => {
                  const setNumber = set.setNumber; // Capture setNumber to avoid closure issues
                  return (
                    <motion.div
                      key={setNumber}
                      className="relative pr-12"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={shouldReduceMotion ? {} : slideLeft}
                      layout
                    >
                      <SetRow
                        key={`set-row-${setNumber}`}
                        set={set}
                        onUpdate={(updates) => handleUpdateSet(setNumber, updates)}
                        unit={profile?.preferredUnit || 'kg'}
                        trackingType={selectedExercise?.trackingType || 'weight_reps'}
                        distanceUnit={set.distanceUnit || 'km'}
                        isActive={setNumber === activeSetNumber}
                      />
                      {sets.length > 1 && (
                        <motion.button
                          onClick={() => handleDeleteSet(setNumber)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                          aria-label="Delete set"
                          whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                          whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                      {validationErrors[`set-${setNumber}-weight`] && (
                        <motion.p
                          className="text-xs text-error mt-1 ml-2"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {validationErrors[`set-${setNumber}-weight`]}
                        </motion.p>
                      )}
                      {validationErrors[`set-${setNumber}-reps`] && (
                        <motion.p
                          className="text-xs text-error mt-1 ml-2"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {validationErrors[`set-${setNumber}-reps`]}
                        </motion.p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {validationErrors.sets && (
                <p className="text-xs text-error mt-1">{validationErrors.sets}</p>
              )}

              {/* Add Set button */}
              <button
                onClick={handleAddSet}
                disabled={isSaving}
                className="w-full py-3 mt-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 text-primary font-bold hover:bg-primary/5 active:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Add Set
              </button>
            </div>

            {/* Additional Details */}
            <div className="px-4 mt-4">
              <details
                className="group bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-200 dark:border-[#316847] overflow-hidden"
                open={showAdditionalDetails}
                onToggle={(e) =>
                  setShowAdditionalDetails((e.target as HTMLDetailsElement).open)
                }
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none select-none">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit className="w-5 h-5 text-gray-400" />
                    Additional Details
                  </span>
                  <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-[#316847] pt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formatDateTimeLocal(workoutDate)}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          setWorkoutDate(newDate);
                        }
                      }}
                      disabled={isSaving}
                      className="w-full rounded-lg bg-background-light dark:bg-background-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => {
                        const sanitized = sanitizeString(e.target.value);
                        setNotes(sanitized);
                        if (validationErrors.notes) {
                          setValidationErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.notes;
                            return newErrors;
                          });
                        }
                      }}
                      placeholder="How did this exercise feel?"
                      rows={3}
                      maxLength={1000}
                      disabled={isSaving}
                      className={cn(
                        'w-full rounded-lg bg-background-light dark:bg-background-dark border text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary resize-none p-3',
                        validationErrors.notes
                          ? 'border-error focus:border-error focus:ring-error'
                          : 'border-gray-200 dark:border-[#316847]',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    />
                    <div className="flex items-center justify-between mt-1">
                      {validationErrors.notes && (
                        <p className="text-xs text-error">{validationErrors.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 ml-auto">
                        {notes.length}/1000
                      </p>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </>
        )}

        <div className="h-24"></div>
      </main>

      {/* Rest Timer */}
      <RestTimer
        duration={restTimerRemaining}
        onComplete={handleRestComplete}
        onSkip={handleRestSkip}
        onPause={handleRestPause}
        onTimeAdjust={handleRestTimeAdjust}
        onRemainingTimeChange={handleRestRemainingTimeChange}
        isVisible={restTimerVisible && restTimerEnabled}
        initialPaused={restTimerPaused}
        initialRemainingTime={restTimerVisible ? restTimerRemaining : undefined}
      />

      {/* Clear Workout Confirmation Modal */}
      <Modal
        isOpen={showClearWorkoutModal}
        onClose={() => setShowClearWorkoutModal(false)}
        title="Clear Workout"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to clear this workout? This will remove all exercises and cannot be undone.
          </p>
          {existingExercises.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have <span className="font-bold">{existingExercises.length}</span> exercise{existingExercises.length !== 1 ? 's' : ''} in this workout.
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowClearWorkoutModal(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClearWorkout}
              className="flex-1 h-12 rounded-lg bg-error text-white font-bold hover:bg-error/90 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Workout
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Log Workout Confirmation Modal */}
      <Modal
        isOpen={showCancelWorkoutModal}
        onClose={() => setShowCancelWorkoutModal(false)}
        title="Cancel Log Workout"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to cancel this workout? This will clear all selected exercises, reset all timers, and discard any unsaved changes.
          </p>
          {(existingExercises.length > 0 || selectedExercise) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
              {existingExercises.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-bold">{existingExercises.length}</span> exercise{existingExercises.length !== 1 ? 's' : ''} will be removed.
                </p>
              )}
              {selectedExercise && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current exercise selection will be cleared.
                </p>
              )}
              {(workoutTimerStartTime || restTimerVisible) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All timers will be reset.
                </p>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCancelWorkoutModal(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Keep Working Out
            </button>
            <button
              onClick={handleConfirmCancelWorkout}
              className="flex-1 h-12 rounded-lg bg-error text-white font-bold hover:bg-error/90 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Workout
            </button>
          </div>
        </div>
      </Modal>

      {/* Save as Template Modal */}
      <Modal
        isOpen={showSaveTemplateModal}
        onClose={() => setShowSaveTemplateModal(false)}
        title="Save as Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Upper/Lower Split"
              className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value as TemplateCategory)}
              className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary h-12 px-4"
            >
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy</option>
              <option value="cardio">Cardio</option>
              <option value="home">Home Workout</option>
              <option value="flexibility">Flexibility</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe this workout template..."
              rows={3}
              className="w-full rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-primary resize-none p-3"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowSaveTemplateModal(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAsTemplate}
              disabled={!templateName.trim() || isSavingTemplate}
              className="flex-1 h-12 rounded-lg bg-primary text-background-dark font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSavingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Template
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Finish Workout Confirmation Modal */}
      <AnimatePresence>
        {showFinishWorkoutModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFinishWorkoutModal(false)}
          >
            <motion.div
              className="relative w-full max-w-xs sm:max-w-sm overflow-hidden rounded-xl bg-white dark:bg-[#1c2e24] shadow-2xl border border-gray-200 dark:border-[#316847]/50 transform transition-all scale-100 opacity-100"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowFinishWorkoutModal(false)}
                className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex flex-col p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-bold leading-tight text-gray-900 dark:text-white">
                  Finish Workout?
                </h3>
                <p className="mb-4 text-sm text-gray-600 dark:text-[#90cba8] font-normal leading-relaxed">
                  Are you sure you want to mark this workout as finished?
                </p>
                <div className="mb-6 text-left">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Calories <span className="text-gray-500 dark:text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={workoutCalories}
                    onChange={(e) => setWorkoutCalories(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Enter Calories"
                    className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] h-10 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                  <button
                    onClick={handleConfirmFinishWorkout}
                    disabled={isSaving}
                    className="flex w-full flex-1 items-center justify-center rounded-lg bg-primary dark:bg-primary hover:bg-green-400 dark:hover:bg-green-500 px-4 py-2.5 text-sm font-bold text-background-dark shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Finish Workout'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowFinishWorkoutModal(false);
                      setWorkoutCalories('');
                    }}
                    disabled={isSaving}
                    className="flex w-full flex-1 items-center justify-center rounded-lg border border-gray-300 dark:border-[#316847] bg-white dark:bg-transparent px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-[#224932] transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish Workout Button - Fixed at bottom when exercises exist */}
      {existingExercises.length > 0 && !editingExerciseId && (
        <div className="fixed bottom-20 left-0 right-0 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark dark:to-transparent pt-6 pb-6 px-4 z-20">
          <div className="max-w-md mx-auto">
            <motion.button
              onClick={handleFinishWorkoutClick}
              disabled={isSaving}
              className={cn(
                'w-full rounded-xl bg-primary hover:bg-primary/90 text-background-dark font-bold text-lg py-4 shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 relative overflow-hidden',
                isSaving && 'opacity-50 cursor-not-allowed'
              )}
              whileHover={!isSaving && !shouldReduceMotion ? { scale: 1.02, boxShadow: '0 0 30px rgba(13,242,105,0.5)' } : {}}
              whileTap={!isSaving && !shouldReduceMotion ? { scale: 0.98 } : {}}
              animate={!isSaving && !shouldReduceMotion ? {
                boxShadow: [
                  '0 0 20px rgba(13,242,105,0.25)',
                  '0 0 30px rgba(13,242,105,0.4)',
                  '0 0 20px rgba(13,242,105,0.25)',
                ],
              } : {}}
              transition={{
                boxShadow: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving Workout...
                </>
              ) : (
                <>
                  Finish Workout
                  <motion.div
                    animate={shouldReduceMotion ? {} : {
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
