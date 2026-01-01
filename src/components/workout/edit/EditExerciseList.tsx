import { useState } from 'react';
import { WorkoutExercise } from '@/types/exercise';
import { EditExerciseItem } from './EditExerciseItem';
import { ExerciseSelectorDropdown } from '@/components/exercise/ExerciseSelectorDropdown';
import { Exercise } from '@/types/exercise';
import { exerciseLibrary } from '@/services/exerciseLibrary';
import { useToast } from '@/hooks/useToast';
import { calculateVolume } from '@/utils/calculations';

interface EditExerciseListProps {
  exercises: WorkoutExercise[];
  onExercisesChange: (exercises: WorkoutExercise[]) => void;
}

export function EditExerciseList({ exercises, onExercisesChange }: EditExerciseListProps) {
  const { error: showError } = useToast();
  const [showAddExercise, setShowAddExercise] = useState(false);

  const handleAddExercise = async (exercise: Exercise) => {
    try {
      // Get exercise details to determine tracking type
      const exerciseData = await exerciseLibrary.getExerciseById(exercise.id);
      if (!exerciseData) {
        showError('Exercise not found');
        return;
      }

      // Create initial set based on tracking type
      let initialSets;
      if (exerciseData.trackingType === 'cardio') {
        initialSets = [{
          setNumber: 1,
          distance: 0,
          distanceUnit: 'km' as const,
          time: 0,
          calories: 0,
          completed: false,
        }];
      } else if (exerciseData.trackingType === 'duration') {
        initialSets = [{
          setNumber: 1,
          duration: 0,
          completed: false,
        }];
      } else if (exerciseData.trackingType === 'reps_only') {
        initialSets = [{
          setNumber: 1,
          reps: 0,
          completed: false,
        }];
      } else {
        // weight_reps (default)
        initialSets = [{
          setNumber: 1,
          reps: 0,
          weight: 0,
          unit: 'kg' as const,
          completed: false,
        }];
      }

      const totalVolume = calculateVolume(initialSets, exerciseData.trackingType);

      const newExercise: WorkoutExercise = {
        id: `exercise-${Date.now()}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: initialSets,
        totalVolume,
        musclesWorked: [...(exercise.primaryMuscles ?? []), ...(exercise.secondaryMuscles ?? [])],
        timestamp: new Date(),
      };

      onExercisesChange([...(exercises ?? []), newExercise]);
      setShowAddExercise(false);
    } catch (err) {
      console.error('Failed to add exercise:', err);
      showError('Failed to add exercise');
    }
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (window.confirm('Are you sure you want to remove this exercise?')) {
      onExercisesChange(exercises.filter(ex => ex.id !== exerciseId));
    }
  };

  const handleExerciseUpdate = (exerciseId: string, updatedExercise: WorkoutExercise) => {
    onExercisesChange(
      exercises.map(ex => ex.id === exerciseId ? updatedExercise : ex)
    );
  };

  const handleDuplicateExercise = (exerciseId: string) => {
    const exerciseToDuplicate = exercises.find(ex => ex.id === exerciseId);
    if (!exerciseToDuplicate) return;

    const duplicatedExercise: WorkoutExercise = {
      ...exerciseToDuplicate,
      id: `exercise-${Date.now()}`,
      sets: exerciseToDuplicate.sets.map(set => ({
        ...set,
        completed: false, // Reset completed state for duplicated sets
        setDuration: undefined,
        setStartTime: undefined,
        setEndTime: undefined,
      })),
      timestamp: new Date(),
    };

    const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
    const newExercises = [...exercises];
    newExercises.splice(exerciseIndex + 1, 0, duplicatedExercise);
    onExercisesChange(newExercises);
  };

  const handleMoveExercise = (exerciseId: string, direction: 'up' | 'down') => {
    const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
    if (exerciseIndex === -1) return;

    const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    if (newIndex < 0 || newIndex >= exercises.length) return;

    const newExercises = [...exercises];
    [newExercises[exerciseIndex], newExercises[newIndex]] = [
      newExercises[newIndex],
      newExercises[exerciseIndex],
    ];
    onExercisesChange(newExercises);
  };

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <EditExerciseItem
          key={exercise.id}
          exercise={exercise}
          index={index}
          onUpdate={(updated) => handleExerciseUpdate(exercise.id, updated)}
          onRemove={() => handleRemoveExercise(exercise.id)}
          onDuplicate={() => handleDuplicateExercise(exercise.id)}
          onMoveUp={index > 0 ? () => handleMoveExercise(exercise.id, 'up') : undefined}
          onMoveDown={index < exercises.length - 1 ? () => handleMoveExercise(exercise.id, 'down') : undefined}
        />
      ))}

      {showAddExercise ? (
        <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1A3324] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-900 dark:text-white font-semibold">Select Exercise</h3>
            <button
              onClick={() => setShowAddExercise(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <ExerciseSelectorDropdown
            selectedExercise={null}
            onSelect={handleAddExercise}
            onCreateCustom={() => {
              // Navigate to create custom exercise page
              window.location.href = '/create-exercise';
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-primary/40 dark:border-primary/30 text-primary hover:bg-primary/5 hover:border-primary transition-all flex items-center justify-center gap-2 group"
        >
          <span className="bg-primary text-background-dark rounded-full p-1 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-xl block">add</span>
          </span>
          <span className="text-lg font-bold">Add Exercise</span>
        </button>
      )}
    </div>
  );
}

