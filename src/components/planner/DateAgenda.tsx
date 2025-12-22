import { useMemo } from 'react';
import { isToday, format } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';
import { PlannedWorkoutCard } from './PlannedWorkoutCard';
import { Sparkles } from 'lucide-react';

interface DateAgendaProps {
  selectedDate: Date;
  plannedWorkouts: PlannedWorkout[];
  onStartWorkout: (plannedWorkout: PlannedWorkout) => void;
  onEditWorkout?: (plannedWorkout: PlannedWorkout) => void;
  onDeleteWorkout?: (plannedWorkout: PlannedWorkout) => void;
  onAddWorkout: () => void;
}

export function DateAgenda({
  selectedDate,
  plannedWorkouts,
  onStartWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onAddWorkout,
}: DateAgendaProps) {
  const dayWorkouts = useMemo(() => {
    return plannedWorkouts.filter((pw) => {
      const scheduledDate = new Date(pw.scheduledDate);
      const selected = new Date(selectedDate);
      return (
        scheduledDate.getDate() === selected.getDate() &&
        scheduledDate.getMonth() === selected.getMonth() &&
        scheduledDate.getFullYear() === selected.getFullYear() &&
        !pw.isCompleted
      );
    });
  }, [plannedWorkouts, selectedDate]);

  const totalMinutes = useMemo(() => {
    return dayWorkouts.reduce((sum, pw) => sum + pw.estimatedDuration, 0);
  }, [dayWorkouts]);

  const isTodayDate = isToday(selectedDate);
  const dateLabel = isTodayDate ? 'Today' : format(selectedDate, 'EEEE, MMM d');

  return (
    <main className="flex-1 px-4 py-6 pb-24 space-y-6">
      {/* Date Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {isTodayDate ? 'Today' : format(selectedDate, 'EEEE')}
          </h2>
          <p className="text-slate-400 font-medium mt-1">{dateLabel}</p>
        </div>
      </div>

      {/* Stats Row */}
      {dayWorkouts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5 flex flex-col items-start gap-1">
            <span className="text-3xl font-bold text-white">{dayWorkouts.length}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              Workouts
            </span>
          </div>
          <div className="bg-surface-dark/50 p-4 rounded-xl border border-white/5 flex flex-col items-start gap-1">
            <span className="text-3xl font-bold text-white">{totalMinutes}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-primary">
              Minutes
            </span>
          </div>
        </div>
      )}

      {/* AI Insight Banner (placeholder for future enhancement) */}
      {dayWorkouts.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 p-4">
          <div className="absolute -right-4 -top-4 text-purple-500/10">
            <Sparkles className="w-20 h-20" />
          </div>
          <div className="relative z-10 flex gap-3">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-purple-200">AI Recovery Insight</h4>
              <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
                Your planned workouts look balanced. Stay hydrated and get adequate rest.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agenda List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Scheduled</h3>
          {dayWorkouts.length > 0 && (
            <button className="text-sm text-primary font-medium hover:underline">
              View History
            </button>
          )}
        </div>

        {/* Workout Cards */}
        {dayWorkouts.length > 0 ? (
          <div className="space-y-4">
            {dayWorkouts.map((plannedWorkout) => (
              <PlannedWorkoutCard
                key={plannedWorkout.id}
                plannedWorkout={plannedWorkout}
                onStart={() => onStartWorkout(plannedWorkout)}
                onEdit={onEditWorkout ? () => onEditWorkout(plannedWorkout) : undefined}
                onDelete={onDeleteWorkout ? () => onDeleteWorkout(plannedWorkout) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <span className="text-slate-400 group-hover:text-primary text-2xl">+</span>
            </div>
            <p className="text-sm font-medium text-slate-400" onClick={onAddWorkout}>
              Tap to add workout or template
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

