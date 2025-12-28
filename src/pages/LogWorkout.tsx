import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Edit, Trash2, Loader2, BookOpen, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore, useWorkoutStore as getWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { ExerciseFilters } from '@/components/exercise/ExerciseFilters';
import { WorkoutTimerCard } from '@/components/exercise/WorkoutTimerCard';
import { ToastContainer } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { WorkoutExercise, ExerciseCategory, WorkoutSet } from '@/types/exercise';
import { MuscleGroupCategory } from '@/utils/muscleGroupCategories';
import { useNavigate, useLocation } from 'react-router-dom';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { cn } from '@/utils/cn';
import { useToast } from '@/hooks/useToast';
import { staggerContainer, slideUp, prefersReducedMotion } from '@/utils/animations';
import { templateService } from '@/services/templateService';
import { TemplateCategory } from '@/types/workout';
import { Workout } from '@/types/workout';
import { useWorkoutDuration, getTimerStartTime } from '@/hooks/useWorkoutDuration';
import { clearWorkoutState, loadWorkoutState, saveWorkoutState } from '@/utils/workoutStatePersistence';
import { saveFailedWorkout } from '@/utils/workoutErrorRecovery';
import { WorkoutErrorRecoveryModal } from '@/components/workout/WorkoutErrorRecoveryModal';
import { LogExercise } from '@/components/workout/LogExercise';
import { QuickCardioLog } from '@/components/workout/QuickCardioLog';
import { calculateVolume } from '@/utils/calculations';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

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
  const { currentWorkout, startWorkout, addExercise, removeExercise, finishWorkout, cancelWorkout, templateId, loadWorkouts } =
    useWorkoutStore();
  const { profile } = useUserStore();
  const { toasts, removeToast, success, error: showError } = useToast();

  // Modal state for LogExercise
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [showQuickCardioModal, setShowQuickCardioModal] = useState(false);

  // Workout-level modals
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showClearWorkoutModal, setShowClearWorkoutModal] = useState(false);
  const [showCancelWorkoutModal, setShowCancelWorkoutModal] = useState(false);
  const [showFinishWorkoutModal, setShowFinishWorkoutModal] = useState(false);
  const [showErrorRecoveryModal, setShowErrorRecoveryModal] = useState(false);
  const [workoutCalories, setWorkoutCalories] = useState<number | ''>('');
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('strength');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(null);
  // Manual timer inputs for template workouts
  const [manualStartTime, setManualStartTime] = useState<string>('');
  const [manualEndTime, setManualEndTime] = useState<string>('');
  const [manualDurationMinutes, setManualDurationMinutes] = useState<number | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<MuscleGroupCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const repeatWorkoutProcessedRef = useRef<string | null>(null);
  const shouldReduceMotion = prefersReducedMotion();

  // Workout duration tracking - timer state is managed internally and persisted to sessionStorage
  const { formattedTime: workoutDuration, elapsedTime: workoutElapsedSeconds, isRunning: workoutTimerRunning, pause: pauseWorkoutTimer, resume: resumeWorkoutTimer, reset: resetWorkoutTimer, start: startWorkoutTimer } = useWorkoutDuration(false);

  useEffect(() => {
    if (!currentWorkout && profile) {
      // Check if we have persisted workout state
      const persistedWorkoutState = loadWorkoutState();
      if (!persistedWorkoutState?.currentWorkout) {
        // Only start new workout if no persisted state exists
        startWorkout(profile.id);
      }
      // If persisted state exists, it will be loaded by the store initialization
    }
  }, [currentWorkout, profile, startWorkout]);

  // Auto-save workout state every 10 seconds when workout is active
  useEffect(() => {
    if (!currentWorkout) return;

    const autoSaveInterval = setInterval(() => {
      // Save current workout state to localStorage
      const storeState = getWorkoutStore.getState();
      saveWorkoutState({
        currentWorkout: storeState.currentWorkout,
        templateId: storeState.templateId || null,
        plannedWorkoutId: storeState.plannedWorkoutId || null,
      });
    }, 10000); // 10 seconds

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [currentWorkout]);

  // Timer will start when "Add Exercise" is clicked, not automatically

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
                // Create new sets preserving the previous workout's rep/weight scheme
                // Sets are uncompleted but keep the intended values from the template
                const newSets: WorkoutSet[] = prevExercise.sets.map((prevSet, index) => {
                  const baseSet: WorkoutSet = {
                    setNumber: index + 1,
                    completed: false,
                  };

                  // Preserve set data from previous workout (template's intended scheme)
                  switch (exerciseData.trackingType) {
                    case 'weight_reps':
                      return {
                        ...baseSet,
                        reps: prevSet.reps ?? 10, // Preserve reps from template
                        weight: prevSet.weight ?? 0, // Preserve weight from template
                        unit: prevSet.unit || profile?.preferredUnit || 'kg',
                        rpe: prevSet.rpe, // Preserve RPE if present
                      };
                    case 'reps_only':
                      return {
                        ...baseSet,
                        reps: prevSet.reps ?? 10, // Preserve reps from template
                        rpe: prevSet.rpe, // Preserve RPE if present
                      };
                    case 'cardio':
                      return {
                        ...baseSet,
                        distance: prevSet.distance ?? 0,
                        distanceUnit: prevSet.distanceUnit || 'km',
                        time: prevSet.time ?? 0,
                        calories: prevSet.calories,
                      };
                    case 'duration':
                      return {
                        ...baseSet,
                        duration: prevSet.duration ?? 0,
                      };
                    default:
                      return {
                        ...baseSet,
                        reps: prevSet.reps ?? 10,
                        weight: prevSet.weight ?? 0,
                        unit: prevSet.unit || profile?.preferredUnit || 'kg',
                        rpe: prevSet.rpe,
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


  const handleCategoryChange = (category: ExerciseCategory | null) => {
    setSelectedCategory(category);
    // When category changes, reset muscle group filters if they don't apply to the new category
    setSelectedMuscleGroups([]);
  };

  const handleMuscleGroupsChange = (groups: MuscleGroupCategory[]) => {
    setSelectedMuscleGroups(groups);
  };

  // Modal handlers
  const handleAddExercise = () => {
    // Start workout timer when "Add Exercise" is clicked (explicit start)
    startWorkoutTimer();
    setEditingExerciseId(null);
    setShowExerciseModal(true);
  };

  const handleEditExercise = (exercise: WorkoutExercise) => {
    setEditingExerciseId(exercise.id);
    setShowExerciseModal(true);
  };

  const handleCloseExerciseModal = () => {
    setShowExerciseModal(false);
    setEditingExerciseId(null);
  };

  const handleExerciseSaved = () => {
    // Exercise was saved, modal will close automatically
    // This callback can be used for any post-save actions if needed
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (window.confirm('Are you sure you want to remove this exercise from the workout?')) {
      try {
        removeExercise(exerciseId);
        success('Exercise removed successfully');
        if (editingExerciseId === exerciseId) {
          // Close modal if we're editing the deleted exercise
          setShowExerciseModal(false);
          setEditingExerciseId(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove exercise';
        showError(errorMessage);
        console.error('Error removing exercise:', err);
      }
    }
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
    setEditingExerciseId(null);
    setSelectedCategory(null);
    setSelectedMuscleGroups([]);
    setShowExerciseModal(false);
    resetWorkoutTimer();
    success('Workout cleared');
    if (profile) {
      startWorkout(profile.id);
    }
  };

  const handleCancelLogWorkout = () => {
    // Check if there's anything to cancel (exercises or timers running)
    const hasExercises = currentWorkout && currentWorkout.exercises.length > 0;
    const hasTimers = workoutTimerRunning || getTimerStartTime() !== null;

    if (hasExercises || hasTimers) {
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

    // Reset component state
    setEditingExerciseId(null);
    setSelectedCategory(null);
    setSelectedMuscleGroups([]);
    setShowExerciseModal(false);

    // Reset timer
    resetWorkoutTimer();

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
    
    // Initialize manual timer inputs if workout is from template
    if (templateId && currentWorkout.startTime) {
      const startTime = currentWorkout.startTime instanceof Date 
        ? currentWorkout.startTime 
        : new Date(currentWorkout.startTime);
      const endTime = new Date(); // Default to current time
      
      setManualStartTime(formatDateTimeLocal(startTime));
      setManualEndTime(formatDateTimeLocal(endTime));
      
      // Calculate duration from start to end
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / 60000);
      setManualDurationMinutes(durationMinutes > 0 ? durationMinutes : '');
    } else {
      // Clear manual inputs if not from template
      setManualStartTime('');
      setManualEndTime('');
      setManualDurationMinutes('');
    }
    
    setShowFinishWorkoutModal(true);
  };

  const handleConfirmFinishWorkout = async () => {
    if (!currentWorkout) return;

    // Validate manual timer inputs for template workouts
    if (templateId) {
      if (!manualStartTime || !manualEndTime) {
        showError('Please provide both start time and end time for template workouts');
        setIsSaving(false);
        return;
      }
      const start = new Date(manualStartTime);
      const end = new Date(manualEndTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showError('Invalid start or end time. Please check your inputs.');
        setIsSaving(false);
        return;
      }
      if (end.getTime() <= start.getTime()) {
        showError('End time must be after start time');
        setIsSaving(false);
        return;
      }
      
      // Validate consistency between manual duration and time difference
      if (manualDurationMinutes !== '') {
        const calculatedDuration = Math.round((end.getTime() - start.getTime()) / 60000);
        const manualDuration = Number(manualDurationMinutes);
        
        // Warn if durations don't match (allow 5 minute tolerance for user input)
        if (Math.abs(calculatedDuration - manualDuration) > 5) {
          showError(`Duration mismatch: Calculated ${calculatedDuration} minutes from times, but you entered ${manualDuration} minutes. Please verify your inputs.`);
          setIsSaving(false);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const calories = workoutCalories !== '' ? Number(workoutCalories) : undefined;
      
      // For template workouts, use manual timer inputs
      let durationSeconds: number | undefined = undefined;
      let manualStartTimeDate: Date | undefined = undefined;
      let manualEndTimeDate: Date | undefined = undefined;
      
      if (templateId && manualStartTime && manualEndTime) {
        manualStartTimeDate = new Date(manualStartTime);
        manualEndTimeDate = new Date(manualEndTime);
        
        if (manualDurationMinutes !== '') {
          // Use manual duration if provided
          durationSeconds = Number(manualDurationMinutes) * 60;
        } else {
          // Calculate duration from start and end times
          const durationMs = manualEndTimeDate.getTime() - manualStartTimeDate.getTime();
          durationSeconds = Math.round(durationMs / 1000);
        }
      }
      
      // Update workout startTime and endTime if manual times are provided
      if (manualStartTimeDate && manualEndTimeDate && currentWorkout) {
        // Update the workout in the store with manual times
        const updatedWorkout = {
          ...currentWorkout,
          startTime: manualStartTimeDate,
          endTime: manualEndTimeDate,
        };
        // We'll pass these to finishWorkout via a modified approach
        // Since finishWorkout doesn't accept startTime/endTime directly, we'll update the workout first
        useWorkoutStore.setState({ currentWorkout: updatedWorkout });
      }
      
      // Calculate start/end times from timer if not manually provided
      let workoutStartTime: Date | undefined = undefined;
      let workoutEndTime: Date = new Date();
      
      if (manualStartTimeDate && manualEndTimeDate) {
        // Use manual times if provided
        workoutStartTime = manualStartTimeDate;
        workoutEndTime = manualEndTimeDate;
      } else {
        // Calculate from timer state
        const timerStartTime = getTimerStartTime();
        if (timerStartTime) {
          workoutStartTime = timerStartTime;
          workoutEndTime = new Date();
        }
      }
      
      // Update workout with calculated start/end times
      if (workoutStartTime && currentWorkout) {
        const updatedWorkout = {
          ...currentWorkout,
          startTime: workoutStartTime,
          endTime: workoutEndTime,
        };
        useWorkoutStore.setState({ currentWorkout: updatedWorkout });
      }
      
      // PRIORITY: Use manual duration for template workouts, otherwise use timer
      // This ensures workout is saved with accurate duration
      const finalDurationSeconds = durationSeconds !== undefined ? durationSeconds : workoutElapsedSeconds;
      await finishWorkout(calories, finalDurationSeconds > 0 ? finalDurationSeconds : undefined);
      
      // Get the saved workout ID from the store
      const savedWorkouts = getWorkoutStore.getState().workouts;
      const savedWorkout = savedWorkouts[0]; // Most recent workout
      const workoutId = savedWorkout?.id;
      
      // Reset timer when workout is finished
      resetWorkoutTimer();
      
      // Clear persisted state (already cleared in finishWorkout, but ensure it's cleared)
      clearWorkoutState();
      
      // Reset component state
      setEditingExerciseId(null);
      setSelectedCategory(null);
      setSelectedMuscleGroups([]);
      setShowExerciseModal(false);
      setWorkoutCalories('');
      setManualStartTime('');
      setManualEndTime('');
      setManualDurationMinutes('');
      setShowFinishWorkoutModal(false);
      success('Workout saved successfully!');
      
      // Navigate to workout summary if we have a workout ID, otherwise go home
      if (workoutId) {
        navigate(`/workout-summary/${workoutId}`);
      } else {
        navigate('/home');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save workout';
      console.error('Error finishing workout:', err);
      
      // Save failed workout to localStorage for recovery
      try {
        const calories = workoutCalories !== '' ? Number(workoutCalories) : undefined;
        const now = new Date();
        
        // Use timer duration if available, otherwise calculate from startTime
        let totalDurationMinutes = 0;
        if (workoutElapsedSeconds > 0) {
          totalDurationMinutes = Math.min(1440, Math.round(workoutElapsedSeconds / 60));
        } else if (currentWorkout.startTime) {
          const startTime = currentWorkout.startTime instanceof Date 
            ? currentWorkout.startTime 
            : new Date(currentWorkout.startTime);
          const durationMs = now.getTime() - startTime.getTime();
          totalDurationMinutes = Math.max(0, Math.min(1440, Math.round(durationMs / 60000)));
        }
        
        // Create workout for recovery
        const workoutForRecovery: Workout = {
          ...currentWorkout,
          startTime: currentWorkout.startTime instanceof Date 
            ? currentWorkout.startTime 
            : new Date(currentWorkout.startTime),
          endTime: now,
          totalDuration: totalDurationMinutes,
          calories: calories !== undefined ? calories : currentWorkout.calories,
        };
        
        // Save to error recovery system
        saveFailedWorkout(workoutForRecovery, err instanceof Error ? err : new Error(errorMessage));
        
        // Show error recovery modal
        setShowFinishWorkoutModal(false);
        setShowErrorRecoveryModal(true);
        
        showError(
          `Failed to save workout: ${errorMessage}. ` +
          `Your workout has been saved for recovery. Please review and retry.`
        );
      } catch (recoveryErr) {
        console.error('Failed to save workout for recovery:', recoveryErr);
        showError(
          `Failed to save workout: ${errorMessage}. ` +
          `Unable to save for recovery. Please try again.`
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const existingExercises = currentWorkout?.exercises || [];

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
            Log Workout
          </h2>
          {currentTemplateName && (
            <p className="text-xs text-primary mt-0.5 flex items-center justify-center gap-1">
              <BookOpen className="w-3 h-3" />
              {currentTemplateName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {existingExercises.length === 0 && (
            <button
              onClick={handleUseTemplate}
              className="flex h-10 px-3 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Use Template"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}
          {existingExercises.length > 0 && (
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
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Existing Exercises List */}
        {existingExercises.length > 0 && (
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
                {existingExercises.map((exercise) => {
                  // Group exercises by groupId for superset/circuit display
                  const isGrouped = exercise.groupId && exercise.groupType && exercise.groupType !== 'single';
                  const groupExercises = isGrouped 
                    ? existingExercises.filter(e => e.groupId === exercise.groupId)
                    : [exercise];
                  const isFirstInGroup = isGrouped && exercise.groupOrder === 0;
                  
                  // Only render if first in group or not grouped
                  if (isGrouped && !isFirstInGroup) return null;
                  
                  return (
                    <motion.div
                      key={exercise.id}
                      className={cn(
                        "flex flex-col rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-[#316847] overflow-hidden",
                        isGrouped && "mb-2"
                      )}
                      variants={shouldReduceMotion ? {} : slideUp}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                    >
                      {isGrouped && (
                        <div className="px-3 py-1.5 bg-primary/10 dark:bg-primary/20 border-b border-primary/20">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">
                            {exercise.groupType === 'superset' ? 'Superset' : 'Circuit'}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          {isGrouped ? (
                            <div className="space-y-2">
                              {groupExercises.map((groupEx) => (
                                <div key={groupEx.id} className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                      {groupEx.exerciseName}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {groupEx.sets.length} set{groupEx.sets.length !== 1 ? 's' : ''} •{' '}
                                      {groupEx.sets.filter((s) => s.completed).length} completed
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2">
                                    <motion.button
                                      onClick={() => handleEditExercise(groupEx)}
                                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                      aria-label="Edit exercise"
                                      whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                                      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </motion.button>
                                    <motion.button
                                      onClick={() => handleDeleteExercise(groupEx.id)}
                                      className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                                      aria-label="Delete exercise"
                                      whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
                                      whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </motion.button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {exercise.exerciseName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {exercise.sets.length} set{exercise.sets.length !== 1 ? 's' : ''} •{' '}
                                {exercise.sets.filter((s) => s.completed).length} completed
                              </p>
                            </>
                          )}
                        </div>
                        {!isGrouped && (
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
                        )}
                      </div>
                    </motion.div>
                  );
                })}
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
          isVisible={workoutTimerRunning || getTimerStartTime() !== null}
          isRunning={workoutTimerRunning}
          onPause={pauseWorkoutTimer}
          onResume={resumeWorkoutTimer}
          onReset={resetWorkoutTimer}
        />

        {/* Add Exercise Buttons */}
        <div className="px-4 py-6 space-y-3">
          <motion.button
            onClick={handleAddExercise}
            className="w-full py-4 flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 active:bg-primary/30 transition-colors border-2 border-dashed border-primary/50"
            whileHover={!shouldReduceMotion ? { scale: 1.02 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.98 } : {}}
          >
            <Plus className="w-5 h-5" />
            Add Exercise
          </motion.button>
          <motion.button
            onClick={() => setShowQuickCardioModal(true)}
            className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 font-bold hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors border-2 border-dashed border-blue-500/50"
            whileHover={!shouldReduceMotion ? { scale: 1.02 } : {}}
            whileTap={!shouldReduceMotion ? { scale: 0.98 } : {}}
          >
            <Plus className="w-4 h-4" />
            Quick Cardio Log
          </motion.button>
        </div>

        <div className="h-24"></div>
      </main>

      {/* LogExercise Modal with Error Boundary */}
      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
            <div className="max-w-md w-full bg-surface-light dark:bg-surface-dark rounded-xl p-6 text-center">
              <p className="text-error mb-4">An error occurred while loading the exercise editor.</p>
              <button
                onClick={handleCloseExerciseModal}
                className="px-4 py-2 bg-primary text-background-dark rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        }
        onError={(error, errorInfo) => {
          console.error('LogExercise error:', error, errorInfo);
        }}
      >
        <LogExercise
          isOpen={showExerciseModal}
          onClose={handleCloseExerciseModal}
          exerciseId={editingExerciseId}
          selectedCategory={selectedCategory}
          selectedMuscleGroups={selectedMuscleGroups}
          onCategoryChange={handleCategoryChange}
          onMuscleGroupsChange={handleMuscleGroupsChange}
          onExerciseSaved={handleExerciseSaved}
          onStartWorkoutTimer={startWorkoutTimer}
          onNavigateToExercise={(exerciseId) => {
            // Close current modal and open next exercise
            setShowExerciseModal(false);
            setTimeout(() => {
              setEditingExerciseId(exerciseId);
              setShowExerciseModal(true);
            }, 100);
          }}
        />
      </ErrorBoundary>

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
          {existingExercises.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-bold">{existingExercises.length}</span> exercise{existingExercises.length !== 1 ? 's' : ''} will be removed.
              </p>
              {(workoutTimerRunning || getTimerStartTime() !== null) && (
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
                {/* Manual Timer Inputs for Template Workouts */}
                {templateId && (
                  <div className="mb-6 space-y-4 text-left">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Time <span className="text-gray-500 dark:text-gray-400">(required)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={manualStartTime}
                        onChange={(e) => {
                          setManualStartTime(e.target.value);
                          // Auto-update duration if end time is set
                          if (manualEndTime) {
                            const start = new Date(e.target.value);
                            const end = new Date(manualEndTime);
                            const durationMs = end.getTime() - start.getTime();
                            const durationMinutes = Math.round(durationMs / 60000);
                            setManualDurationMinutes(durationMinutes > 0 ? durationMinutes : '');
                          }
                        }}
                        className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] h-10 px-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Time <span className="text-gray-500 dark:text-gray-400">(required)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={manualEndTime}
                        onChange={(e) => {
                          setManualEndTime(e.target.value);
                          // Auto-update duration if start time is set
                          if (manualStartTime) {
                            const start = new Date(manualStartTime);
                            const end = new Date(e.target.value);
                            const durationMs = end.getTime() - start.getTime();
                            const durationMinutes = Math.round(durationMs / 60000);
                            setManualDurationMinutes(durationMinutes > 0 ? durationMinutes : '');
                          }
                        }}
                        className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] h-10 px-3 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Duration <span className="text-gray-500 dark:text-gray-400">(minutes, optional - auto-calculated)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1440"
                        value={manualDurationMinutes}
                        onChange={(e) => {
                          const minutes = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0);
                          setManualDurationMinutes(minutes);
                          // Auto-update end time if start time is set
                          if (manualStartTime && minutes !== '') {
                            const start = new Date(manualStartTime);
                            const end = new Date(start.getTime() + Number(minutes) * 60000);
                            setManualEndTime(formatDateTimeLocal(end));
                          }
                        }}
                        placeholder="Auto-calculated from start/end times"
                        className="w-full rounded-lg bg-white dark:bg-[#224932] border border-gray-300 dark:border-[#316847] text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#1c2e24] h-10 px-3 text-sm"
                      />
                    </div>
                  </div>
                )}
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
                    disabled={isSaving || (!!templateId && (!manualStartTime || !manualEndTime))}
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
                      setManualStartTime('');
                      setManualEndTime('');
                      setManualDurationMinutes('');
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

      {/* Quick Cardio Log Modal */}
      <QuickCardioLog
        isOpen={showQuickCardioModal}
        onClose={() => setShowQuickCardioModal(false)}
        onSaved={() => {
          setShowQuickCardioModal(false);
          if (profile) {
            loadWorkouts(profile.id);
          }
        }}
      />

      {/* Workout Error Recovery Modal */}
      <WorkoutErrorRecoveryModal
        isOpen={showErrorRecoveryModal}
        onClose={async () => {
          setShowErrorRecoveryModal(false);
          // Check if there are still failed workouts
          const { getFailedWorkouts } = await import('@/utils/workoutErrorRecovery');
          const failed = getFailedWorkouts();
          if (failed.length === 0) {
            // All workouts recovered, navigate home
            navigate('/home');
          }
        }}
        onWorkoutRecovered={(_workoutId) => {
          // Reload workouts in store
          if (profile) {
            loadWorkouts(profile.id);
          }
        }}
      />

      {/* Finish Workout Button - Fixed at bottom when exercises exist */}
      {existingExercises.length > 0 && (
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

// Default export for lazy loading compatibility
export default LogWorkout;
