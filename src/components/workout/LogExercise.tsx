import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, ChevronDown, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { ExerciseInfoCard } from '@/components/exercise/ExerciseInfoCard';
import { SetRow } from '@/components/exercise/SetRow';
import { RestTimerToggle } from '@/components/exercise/RestTimerToggle';
import { RestTimer } from '@/components/exercise/RestTimer';
import { Exercise, WorkoutExercise, WorkoutSet, ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { getMuscleMapping } from '@/services/muscleMapping';
import { calculateVolume } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { validateNotes, validateSet, validateReps, validateWeight } from '@/utils/validators';
import { sanitizeNotes, sanitizeString } from '@/utils/sanitize';
import { slideLeft, checkmarkAnimation, prefersReducedMotion } from '@/utils/animations';
import { useSetDuration } from '@/hooks/useSetDuration';
import { useSettingsStore } from '@/store/settingsStore';
import { saveLogWorkoutState } from '@/utils/workoutStatePersistence';
import { trapFocus, restoreFocus } from '@/utils/accessibility';

// Constants
const SAVE_ANIMATION_DURATION = 2000; // ms
const MODAL_CLOSE_DELAY = 500; // ms

// Helper function to format date for datetime-local input (local time, not UTC)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface LogExerciseProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseId?: string | null; // If provided, we're editing this exercise
  selectedCategory?: ExerciseCategory | null;
  selectedMuscleGroups?: MuscleGroupCategory[];
  onCategoryChange?: (category: ExerciseCategory | null) => void;
  onMuscleGroupsChange?: (groups: MuscleGroupCategory[]) => void;
  onExerciseSaved?: () => void; // Callback when exercise is saved
  onStartWorkoutTimer?: () => void; // Callback to start workout timer on parent
}

export function LogExercise({
  isOpen,
  onClose,
  exerciseId,
  selectedCategory,
  selectedMuscleGroups,
  onCategoryChange: _onCategoryChange,
  onMuscleGroupsChange: _onMuscleGroupsChange,
  onExerciseSaved,
  onStartWorkoutTimer,
}: LogExerciseProps) {
  const navigate = useNavigate();
  const { currentWorkout, addExercise, updateExercise } = useWorkoutStore();
  const { profile } = useUserStore();
  const { success, error: showError } = useToast();
  const { settings } = useSettingsStore();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [restTimerEnabled, setRestTimerEnabled] = useState(false);
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Rest timer state
  const [restTimerVisible, setRestTimerVisible] = useState(false);
  const [restTimerRemaining, setRestTimerRemaining] = useState(() => profile?.defaultRestTime || 60);
  const [restTimerStartTime, setRestTimerStartTime] = useState<Date | null>(null);
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [restTimerOriginalDuration, setRestTimerOriginalDuration] = useState<number | null>(null);
  const defaultRestDuration = profile?.defaultRestTime || 60;

  // Set duration tracking
  const { startSet, completeSet, reset: resetSetDuration } = useSetDuration();
  const currentSetStartTimeRef = useRef<Date | null>(null);
  const restTimerSetNumberRef = useRef<number | null>(null);
  const shouldReduceMotion = prefersReducedMotion();

  // Track if we've loaded the exercise to prevent re-loading
  const loadedExerciseIdRef = useRef<string | null>(null);
  const currentWorkoutRef = useRef(currentWorkout);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  
  // Keep ref updated
  useEffect(() => {
    currentWorkoutRef.current = currentWorkout;
  }, [currentWorkout]);

  // Load exercise data when editing
  useEffect(() => {
    if (!isOpen) {
      // Reset refs when modal closes
      loadedExerciseIdRef.current = null;
      initializedExerciseIdRef.current = null;
      return;
    }

    if (exerciseId && currentWorkoutRef.current) {
      // Reset ref when exerciseId changes to allow reload
      if (loadedExerciseIdRef.current !== exerciseId) {
        loadedExerciseIdRef.current = null;
      }

      // Only load if we haven't already loaded this exercise
      if (loadedExerciseIdRef.current === exerciseId) {
        return;
      }

      const loadExercise = async () => {
        const workout = currentWorkoutRef.current;
        if (!workout) return;
        
        setIsLoadingExercise(true);
        try {
          const workoutExercise = workout.exercises.find((ex) => ex.id === exerciseId);
          if (!workoutExercise) {
            showError('Exercise no longer exists in workout');
            onClose();
            return;
          }

          const exerciseData = await exerciseLibrary.getExerciseById(workoutExercise.exerciseId);
          if (exerciseData) {
            setSelectedExercise(exerciseData);
            setSets(
              workoutExercise.sets.map((set, index) => ({
                ...set,
                setNumber: index + 1,
              }))
            );
            setNotes(workoutExercise.notes || '');
            setWorkoutDate(workoutExercise.timestamp);
            setShowAdditionalDetails(false);
            setValidationErrors({});
            loadedExerciseIdRef.current = exerciseId;
          } else {
            showError('Exercise not found');
            onClose();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load exercise';
          showError(errorMessage);
          console.error('Error loading exercise:', err);
          onClose();
        } finally {
          setIsLoadingExercise(false);
        }
      };
      loadExercise();
    } else if (!exerciseId) {
      // New exercise - reset state (only once)
      if (loadedExerciseIdRef.current !== null) {
        loadedExerciseIdRef.current = null;
        setSelectedExercise(null);
        setSets([]);
        setNotes('');
        setWorkoutDate(new Date());
        setValidationErrors({});
        setRestTimerVisible(false);
        setRestTimerRemaining(defaultRestDuration);
        setRestTimerStartTime(null);
        setRestTimerPaused(false);
        resetSetDuration();
        currentSetStartTimeRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exerciseId, defaultRestDuration]);

  // Track if we've initialized sets for the current exercise
  const initializedExerciseIdRef = useRef<string | null>(null);

  // Initialize sets when exercise is selected (new exercise only)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (selectedExercise && !exerciseId) {
      // Only initialize once per exercise selection
      if (initializedExerciseIdRef.current === selectedExercise.id) {
        return;
      }

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
      initializedExerciseIdRef.current = selectedExercise.id;

      // Start tracking first set
      resetSetDuration();
      currentSetStartTimeRef.current = new Date();
      startSet();
    } else if (!selectedExercise) {
      // Clear tracking when exercise is deselected
      if (initializedExerciseIdRef.current !== null) {
        initializedExerciseIdRef.current = null;
        setSets([]);
        setNotes('');
        setValidationErrors({});
        resetSetDuration();
        currentSetStartTimeRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise?.id, exerciseId, isOpen, profile?.preferredUnit]);

  // Use refs to track state for saving - avoids infinite loops from array dependencies
  const stateSnapshotRef = useRef({
    selectedExerciseId: null as string | null,
    sets: [] as WorkoutSet[],
    restTimerEnabled: false,
    workoutDate: new Date(),
    notes: '',
    exerciseId: null as string | null,
    selectedCategory: null as ExerciseCategory | null,
    selectedMuscleGroups: [] as MuscleGroupCategory[],
    restTimerVisible: false,
    restTimerRemaining: 60,
    restTimerStartTime: null as Date | null,
    restTimerPaused: false,
    restTimerOriginalDuration: null as number | null,
    showAdditionalDetails: false,
  });

  // Update ref when state changes (no dependency on arrays to avoid loops)
  useEffect(() => {
    stateSnapshotRef.current = {
      selectedExerciseId: selectedExercise?.id || null,
      sets,
      restTimerEnabled,
      workoutDate,
      notes,
      exerciseId: exerciseId || null,
      selectedCategory: selectedCategory || null,
      selectedMuscleGroups: selectedMuscleGroups || [],
      restTimerVisible,
      restTimerRemaining,
      restTimerStartTime,
      restTimerPaused,
      restTimerOriginalDuration,
      showAdditionalDetails,
    };
  });

  // Save state on visibility change or before unload - avoid auto-save to prevent infinite loops
  useEffect(() => {
    if (!isOpen) return;

    const saveCurrentState = () => {
      const state = stateSnapshotRef.current;
      
      // Read set duration state from localStorage
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

      saveLogWorkoutState({
        selectedExerciseId: state.selectedExerciseId,
        sets: state.sets,
        restTimerEnabled: state.restTimerEnabled,
        workoutDate: state.workoutDate.toISOString(),
        notes: state.notes,
        editingExerciseId: state.exerciseId,
        selectedCategory: state.selectedCategory,
        selectedMuscleGroups: state.selectedMuscleGroups,
        restTimerVisible: state.restTimerVisible,
        restTimerRemaining: state.restTimerRemaining,
        restTimerStartTime: state.restTimerStartTime?.toISOString() || null,
        restTimerPaused: state.restTimerPaused,
        restTimerOriginalDuration: state.restTimerOriginalDuration,
        workoutTimerStartTime: null,
        showAdditionalDetails: state.showAdditionalDetails,
        setDurationStartTime,
        setDurationElapsed,
      });
    };

    const handleBeforeUnload = () => {
      saveCurrentState();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveCurrentState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setValidationErrors({});
    onStartWorkoutTimer?.(); // Notify parent to start workout timer if not already running
  };

  const handleCreateCustom = () => {
    navigate('/create-exercise');
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
              restTimerSetNumberRef.current = setNumber;
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

          // Validate reps in real-time
          if (updates.reps !== undefined && selectedExercise) {
            const trackingType = selectedExercise.trackingType;
            if (trackingType === 'weight_reps' || trackingType === 'reps_only') {
              const repsValidation = validateReps(updates.reps);
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                if (repsValidation.valid) {
                  delete newErrors[`set-${setNumber}-reps`];
                } else {
                  newErrors[`set-${setNumber}-reps`] = repsValidation.error || 'Invalid reps';
                }
                return newErrors;
              });
            }
          }

          // Clear validation errors when set is completed (if valid)
          if (updatedSet.completed) {
            setValidationErrors((prev) => {
              const newErrors = { ...prev };
              if (selectedExercise) {
                const setValidation = validateSet(
                  updatedSet,
                  selectedExercise.trackingType,
                  profile?.preferredUnit || 'kg',
                  'km'
                );
                if (setValidation.valid) {
                  delete newErrors[`set-${setNumber}-weight`];
                  delete newErrors[`set-${setNumber}-reps`];
                  delete newErrors[`set-${setNumber}-distance`];
                  delete newErrors[`set-${setNumber}-duration`];
                }
              }
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

    if (selectedExercise) {
      const trackingType = selectedExercise.trackingType;
      const unit = profile?.preferredUnit || 'kg';
      const distanceUnit = 'km' as const;

      if (sets.length === 0) {
        errors.sets = 'At least one set is required';
      } else {
        const completedSets = sets.filter((s) => s.completed);
        const incompleteSets = sets.filter((s) => !s.completed);

        if (completedSets.length === 0) {
          errors.sets = 'At least one set must be completed';
        } else if (incompleteSets.length > 0) {
          const incompleteSetNumbers = incompleteSets.map((s) => s.setNumber).join(', ');
          errors.sets = `All sets must be completed. Set${incompleteSets.length > 1 ? 's' : ''} ${incompleteSetNumbers} ${incompleteSets.length > 1 ? 'are' : 'is'} incomplete.`;
        } else {
          for (const set of sets) {
            const setValidation = validateSet(set, trackingType, unit, distanceUnit);
            if (!setValidation.valid) {
              if (trackingType === 'weight_reps' || trackingType === 'reps_only') {
                if (set.reps !== undefined) {
                  const repsValidation = validateReps(set.reps);
                  if (!repsValidation.valid) {
                    errors[`set-${set.setNumber}-reps`] = repsValidation.error || 'Invalid reps';
                  }
                }
                if (trackingType === 'weight_reps' && set.weight !== undefined) {
                  const weightValidation = validateWeight(set.weight, unit);
                  if (!weightValidation.valid) {
                    errors[`set-${set.setNumber}-weight`] = weightValidation.error || 'Invalid weight';
                  }
                }
              }
              if (!errors[`set-${set.setNumber}-reps`] && !errors[`set-${set.setNumber}-weight`]) {
                errors.sets = setValidation.error || 'Invalid sets';
              }
            }
          }
        }
      }
    } else {
      errors.sets = 'Please select an exercise';
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
        id: exerciseId || `exercise-${Date.now()}`,
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        sets: sets,
        totalVolume,
        musclesWorked,
        timestamp: workoutDate,
        notes: notes.trim() ? sanitizeNotes(notes.trim()) : undefined,
      };

      if (exerciseId) {
        updateExercise(exerciseId, workoutExercise);
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), SAVE_ANIMATION_DURATION);
        success('Exercise updated successfully');
      } else {
        addExercise(workoutExercise);
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), SAVE_ANIMATION_DURATION);
        success('Exercise added successfully');
      }

      // Reset state
      setSelectedExercise(null);
      setSets([]);
      setNotes('');
      setWorkoutDate(new Date());
      setValidationErrors({});
      setRestTimerVisible(false);
      setRestTimerRemaining(defaultRestDuration);
      setRestTimerStartTime(null);
      setRestTimerPaused(false);
      resetSetDuration();
      currentSetStartTimeRef.current = null;

      // Call callback and close modal
      onExerciseSaved?.();
      setTimeout(() => {
        onClose();
      }, MODAL_CLOSE_DELAY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save exercise';
      showError(errorMessage);
      console.error('Error saving exercise:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset state
    setSelectedExercise(null);
    setSets([]);
    setNotes('');
    setWorkoutDate(new Date());
    setValidationErrors({});
    setRestTimerVisible(false);
    setRestTimerRemaining(defaultRestDuration);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);
    resetSetDuration();
    currentSetStartTimeRef.current = null;
    onClose();
  };

  // Rest timer handlers
  const handleRestComplete = () => {
    const actualRestTime = restTimerStartTime
      ? Math.floor((new Date().getTime() - restTimerStartTime.getTime()) / 1000)
      : defaultRestDuration;

    if (restTimerSetNumberRef.current !== null) {
      handleUpdateSet(restTimerSetNumberRef.current, { restTime: actualRestTime });
      restTimerSetNumberRef.current = null;
    } else {
      if (sets.length > 0) {
        const lastCompletedSet = [...sets].reverse().find((s) => s.completed);
        if (lastCompletedSet) {
          handleUpdateSet(lastCompletedSet.setNumber, { restTime: actualRestTime });
        }
      }
    }

    setRestTimerVisible(false);
    setRestTimerRemaining(defaultRestDuration);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);
    restTimerSetNumberRef.current = null;

    // Start tracking next set
    currentSetStartTimeRef.current = new Date();
    startSet();
  };

  const handleRestSkip = () => {
    const actualRestTime = restTimerStartTime
      ? Math.floor((new Date().getTime() - restTimerStartTime.getTime()) / 1000)
      : 0;

    if (restTimerSetNumberRef.current !== null) {
      handleUpdateSet(restTimerSetNumberRef.current, { restTime: actualRestTime });
      restTimerSetNumberRef.current = null;
    } else {
      if (sets.length > 0) {
        const lastCompletedSet = [...sets].reverse().find((s) => s.completed);
        if (lastCompletedSet) {
          handleUpdateSet(lastCompletedSet.setNumber, { restTime: actualRestTime });
        }
      }
    }

    setRestTimerVisible(false);
    setRestTimerRemaining(defaultRestDuration);
    setRestTimerStartTime(null);
    setRestTimerPaused(false);
    restTimerSetNumberRef.current = null;

    // Start tracking next set
    currentSetStartTimeRef.current = new Date();
    startSet();
  };

  const handleRestTimeAdjust = (seconds: number) => {
    setRestTimerRemaining((prev) => Math.max(0, prev + seconds));
  };

  const handleRestRemainingTimeChange = (remainingTime: number) => {
    setRestTimerRemaining(remainingTime);
  };

  const handleRestPause = (paused: boolean) => {
    setRestTimerPaused(paused);
  };

  const activeSetNumber = sets.find((set) => !set.completed)?.setNumber || sets.length;
  const isSaveButtonDisabled = !selectedExercise || sets.length === 0 || isSaving;

  // Lock body scroll and manage focus when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Set up focus trap
      if (modalRef.current) {
        const cleanup = trapFocus(modalRef.current);
        return () => {
          cleanup();
          document.body.style.overflow = '';
          // Restore focus to previous element
          restoreFocus(previousActiveElementRef.current);
        };
      }
    } else {
      document.body.style.overflow = '';
      // Restore focus when modal closes
      restoreFocus(previousActiveElementRef.current);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        // Reset state
        setSelectedExercise(null);
        setSets([]);
        setNotes('');
        setWorkoutDate(new Date());
        setValidationErrors({});
        setRestTimerVisible(false);
        setRestTimerRemaining(defaultRestDuration);
        setRestTimerStartTime(null);
        setRestTimerPaused(false);
        resetSetDuration();
        currentSetStartTimeRef.current = null;
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, defaultRestDuration, onClose, resetSetDuration]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex flex-col bg-background-light dark:bg-background-dark overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-exercise-title"
      tabIndex={-1}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-[#316847]">
        <button
          onClick={handleCancel}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Cancel"
        >
          <X className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <div className="flex-1 text-center">
          <h2 id="log-exercise-title" className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
            {exerciseId ? 'Edit Exercise' : 'Add Exercise'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCancel}
            className="flex h-10 px-4 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="text-sm font-bold leading-normal tracking-[0.015em]">Cancel</span>
          </button>
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
                <span className="text-sm font-bold leading-normal tracking-[0.015em]">Saving...</span>
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
                {exerciseId ? 'Update' : 'Save'}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {isLoadingExercise ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading exercise data...</p>
            </div>
          </div>
        ) : (
          <>
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sets</h3>
              <RestTimerToggle enabled={restTimerEnabled} onChange={setRestTimerEnabled} />
            </div>

            <div className="px-4 py-4 space-y-3">
              {/* Column headers */}
              {(() => {
                const trackingType = selectedExercise?.trackingType || 'weight_reps';
                const getGridCols = () => {
                  switch (trackingType) {
                    case 'weight_reps':
                      return 'grid-cols-[30px_1fr_1fr_60px_44px]';
                    case 'reps_only':
                      return 'grid-cols-[30px_1fr_60px_44px]';
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
                    <div className="text-xs font-bold text-gray-400 text-center self-end">SET</div>
                    {trackingType === 'weight_reps' && (
                      <>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">
                          {profile?.preferredUnit === 'lbs' ? 'LBS' : 'KG'}
                        </div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">REPS</div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">RPE</div>
                      </>
                    )}
                    {trackingType === 'reps_only' && (
                      <>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">REPS</div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">RPE</div>
                      </>
                    )}
                    {trackingType === 'cardio' && (
                      <>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">DISTANCE</div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">TIME</div>
                        <div className="text-xs font-bold text-gray-400 text-center self-end">CAL</div>
                      </>
                    )}
                    {trackingType === 'duration' && (
                      <div className="text-xs font-bold text-gray-400 text-center self-end">DURATION</div>
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
                  const setNumber = set.setNumber;
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
                onToggle={(e) => setShowAdditionalDetails((e.target as HTMLDetailsElement).open)}
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none select-none">
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ChevronDown className="w-5 h-5 text-gray-400" />
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
                      <p className="text-xs text-gray-500 ml-auto">{notes.length}/1000</p>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            <div className="h-24"></div>
          </>
        )}
          </>
        )}
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
    </div>
  );
}

