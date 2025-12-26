import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { RestTimer } from '@/components/exercise/RestTimer';
import { CurrentSetCard } from '@/components/exercise/CurrentSetCard';
import { CompletedSetItem } from '@/components/exercise/CompletedSetItem';
import { SupersetNavigationCards } from '@/components/exercise/SupersetNavigationCards';
import { GroupRestTimer } from '@/components/exercise/GroupRestTimer';
import { PreviousWorkoutTable } from '@/components/exercise/PreviousWorkoutTable';
import { WorkoutTimerDisplay } from '@/components/exercise/WorkoutTimerDisplay';
import { AIInsightPill } from '@/components/exercise/AIInsightPill';
import { Exercise, WorkoutExercise, WorkoutSet, ExerciseCategory } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { getMuscleMapping } from '@/services/muscleMapping';
import { calculateVolume } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useToast } from '@/hooks/useToast';
import { validateNotes, validateSet, validateReps, validateWeight } from '@/utils/validators';
import { sanitizeNotes } from '@/utils/sanitize';
import { prefersReducedMotion } from '@/utils/animations';
import { useSetDuration } from '@/hooks/useSetDuration';
import { useSettingsStore } from '@/store/settingsStore';
import { saveLogWorkoutState, saveLogExerciseState, loadLogExerciseState, clearLogExerciseState } from '@/utils/workoutStatePersistence';
import { trapFocus, restoreFocus } from '@/utils/accessibility';
import { supersetService, SupersetGroup } from '@/services/supersetService';
import { Modal } from '@/components/common/Modal';

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
  onNavigateToExercise?: (exerciseId: string) => void; // Callback to navigate to next exercise in superset
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
  onNavigateToExercise,
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);

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

    // Try to restore persisted state from sessionStorage
    const persistedState = loadLogExerciseState();
    if (persistedState) {
      // Only restore if it matches current context (same exerciseId or both are new)
      const matchesContext = 
        (persistedState.exerciseId === null && exerciseId === null) ||
        (persistedState.exerciseId === exerciseId);
      
      if (matchesContext && (persistedState.selectedExerciseId || persistedState.sets.length > 0)) {
        // Restore exercise if we have an ID
        if (persistedState.selectedExerciseId) {
          exerciseLibrary.getExerciseById(persistedState.selectedExerciseId)
            .then((exercise) => {
              if (exercise) {
                setSelectedExercise(exercise);
                setSets(persistedState.sets);
                setNotes(persistedState.notes);
                setWorkoutDate(new Date(persistedState.workoutDate));
                
                // Set initial state to restored state (so no changes detected initially)
                initialStateRef.current = {
                  selectedExerciseId: exercise.id,
                  sets: persistedState.sets,
                  notes: persistedState.notes,
                  workoutDate: new Date(persistedState.workoutDate),
                };
                setHasUnsavedChanges(false);
              }
            })
            .catch((err) => {
              console.error('Failed to restore exercise from persisted state:', err);
            });
        } else if (persistedState.sets.length > 0) {
          // Restore sets even without exercise (user might have been in middle of selecting)
          setSets(persistedState.sets);
          setNotes(persistedState.notes);
          setWorkoutDate(new Date(persistedState.workoutDate));
          
          initialStateRef.current = {
            selectedExerciseId: null,
            sets: persistedState.sets,
            notes: persistedState.notes,
            workoutDate: new Date(persistedState.workoutDate),
          };
          setHasUnsavedChanges(false);
        }
      }
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
            handleForceClose();
            return;
          }

          const exerciseData = await exerciseLibrary.getExerciseById(workoutExercise.exerciseId);
          if (exerciseData) {
            const loadedSets = workoutExercise.sets.map((set, index) => ({
              ...set,
              setNumber: index + 1,
            }));
            setSelectedExercise(exerciseData);
            setSets(loadedSets);
            setNotes(workoutExercise.notes || '');
            setWorkoutDate(workoutExercise.timestamp);
            setShowAdditionalDetails(false);
            setValidationErrors({});
            
            // Set initial state for change detection
            initialStateRef.current = {
              selectedExerciseId: exerciseData.id,
              sets: loadedSets,
              notes: workoutExercise.notes || '',
              workoutDate: workoutExercise.timestamp,
            };
            setHasUnsavedChanges(false);
            
            loadedExerciseIdRef.current = exerciseId;
          } else {
            showError('Exercise not found');
            handleForceClose();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load exercise';
          showError(errorMessage);
          console.error('Error loading exercise:', err);
          handleForceClose();
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
        
        // Reset initial state
        initialStateRef.current = {
          selectedExerciseId: null,
          sets: [],
          notes: '',
          workoutDate: new Date(),
        };
        setHasUnsavedChanges(false);
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
      const newDate = new Date();
      setWorkoutDate(newDate);
      setValidationErrors({});
      initializedExerciseIdRef.current = selectedExercise.id;
      
      // Set initial state for change detection
      initialStateRef.current = {
        selectedExerciseId: selectedExercise.id,
        sets: [initialSet],
        notes: '',
        workoutDate: newDate,
      };
      setHasUnsavedChanges(false);

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

  // Track initial state to detect unsaved changes
  const initialStateRef = useRef<{
    selectedExerciseId: string | null;
    sets: WorkoutSet[];
    notes: string;
    workoutDate: Date;
  }>({
    selectedExerciseId: null,
    sets: [],
    notes: '',
    workoutDate: new Date(),
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

  // Helper function to compare states for unsaved changes
  const hasStateChanged = useCallback((): boolean => {
    const current = {
      selectedExerciseId: selectedExercise?.id || null,
      sets,
      notes,
      workoutDate,
    };
    const initial = initialStateRef.current;

    // Compare exercise selection
    if (current.selectedExerciseId !== initial.selectedExerciseId) {
      return true;
    }

    // Compare notes
    if (current.notes !== initial.notes) {
      return true;
    }

    // Compare workout date (compare ISO strings to avoid time precision issues)
    if (current.workoutDate.toISOString() !== initial.workoutDate.toISOString()) {
      return true;
    }

    // Compare sets (deep comparison)
    if (current.sets.length !== initial.sets.length) {
      return true;
    }

    for (let i = 0; i < current.sets.length; i++) {
      const currentSet = current.sets[i];
      const initialSet = initial.sets[i];
      
      if (
        currentSet.setNumber !== initialSet.setNumber ||
        currentSet.reps !== initialSet.reps ||
        currentSet.weight !== initialSet.weight ||
        currentSet.unit !== initialSet.unit ||
        currentSet.duration !== initialSet.duration ||
        currentSet.distance !== initialSet.distance ||
        currentSet.distanceUnit !== initialSet.distanceUnit ||
        currentSet.time !== initialSet.time ||
        currentSet.calories !== initialSet.calories ||
        currentSet.completed !== initialSet.completed ||
        currentSet.rpe !== initialSet.rpe
      ) {
        return true;
      }
    }

    return false;
  }, [selectedExercise?.id, sets, notes, workoutDate]);

  // Detect unsaved changes
  useEffect(() => {
    if (!isOpen) return;
    
    const changed = hasStateChanged();
    setHasUnsavedChanges(changed);
  }, [isOpen, hasStateChanged]);

  // Auto-persist to sessionStorage when state changes
  useEffect(() => {
    if (!isOpen) return;
    
    // Only persist if there are actual changes (exercise selected and/or sets exist)
    if (selectedExercise || sets.length > 0 || notes.trim() !== '') {
      saveLogExerciseState({
        selectedExerciseId: selectedExercise?.id || null,
        sets,
        notes,
        workoutDate: workoutDate.toISOString(),
        exerciseId: exerciseId || null,
      });
    }
  }, [selectedExercise, sets, notes, workoutDate, exerciseId, isOpen]);

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

  const handleSave = async (): Promise<void> => {
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
      // Clear persisted state after successful save
      clearLogExerciseState();
      setHasUnsavedChanges(false);
      setTimeout(() => {
        handleForceClose();
      }, MODAL_CLOSE_DELAY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save exercise';
      showError(errorMessage);
      console.error('Error saving exercise:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close request - check for unsaved changes
  const handleCloseRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowSaveConfirmModal(true);
    } else {
      // No unsaved changes, close immediately
      clearLogExerciseState();
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Force close without confirmation (for error cases, successful saves)
  const handleForceClose = useCallback(() => {
    clearLogExerciseState();
    onClose();
  }, [onClose]);

  const handleCancel = useCallback(() => {
    handleCloseRequest();
  }, [handleCloseRequest]);

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

  // Handle logging current set
  const handleLogCurrentSet = async () => {
    if (!selectedExercise) return;

    let setToComplete = currentSet;
    
    // If no current set, create a new one
    if (!setToComplete) {
      const newSetNumber = sets.length + 1;
      const lastSet = sets[sets.length - 1];
      const trackingType = selectedExercise.trackingType;
      
      let newSet: WorkoutSet;
      switch (trackingType) {
        case 'weight_reps':
          newSet = {
            setNumber: newSetNumber,
            reps: lastSet?.reps ?? 10,
            weight: lastSet?.weight ?? 0,
            unit: profile?.preferredUnit || 'kg',
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
        default:
          newSet = {
            setNumber: newSetNumber,
            reps: lastSet?.reps ?? 10,
            weight: lastSet?.weight ?? 0,
            unit: profile?.preferredUnit || 'kg',
            completed: false,
          };
      }
      
      setSets([...sets, newSet]);
      setToComplete = newSet;
    }

    // Mark set as completed
    const setUpdates: Partial<WorkoutSet> = {
      completed: true,
    };

    // Track duration
    const setDuration = completeSet();
    const setEndTime = new Date();
    setUpdates.setDuration = setDuration;
    setUpdates.setEndTime = setEndTime;
    if (currentSetStartTimeRef.current) {
      setUpdates.setStartTime = currentSetStartTimeRef.current;
    }

    handleUpdateSet(setToComplete.setNumber, setUpdates);

    // If in superset and has next exercise, show group rest timer
    if (isInSuperset && nextExercise && !isLastInSuperset) {
      setGroupRestTimerVisible(true);
      // Don't navigate yet - wait for timer to complete
    } else if (isInSuperset && isLastInSuperset) {
      // Last exercise in superset - show regular rest timer
      if (restTimerEnabled && settings.autoStartRestTimer) {
        setRestTimerRemaining(defaultRestDuration);
        setRestTimerStartTime(new Date());
        setRestTimerOriginalDuration(defaultRestDuration);
        setRestTimerVisible(true);
      }
    } else {
      // Not in superset - show regular rest timer
      if (restTimerEnabled && settings.autoStartRestTimer) {
        setRestTimerRemaining(defaultRestDuration);
        setRestTimerStartTime(new Date());
        setRestTimerOriginalDuration(defaultRestDuration);
        setRestTimerVisible(true);
      }
    }
  };

  // Handle group rest timer completion - navigate to next exercise
  const handleGroupRestComplete = async () => {
    if (!nextExercise) return;

    setGroupRestTimerVisible(false);
    
    // Save current exercise first if there are changes
    if (sets.some((s) => s.completed)) {
      try {
        await handleSave();
      } catch (error) {
        // If save fails, don't navigate
        console.error('Failed to save exercise before navigation:', error);
        return;
      }
    }
    
    // Navigate to next exercise
    if (onNavigateToExercise) {
      onNavigateToExercise(nextExercise.id);
    } else {
      // Fallback: close and let parent handle
      handleCloseRequest();
    }
  };

  // Handle group rest timer skip
  const handleGroupRestSkip = () => {
    handleGroupRestComplete();
  };

  const activeSetNumber = sets.find((set) => !set.completed)?.setNumber || sets.length;
  const isSaveButtonDisabled = !selectedExercise || sets.length === 0 || isSaving;

  // Superset detection and navigation
  const currentExercise = useMemo(() => {
    if (!exerciseId || !currentWorkout) return null;
    return currentWorkout.exercises.find((ex) => ex.id === exerciseId);
  }, [exerciseId, currentWorkout]);

  const isInSuperset = useMemo(() => {
    return !!(currentExercise?.groupId && currentExercise?.groupType);
  }, [currentExercise]);

  const groupExercises = useMemo(() => {
    if (!isInSuperset || !currentExercise || !currentWorkout || !currentExercise.groupId) return [];
    return supersetService.getGroupExercises(currentWorkout.exercises, currentExercise.groupId);
  }, [isInSuperset, currentExercise, currentWorkout]);

  const nextExercise = useMemo(() => {
    if (!isInSuperset || !currentExercise || groupExercises.length === 0) return null;
    const group: SupersetGroup = {
      groupId: currentExercise.groupId!,
      groupType: currentExercise.groupType!,
      exercises: groupExercises,
    };
    return supersetService.getNextExercise(group, currentExercise.id);
  }, [isInSuperset, currentExercise, groupExercises]);

  const isLastInSuperset = useMemo(() => {
    if (!isInSuperset || !currentExercise || groupExercises.length === 0) return false;
    const currentIndex = groupExercises.findIndex((ex) => ex.id === currentExercise.id);
    return currentIndex === groupExercises.length - 1;
  }, [isInSuperset, currentExercise, groupExercises]);

  // Group rest timer state
  const [groupRestTimerVisible, setGroupRestTimerVisible] = useState(false);
  const [groupRestTimerDuration, setGroupRestTimerDuration] = useState(45); // Default 45s

  // Workout timer access
  const workoutTimerStartTime = useWorkoutStore((state) => state.workoutTimerStartTime);

  // Current set (first incomplete set or next set to add)
  const currentSet = useMemo(() => {
    const incompleteSet = sets.find((set) => !set.completed);
    if (incompleteSet) return incompleteSet;
    // If all sets are completed, return the last set for reference
    return sets[sets.length - 1] || null;
  }, [sets]);

  const currentSetNumber = useMemo(() => {
    if (currentSet) return currentSet.setNumber;
    return sets.length + 1;
  }, [currentSet, sets.length]);

  const completedSets = useMemo(() => {
    return sets.filter((set) => set.completed);
  }, [sets]);

  // Get previous workout data for current set
  const previousSetData = useMemo(() => {
    if (!currentSet || !currentExercise) return null;
    // This will be loaded by PreviousWorkoutTable component
    return null;
  }, [currentSet, currentExercise]);

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
        handleCloseRequest();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving, defaultRestDuration, handleCloseRequest, resetSetDuration]);

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
      <header className="sticky top-0 z-20 flex flex-col gap-2 bg-background-light dark:bg-background-dark pt-4 pb-2 shadow-sm dark:shadow-none border-b border-transparent dark:border-white/5">
        <div className="px-4 flex items-center h-12 justify-between">
          <button
            onClick={handleCancel}
            className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {isInSuperset && currentExercise && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {currentExercise.groupType === 'superset' ? 'Superset' : 'Circuit'} {String.fromCharCode(65 + (groupExercises.findIndex((ex) => ex.id === currentExercise.id) || 0))}
              </span>
            )}
            {workoutTimerStartTime && (
              <WorkoutTimerDisplay />
            )}
          </div>
          <div className="flex w-16 items-center justify-end">
            <button
              onClick={handleSave}
              disabled={isSaveButtonDisabled}
              className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
        {selectedExercise && (
          <div className="px-4 pb-2">
            <h1 className="text-slate-900 dark:text-white tracking-tight text-[24px] font-bold leading-tight">
              {selectedExercise.name}
            </h1>
          </div>
        )}
        {/* Superset Navigation Cards */}
            {isInSuperset && currentExercise && groupExercises.length > 0 && currentExercise.groupType && currentExercise.groupType !== 'single' && (
              <SupersetNavigationCards
                currentExerciseId={currentExercise.id}
                groupExercises={groupExercises}
                groupType={currentExercise.groupType}
                onExerciseClick={onNavigateToExercise}
              />
            )}
      </header>

      <main className="flex flex-col gap-4 px-4 pt-2 flex-1 overflow-y-auto pb-24">
        {isLoadingExercise ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading exercise data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Exercise Selector - Only show when adding new exercise */}
            {!exerciseId && (
              <div className="py-6">
                <ExerciseSelectorDropdown
                  selectedExercise={selectedExercise}
                  onSelect={handleSelectExercise}
                  onCreateCustom={handleCreateCustom}
                  selectedCategory={selectedCategory}
                  selectedMuscleGroups={selectedMuscleGroups || []}
                />
                {validationErrors.exercise && (
                  <p className="text-xs text-error mt-1">{validationErrors.exercise}</p>
                )}
              </div>
            )}

            {/* Previous Workout Table */}
            {selectedExercise && exerciseId && selectedExercise.id ? (
              <PreviousWorkoutTable exerciseId={selectedExercise.id} />
            ) : null}

            {/* AI Insight Pill */}
            {selectedExercise && currentSet && (
              <div className="flex flex-wrap">
                <AIInsightPill insight="Try increasing weight by 2.5kg today" />
              </div>
            )}

            {/* Current Set Card */}
            {selectedExercise && currentSet && (
              <CurrentSetCard
                setNumber={currentSetNumber}
                set={currentSet}
                unit={profile?.preferredUnit || 'kg'}
                targetReps={undefined}
                previousWeight={
                  completedSets.length > 0
                    ? completedSets[completedSets.length - 1]?.weight
                    : undefined
                }
                onUpdate={(updates) => handleUpdateSet(currentSet.setNumber, updates)}
                onLogSet={handleLogCurrentSet}
                nextExerciseName={nextExercise?.exerciseName}
                isLastInSuperset={isLastInSuperset}
                showGroupRestMessage={isInSuperset && !!nextExercise && !isLastInSuperset}
              />
            )}

            {/* Group Rest Timer */}
            {isInSuperset && groupRestTimerVisible && (
              <GroupRestTimer
                duration={groupRestTimerDuration}
                onComplete={handleGroupRestComplete}
                onSkip={handleGroupRestSkip}
                isVisible={groupRestTimerVisible}
                groupType={currentExercise?.groupType && currentExercise.groupType !== 'single' ? currentExercise.groupType : 'superset'}
              />
            )}

            {/* Divider */}
            {completedSets.length > 0 && (
              <div className="h-px w-full bg-slate-200 dark:bg-white/10 my-2"></div>
            )}

            {/* Completed Sets List */}
            {selectedExercise && completedSets.length > 0 && (
              <div className="flex flex-col gap-3 pb-8">
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider px-2">
                  Completed Today ({selectedExercise.name})
                </h3>
                <AnimatePresence>
                  {completedSets.map((set) => (
                    <motion.div
                      key={set.setNumber}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <CompletedSetItem
                        set={set}
                        unit={profile?.preferredUnit || 'kg'}
                        onEdit={() => {
                          // Uncomplete set to edit
                          handleUpdateSet(set.setNumber, { completed: false });
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

          </>
        )}
      </main>

      {/* Rest Timer - Only show when not in superset or last exercise in superset */}
      {(!isInSuperset || isLastInSuperset) && (
        <RestTimer
          duration={restTimerRemaining}
          onComplete={handleRestComplete}
          onSkip={handleRestSkip}
          onPause={handleRestPause}
          onTimeAdjust={handleRestTimeAdjust}
          onRemainingTimeChange={handleRestRemainingTimeChange}
          isVisible={restTimerVisible && restTimerEnabled && !groupRestTimerVisible}
          initialPaused={restTimerPaused}
          initialRemainingTime={restTimerVisible ? restTimerRemaining : undefined}
        />
      )}

      {/* Save Confirmation Modal */}
      <Modal
        isOpen={showSaveConfirmModal}
        onClose={() => setShowSaveConfirmModal(false)}
        title="Unsaved Changes"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            You have unsaved changes. What would you like to do?
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowSaveConfirmModal(false)}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearLogExerciseState();
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
                setHasUnsavedChanges(false);
                setShowSaveConfirmModal(false);
                onClose();
              }}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={async () => {
                setShowSaveConfirmModal(false);
                await handleSave();
              }}
              className="flex-1 h-12 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

