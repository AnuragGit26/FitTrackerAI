import { useState, useEffect } from 'react';
import { Workout, WorkoutMood } from '@/types/workout';
import { EditExerciseList } from './EditExerciseList';
import { formatDuration } from '@/utils/calculations';
import { validateWorkoutDateAndTime, validateWorkoutEndTime, adjustStartTimeToMatchDate } from '@/utils/validators';
import { useToast } from '@/hooks/useToast';

interface EditWorkoutFormProps {
  workout: Workout;
  onSave: (workout: Workout) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

// Helper function to format date for datetime-local input (local time, not UTC)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function EditWorkoutForm({ workout, onSave, onCancel, isSaving }: EditWorkoutFormProps) {
  const { error: showError } = useToast();
  const [workoutType, setWorkoutType] = useState(workout.workoutType || '');
  const [date, setDate] = useState(new Date(workout.date).toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(
    workout.startTime ? formatDateTimeLocal(new Date(workout.startTime)) : ''
  );
  const [endTime, setEndTime] = useState(
    workout.endTime ? formatDateTimeLocal(new Date(workout.endTime)) : ''
  );
  const [notes, setNotes] = useState(workout.notes || '');
  const [mood] = useState<WorkoutMood | ''>(workout.mood || '');
  const [calories] = useState(workout.calories?.toString() || '');
  const [exercises, setExercises] = useState(workout.exercises || []);

  // Calculate duration from start/end times
  const calculatedDuration = startTime && endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    : workout.totalDuration;

  // Auto-adjust startTime when date changes
  useEffect(() => {
    if (startTime && date) {
      const startTimeDate = new Date(startTime);
      const workoutDate = new Date(date);
      const validation = validateWorkoutDateAndTime(workoutDate, startTimeDate);
      
      if (!validation.valid && validation.adjustedStartTime) {
        // Silently adjust startTime to match date
        setStartTime(formatDateTimeLocal(validation.adjustedStartTime));
      }
    }
  }, [date, startTime]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    
    // Auto-adjust startTime if it exists
    if (startTime) {
      const workoutDate = new Date(newDate);
      const currentStartTime = new Date(startTime);
      const adjusted = adjustStartTimeToMatchDate(workoutDate, currentStartTime);
      setStartTime(formatDateTimeLocal(adjusted));
    }
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    
    // Validate startTime is on same day as date
    if (newStartTime && date) {
      const workoutDate = new Date(date);
      const startTimeDate = new Date(newStartTime);
      const validation = validateWorkoutDateAndTime(workoutDate, startTimeDate);
      
      if (!validation.valid) {
        if (validation.adjustedStartTime) {
          setStartTime(formatDateTimeLocal(validation.adjustedStartTime));
          showError('Start time adjusted to match workout date');
        } else {
          showError(validation.error || 'Invalid start time');
        }
      }
    }
  };

  const handleSave = async () => {
    // Validate date and times
    const workoutDate = new Date(date);
    const startTimeDate = startTime ? new Date(startTime) : workout.startTime;
    const endTimeDate = endTime ? new Date(endTime) : workout.endTime;

    if (!startTimeDate) {
      showError('Start time is required');
      return;
    }

    // Validate startTime is on same day as workout date
    const dateValidation = validateWorkoutDateAndTime(workoutDate, startTimeDate);
    if (!dateValidation.valid) {
      if (dateValidation.adjustedStartTime) {
        // Auto-adjust and continue
        const adjusted = dateValidation.adjustedStartTime;
        const updatedWorkout: Workout = {
          ...workout,
          workoutType: workoutType || 'Workout',
          date: workoutDate,
          startTime: adjusted,
          endTime: endTimeDate,
          totalDuration: calculatedDuration,
          notes: notes.trim() || undefined,
          mood: mood || undefined,
          calories: calories ? parseInt(calories, 10) : undefined,
          exercises,
        };
        await onSave(updatedWorkout);
        return;
      } else {
        showError(dateValidation.error || 'Invalid date/time');
        return;
      }
    }

    // Validate endTime if present
    if (endTimeDate) {
      const endTimeValidation = validateWorkoutEndTime(startTimeDate, endTimeDate);
      if (!endTimeValidation.valid) {
        showError(endTimeValidation.error || 'Invalid end time');
        return;
      }
    }

    const updatedWorkout: Workout = {
      ...workout,
      workoutType: workoutType || 'Workout',
      date: workoutDate,
      startTime: startTimeDate,
      endTime: endTimeDate,
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

        {/* Date and Time Section */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1" htmlFor="workout-date">
              Workout Date
            </label>
            <input
              id="workout-date"
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-white dark:bg-[#224932] border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-base font-normal text-slate-900 dark:text-white shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1" htmlFor="workout-start-time">
              Start Time
            </label>
            <input
              id="workout-start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full bg-white dark:bg-[#224932] border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-base font-normal text-slate-900 dark:text-white shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1" htmlFor="workout-end-time">
              End Time (Optional)
            </label>
            <input
              id="workout-end-time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-white dark:bg-[#224932] border-transparent focus:border-primary focus:ring-0 rounded-xl px-4 py-3 text-base font-normal text-slate-900 dark:text-white shadow-sm"
            />
          </div>
          {calculatedDuration > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-500 dark:text-[#90cba8] ml-1">
                Duration
              </label>
              <div className="w-full bg-white dark:bg-[#224932] rounded-xl px-4 py-3 text-base font-normal text-slate-900 dark:text-white shadow-sm">
                {formatDuration(calculatedDuration)}
              </div>
            </div>
          )}
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

