import { useState, useEffect } from 'react';
import { Workout, WorkoutMood } from '@/types/workout';
import { EditExerciseList } from './EditExerciseList';
import { formatDuration } from '@/utils/calculations';

interface EditWorkoutFormProps {
  workout: Workout;
  onSave: (workout: Workout) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function EditWorkoutForm({ workout, onSave, onCancel, isSaving }: EditWorkoutFormProps) {
  const [workoutType, setWorkoutType] = useState(workout.workoutType || '');
  const [date, setDate] = useState(new Date(workout.date).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(
    workout.startTime ? new Date(workout.startTime).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    workout.endTime ? new Date(workout.endTime).toISOString().slice(0, 16) : ''
  );
  const [notes, setNotes] = useState(workout.notes || '');
  const [mood, setMood] = useState<WorkoutMood | ''>(workout.mood || '');
  const [calories, setCalories] = useState(workout.calories?.toString() || '');
  const [exercises, setExercises] = useState(workout.exercises || []);

  // Calculate duration from start/end times
  const calculatedDuration = startTime && endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    : workout.totalDuration;

  const handleSave = async () => {
    const updatedWorkout: Workout = {
      ...workout,
      workoutType: workoutType || 'Workout',
      date: new Date(date),
      startTime: startTime ? new Date(startTime) : workout.startTime,
      endTime: endTime ? new Date(endTime) : workout.endTime,
      totalDuration: calculatedDuration,
      notes: notes.trim() || undefined,
      mood: mood || undefined,
      calories: calories ? parseInt(calories, 10) : undefined,
      exercises,
    };

    await onSave(updatedWorkout);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="w-full max-w-md mx-auto px-4 pt-6 space-y-8 pb-32"
    >
      {/* Workout Details Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1" htmlFor="workout-name">
            Workout Name
          </label>
          <div className="relative">
            <input
              id="workout-name"
              type="text"
              value={workoutType}
              onChange={(e) => setWorkoutType(e.target.value)}
              placeholder="Workout"
              className="w-full bg-white dark:bg-[#224932] border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-4 text-lg font-semibold placeholder-slate-400 text-slate-900 dark:text-white shadow-sm"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 material-symbols-outlined pointer-events-none">
              edit
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1" htmlFor="workout-desc">
            Description (Optional)
          </label>
          <textarea
            id="workout-desc"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Focus on compound movements..."
            rows={2}
            className="w-full bg-white dark:bg-[#224932] border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-base font-normal placeholder-slate-400 dark:placeholder-[#648f76] text-slate-900 dark:text-white shadow-sm resize-none"
          />
        </div>
      </section>

      {/* Exercises List Section */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xl font-bold">Exercises</h2>
          <span className="text-sm text-slate-500 dark:text-[#90cba8]">
            {exercises.length} {exercises.length === 1 ? 'Exercise' : 'Exercises'}
          </span>
        </div>
        <EditExerciseList
          exercises={exercises}
          onExercisesChange={setExercises}
        />
      </section>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-white/10 p-4 pb-8 z-40 backdrop-blur-lg bg-opacity-95 dark:bg-opacity-95 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || exercises.length === 0}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-background-dark bg-primary hover:bg-[#0be060] transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

