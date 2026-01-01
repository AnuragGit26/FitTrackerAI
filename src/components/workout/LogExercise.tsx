import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Loader2, ArrowLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { RestTimer } from '@/components/exercise/RestTimer';
import { CurrentSetCard } from '@/components/exercise/CurrentSetCard';
import { CardioSetCard } from '@/components/exercise/CardioSetCard';
import { HIITSetCard } from '@/components/exercise/HIITSetCard';
import { YogaSetCard } from '@/components/exercise/YogaSetCard';
import { CompletedSetItem } from '@/components/exercise/CompletedSetItem';
import { SupersetNavigationCards } from '@/components/exercise/SupersetNavigationCards';
import { GroupRestTimer } from '@/components/exercise/GroupRestTimer';
import { PreviousWorkoutTable } from '@/components/exercise/PreviousWorkoutTable';
import { WorkoutTimerDisplay } from '@/components/exercise/WorkoutTimerDisplay';
import { AIInsightPill } from '@/components/exercise/AIInsightPill';
import { Exercise, WorkoutExercise, WorkoutSet, ExerciseCategory } from '@/types/exercise';
import { MuscleGroup } from '@/types/muscle';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { getMuscleMapping } from '@/services/muscleMapping';
import { calculateVolume, calculateNextSetByVolume } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useToast } from '@/hooks/useToast';
import { validateNotes, validateSet, validateReps, validateWeight } from '@/utils/validators';
import { sanitizeNotes } from '@/utils/sanitize';
import { prefersReducedMotion } from '@/utils/animations';
import { useSetDuration } from '@/hooks/useSetDuration';
import { useSettingsStore } from '@/store/settingsStore';
import { saveLogWorkoutState, saveLogExerciseState, loadLogExerciseState, clearLogExerciseState, saveWorkoutState } from '@/utils/workoutStatePersistence';
import { trapFocus, restoreFocus } from '@/utils/accessibility';
import { supersetService, SupersetGroup } from '@/services/supersetService';
import { Modal } from '@/components/common/Modal';
import { detectHIIT } from '@/utils/exerciseHelpers';

// Constants
const MODAL_CLOSE_DELAY = 500; // ms

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
  const { currentWorkout, addExercise, updateExercise, startWorkout } = useWorkoutStore();
  const { profile } = useUserStore();
  const { success, error: showError } = useToast();
  const { settings } = useSettingsStore();

  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState('');
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingExercise, setIsLoadingExercise] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [justCompletedSetNumber, setJustCompletedSetNumber] = useState<number | null>(null);
  const [showCancelSetModal, setShowCancelSetModal] = useState(false);
  const [setToCancelNumber, setSetToCancelNumber] = useState<number | null>(null);
  const [showMinimumSetWarning, setShowMinimumSetWarning] = useState(false);

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
          const workoutExercise = (workout.exercises ?? []).find((ex) => ex.id === exerciseId);
          if (!workoutExercise) {
            showError('Exercise no longer exists in workout');
            handleForceClose();
            return;
          }

          const exerciseData = await exerciseLibrary.getExerciseById(workoutExercise.exerciseId);
          if (exerciseData) {
            const loadedSets = (workoutExercise.sets ?? []).map((set, index) => ({
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
            rpe: 7.5,
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
    restTimerEnabled: false, // Will be set from settings.autoStartRestTimer
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
      restTimerEnabled: settings.autoStartRestTimer,
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
    
    setSets((prevSets) => {
      const newSetNumber = prevSets.length + 1;
      // Get the last COMPLETED set to inherit values from it (prefer completed over incomplete)
      const lastCompletedSet = [...prevSets].reverse().find((s) => s.completed);
      const lastSet = prevSets[prevSets.length - 1];
      
      let newSet: WorkoutSet;
      switch (trackingType) {
        case 'weight_reps': {
          const previousSet = lastCompletedSet ?? lastSet;
          const unit = (previousSet?.unit ?? (profile?.preferredUnit || 'kg')) as 'kg' | 'lbs';
          const { weight, reps } = calculateNextSetByVolume(previousSet, unit);
          newSet = {
            setNumber: newSetNumber,
            reps,
            weight,
            unit,
            rpe: previousSet?.rpe ?? 7.5,
            completed: false,
          };
          break;
        }
        case 'reps_only':
          newSet = {
            setNumber: newSetNumber,
            reps: lastCompletedSet?.reps ?? lastSet?.reps ?? 10,
            rpe: lastCompletedSet?.rpe ?? lastSet?.rpe ?? 7.5,
            completed: false,
          };
          break;
        case 'cardio':
          newSet = {
            setNumber: newSetNumber,
            distance: lastCompletedSet?.distance ?? lastSet?.distance ?? 0,
            distanceUnit: lastCompletedSet?.distanceUnit ?? lastSet?.distanceUnit ?? 'km',
            time: lastCompletedSet?.time ?? lastSet?.time ?? 0,
            calories: lastCompletedSet?.calories,
            completed: false,
          };
          break;
        case 'duration':
          newSet = {
            setNumber: newSetNumber,
            duration: lastCompletedSet?.duration ?? lastSet?.duration ?? 0,
            completed: false,
          };
          break;
        default: {
          const previousSet = lastCompletedSet ?? lastSet;
          const unit = (previousSet?.unit ?? (profile?.preferredUnit || 'kg')) as 'kg' | 'lbs';
          const { weight, reps } = calculateNextSetByVolume(previousSet, unit);
          newSet = {
            setNumber: newSetNumber,
            reps,
            weight,
            unit,
            rpe: previousSet?.rpe ?? 7.5,
            completed: false,
          };
        }
      }
      
      return [...prevSets, newSet];
    });

    setValidationErrors((prev) => ({ ...prev, sets: '' }));

    // Start tracking the new set (if previous set was completed, or if this is the first set)
    const lastSet = sets[sets.length - 1];
    if (!lastSet || lastSet.completed) {
      currentSetStartTimeRef.current = new Date();
      startSet();
    }
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
            if (settings.autoStartRestTimer) {
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

  const validateForm = (): { isValid: boolean; errorMessage: string | null } => {
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
        const completedSets = (sets ?? []).filter((s) => s.completed);
        const incompleteSets = (sets ?? []).filter((s) => !s.completed);

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
    const isValid = Object.keys(errors).length === 0;
    
    // Get the first error message (prioritize sets, then exercise, then notes)
    const errorMessage = errors.sets || errors.exercise || errors.notes || null;
    
    return { isValid, errorMessage };
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedExercise) {
      showError('Please select an exercise');
      return;
    }

    const validationResult = validateForm();
    
    if (!validationResult.isValid) {
      // Show specific validation error message if available, otherwise show generic message
      const errorMessage = validationResult.errorMessage || 'Please fix validation errors before saving';
      showError(errorMessage);
      return;
    }

    // Ensure workout exists - start one if it doesn't
    let workout = currentWorkout;
    if (!workout) {
      if (!profile) {
        showError('Please log in to save exercises');
        return;
      }
      try {
        await startWorkout(profile.id);
        // Get the updated workout from the store
        workout = useWorkoutStore.getState().currentWorkout;
        if (!workout) {
          showError('Failed to start workout. Please try again.');
          return;
        }
      } catch (error) {
        showError('Failed to start workout. Please try again.');
        console.error('Error starting workout:', error);
        return;
      }
    }

    setIsSaving(true);
    setValidationErrors({});

    try {
      const muscleMapping = getMuscleMapping(selectedExercise.name);
      let musclesWorked: MuscleGroup[] = muscleMapping
        ? [...muscleMapping.primary, ...muscleMapping.secondary]
        : [...(selectedExercise.primaryMuscles || []), ...(selectedExercise.secondaryMuscles || [])];
      
      // Ensure we have at least some muscles - fallback to a default if empty
      if (musclesWorked.length === 0) {
        console.warn(`No muscles found for exercise "${selectedExercise.name}", using default`);
        musclesWorked = [MuscleGroup.CHEST]; // Default fallback
      }

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

      // Use the workout that was already ensured to exist above
      // Get the latest workout state to ensure we have the most up-to-date version
      const latestWorkout = useWorkoutStore.getState().currentWorkout;
      if (!latestWorkout) {
        // If workout is still null after starting, something went wrong
        showError('Workout not available. Please try again.');
        return;
      }

      if (exerciseId) {
        updateExercise(exerciseId, workoutExercise);
        success('Exercise updated successfully');
      } else {
        addExercise(workoutExercise);
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

  // Handle logging current set - ONLY completes the current set
  const handleLogCurrentSet = async () => {
    if (!selectedExercise) return;

    const setToComplete = currentSet;
    
    // Ensure we have a set to complete
    if (!setToComplete || setToComplete.completed) {
      console.error('No set to complete');
      return;
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
    
    // Trigger completion animation - ensure it triggers properly
    setJustCompletedSetNumber(null); // Reset first to ensure animation triggers
    // Use requestAnimationFrame to ensure state update happens after render
    requestAnimationFrame(() => {
      setJustCompletedSetNumber(setToComplete.setNumber);
      // Keep animation state longer for better visibility
      setTimeout(() => {
        setJustCompletedSetNumber(null);
      }, 1500);
    });

    // If in superset and has next exercise, show group rest timer
    if (isInSuperset && nextExercise && !isLastInSuperset) {
      setGroupRestTimerVisible(true);
      // Don't navigate yet - wait for timer to complete
    } else if (isInSuperset && isLastInSuperset) {
      // Last exercise in superset - show regular rest timer
      if (settings.autoStartRestTimer) {
        setRestTimerRemaining(defaultRestDuration);
        setRestTimerStartTime(new Date());
        setRestTimerOriginalDuration(defaultRestDuration);
        setRestTimerVisible(true);
      }
    } else {
      // Not in superset - show regular rest timer
      if (settings.autoStartRestTimer) {
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

  // Handle canceling/deleting a set (completed or current)
  const handleCancelSet = (setNumber: number) => {
    const setToCancel = sets.find((s) => s.setNumber === setNumber);
    if (!setToCancel) {
      return;
    }

    // Validate: ensure at least one set remains
    if (sets.length <= 1) {
      setShowMinimumSetWarning(true);
      return;
    }

    // Show confirmation modal
    setSetToCancelNumber(setNumber);
    setShowCancelSetModal(true);
  };

  // Confirm and actually delete the set
  const handleConfirmCancelSet = () => {
    if (setToCancelNumber === null) return;

    const setToDelete = sets.find((s) => s.setNumber === setToCancelNumber);
    if (!setToDelete) {
      setShowCancelSetModal(false);
      setSetToCancelNumber(null);
      return;
    }

    // Delete set from local state and re-index
    const updatedSets = sets
      .filter((s) => s.setNumber !== setToCancelNumber)
      .map((set, index) => ({
        ...set,
        setNumber: index + 1,
      }));

    // Handle two scenarios:
    // 1. New exercise (no exerciseId): Update local state only
    // 2. Existing exercise (has exerciseId): Update both store and local state
    if (exerciseId && currentWorkout) {
      // Calculate new volume after deletion
      const totalVolume = calculateVolume(updatedSets);
      
      // Update exercise with new sets array and recalculated volume
      updateExercise(exerciseId, {
        sets: updatedSets,
        totalVolume,
      });
      
      // Manually save workout state since updateExercise doesn't persist
      const { templateId, plannedWorkoutId } = useWorkoutStore.getState();
      const updatedWorkout = useWorkoutStore.getState().currentWorkout;
      if (updatedWorkout) {
        saveWorkoutState({ 
          currentWorkout: updatedWorkout, 
          templateId, 
          plannedWorkoutId 
        });
      }
    }

    // Update local state
    setSets(updatedSets);

    // Clear animation state
    if (justCompletedSetNumber === setToCancelNumber) {
      setJustCompletedSetNumber(null);
    }

    // Reset set duration tracking if this was the current set
    if (currentSet && currentSet.setNumber === setToCancelNumber) {
      resetSetDuration();
      currentSetStartTimeRef.current = new Date();
      startSet();
    }

    // Close modal and reset state
    setShowCancelSetModal(false);
    setSetToCancelNumber(null);
    success('Set deleted');
  };

  const hasIncompleteSets = sets.length > 0 && sets.some((set) => !set.completed);
  const isSaveButtonDisabled = !selectedExercise || sets.length === 0 || isSaving || hasIncompleteSets;

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
  const groupRestTimerDuration = 45; // Default 45s

  // Workout timer access
  const workoutTimerStartTime = useWorkoutStore((state) => state.workoutTimerStartTime);

  // Current set (first incomplete set only - don't return completed sets)
  const currentSet = useMemo(() => {
    return sets.find((set) => !set.completed) || null;
  }, [sets]);

  const currentSetNumber = useMemo(() => {
    if (currentSet) return currentSet.setNumber;
    return sets.length + 1;
  }, [currentSet, sets.length]);

  const completedSets = useMemo(() => {
    return (sets ?? []).filter((set) => set.completed);
  }, [sets]);

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
      style={{ 
        WebkitOverflowScrolling: 'touch',
        height: '100dvh', // Dynamic viewport height for mobile
        minHeight: 0, // Critical: allows flex children to shrink properly
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-20 flex flex-col gap-2 bg-background-light dark:bg-background-dark pt-4 pb-2 shadow-sm dark:shadow-none border-b border-transparent dark:border-white/5 min-w-0">
        <div className="px-4 flex items-center h-12 justify-between min-w-0 gap-2">
          <button
            onClick={handleCancel}
            className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -ml-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
            {isInSuperset && currentExercise && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap shrink-0">
                {currentExercise.groupType === 'superset' ? 'Superset' : 'Circuit'} {String.fromCharCode(65 + (groupExercises.findIndex((ex) => ex.id === currentExercise.id) || 0))}
              </span>
            )}
            {workoutTimerStartTime && (
              <WorkoutTimerDisplay />
            )}
          </div>
          <div className="flex items-center justify-end shrink-0">
            <button
              onClick={() => {
                if (!isSaveButtonDisabled) {
                  handleSave();
                }
              }}
              disabled={isSaveButtonDisabled}
              className="text-primary text-base font-bold leading-normal tracking-[0.015em] shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isSaving ? 'Saving...' : 'Finish'}
            </button>
          </div>
        </div>
        {selectedExercise && (
          <div className="px-4 pb-2 min-w-0">
            <h1 className="text-slate-900 dark:text-white tracking-tight text-[24px] font-bold leading-tight truncate">
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

      <main 
        className="flex flex-col gap-4 px-4 pt-2 flex-1 overflow-y-auto min-w-0" 
        style={{ 
          paddingBottom: 'max(12rem, env(safe-area-inset-bottom, 0px) + 12rem)',
          scrollPaddingBottom: 'max(12rem, env(safe-area-inset-bottom, 0px) + 12rem)',
          minHeight: 0, // Critical: allows flex child to shrink and enable scrolling
        }}
      >
        <div className="flex flex-col gap-4" style={{ minHeight: 'max-content' }}>
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

            {/* AI Insight Pill - Only show for strength exercises */}
            {selectedExercise && currentSet && (() => {
              const isCardio = selectedExercise.category === 'cardio';
              const isHIIT = detectHIIT(selectedExercise);
              const isYoga = selectedExercise.category === 'flexibility';
              
              // Only show weight-related tip for strength exercises (not cardio, HIIT, or yoga)
              if (isCardio || isHIIT || isYoga) {
                return null; // Don't show weight tip for cardio/HIIT/yoga
              }
              
              return (
                <div className="flex flex-wrap">
                  <AIInsightPill insight="Try increasing weight by 2.5kg today" />
                </div>
              );
            })()}

            {/* Current Set Card - Conditionally render based on exercise category */}
            {selectedExercise && currentSet && (() => {
              const isCardio = selectedExercise.category === 'cardio';
              const isYoga = selectedExercise.category === 'flexibility';
              const isHIIT = detectHIIT(selectedExercise);
              
              // Render HIIT card if detected
              if (isHIIT) {
                return (
                  <HIITSetCard
                    setNumber={currentSetNumber}
                    set={currentSet}
                    onUpdate={(updates) => handleUpdateSet(currentSet.setNumber, updates)}
                    onLogSet={handleLogCurrentSet}
                    onAddSet={handleAddSet}
                    onCancelSet={() => handleCancelSet(currentSet.setNumber)}
                    nextExerciseName={nextExercise?.exerciseName}
                    isLastInSuperset={isLastInSuperset}
                    showGroupRestMessage={isInSuperset && !!nextExercise && !isLastInSuperset}
                  />
                );
              }
              
              // Render Cardio card for cardio exercises
              if (isCardio) {
                return (
                  <CardioSetCard
                    setNumber={currentSetNumber}
                    set={currentSet}
                    onUpdate={(updates) => handleUpdateSet(currentSet.setNumber, updates)}
                    onLogSet={handleLogCurrentSet}
                    onAddSet={handleAddSet}
                    onCancelSet={() => handleCancelSet(currentSet.setNumber)}
                    nextExerciseName={nextExercise?.exerciseName}
                    isLastInSuperset={isLastInSuperset}
                    showGroupRestMessage={isInSuperset && !!nextExercise && !isLastInSuperset}
                  />
                );
              }
              
              // Render Yoga card for flexibility exercises
              if (isYoga) {
                return (
                  <YogaSetCard
                    setNumber={currentSetNumber}
                    set={currentSet}
                    onUpdate={(updates) => handleUpdateSet(currentSet.setNumber, updates)}
                    onLogSet={handleLogCurrentSet}
                    onAddSet={handleAddSet}
                    onCancelSet={() => handleCancelSet(currentSet.setNumber)}
                    nextExerciseName={nextExercise?.exerciseName}
                    isLastInSuperset={isLastInSuperset}
                    showGroupRestMessage={isInSuperset && !!nextExercise && !isLastInSuperset}
                  />
                );
              }
              
              // Default to strength CurrentSetCard
              return (
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
                  onAddSet={handleAddSet}
                  onCancelSet={() => handleCancelSet(currentSet.setNumber)}
                  nextExerciseName={nextExercise?.exerciseName}
                  isLastInSuperset={isLastInSuperset}
                  showGroupRestMessage={isInSuperset && !!nextExercise && !isLastInSuperset}
                  exerciseEquipment={selectedExercise?.equipment}
                />
              );
            })()}

            {/* Add Set Button - Show when all sets are completed */}
            {selectedExercise && !currentSet && completedSets.length > 0 && (
              <div className="py-4">
                <motion.button
                  onClick={handleAddSet}
                  className="flex w-full items-center justify-center gap-2 rounded-xl h-12 border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold transition-all active:scale-[0.98]"
                  whileHover={!shouldReduceMotion ? { scale: 1.02 } : {}}
                  whileTap={!shouldReduceMotion ? { scale: 0.98 } : {}}
                >
                  <span className="text-sm font-semibold tracking-wide">Add Set</span>
                </motion.button>
              </div>
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
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: justCompletedSetNumber === set.setNumber && !shouldReduceMotion ? [1, 1.05, 1] : 1,
                      }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ 
                        duration: justCompletedSetNumber === set.setNumber ? 0.4 : 0.2,
                        ease: 'easeOut'
                      }}
                    >
                      <CompletedSetItem
                        set={set}
                        unit={profile?.preferredUnit || 'kg'}
                        isJustCompleted={justCompletedSetNumber === set.setNumber}
                        onEdit={() => {
                          // Uncomplete set to edit
                          handleUpdateSet(set.setNumber, { completed: false });
                        }}
                        onCancel={() => handleCancelSet(set.setNumber)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

          </>
        )}
        </div>
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
          isVisible={restTimerVisible && settings.autoStartRestTimer && !groupRestTimerVisible}
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

      {/* Cancel Set Confirmation Modal */}
      <Modal
        isOpen={showCancelSetModal}
        onClose={() => {
          setShowCancelSetModal(false);
          setSetToCancelNumber(null);
        }}
        title="Delete Set"
      >
        <div className="space-y-4">
          {setToCancelNumber !== null && (() => {
            const setToDelete = sets.find((s) => s.setNumber === setToCancelNumber);
            if (!setToDelete) return null;

            const isCardio = setToDelete.distance !== undefined || setToDelete.time !== undefined;
            const isHIIT = setToDelete.workDuration !== undefined || setToDelete.rounds !== undefined;
            const isYoga = setToDelete.duration !== undefined && !setToDelete.weight && !setToDelete.reps && !setToDelete.distance;

            const formatTime = (seconds: number): string => {
              const mins = Math.floor(seconds / 60);
              const secs = seconds % 60;
              return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            return (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete Set {setToCancelNumber}? This action cannot be undone.
                </p>
                <div className="bg-slate-50 dark:bg-[#102217] rounded-lg p-4 border border-slate-200 dark:border-white/10">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Set Details:</p>
                  {isCardio && (
                    <div className="text-slate-900 dark:text-white">
                      <p className="font-medium">
                        {setToDelete.distance || 0} {setToDelete.distanceUnit || 'km'}
                        {setToDelete.time ? ` • ${formatTime(setToDelete.time)}` : ''}
                      </p>
                      {setToDelete.calories && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{setToDelete.calories} calories</p>
                      )}
                    </div>
                  )}
                  {isHIIT && (
                    <div className="text-slate-900 dark:text-white">
                      <p className="font-medium">
                        {setToDelete.rounds || 1} round{setToDelete.rounds !== 1 ? 's' : ''}
                        {setToDelete.workDuration ? ` • ${formatTime(setToDelete.workDuration)} work` : ''}
                      </p>
                    </div>
                  )}
                  {isYoga && (
                    <div className="text-slate-900 dark:text-white">
                      <p className="font-medium">
                        {setToDelete.duration ? formatTime(setToDelete.duration) : '0:00'}
                      </p>
                    </div>
                  )}
                  {!isCardio && !isHIIT && !isYoga && (
                    <div className="text-slate-900 dark:text-white">
                      <p className="font-medium">
                        {setToDelete.weight || 0}{setToDelete.unit || 'kg'} × {setToDelete.reps || 0} reps
                      </p>
                      {setToDelete.rpe && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">RPE {setToDelete.rpe.toFixed(1)}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowCancelSetModal(false);
                setSetToCancelNumber(null);
              }}
              className="flex-1 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCancelSet}
              className="flex-1 h-12 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Delete Set
            </button>
          </div>
        </div>
      </Modal>

      {/* Minimum Set Warning Modal */}
      <Modal
        isOpen={showMinimumSetWarning}
        onClose={() => setShowMinimumSetWarning(false)}
        title="Cannot Delete Set"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-gray-900 dark:text-white font-medium mb-1">
                At least one set is required
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A workout exercise must have at least one set. Please add another set before deleting this one.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMinimumSetWarning(false)}
            className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-colors"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}

