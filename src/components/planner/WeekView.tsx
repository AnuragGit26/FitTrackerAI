import { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format, addWeeks, subWeeks } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  selectedDate: Date;
  plannedWorkouts: PlannedWorkout[];
  onDateSelect: (date: Date) => void;
  onWeekChange: (date: Date) => void;
}

export function WeekView({ currentDate, selectedDate, plannedWorkouts, onDateSelect, onWeekChange }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const days = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekStart, weekEnd]);

  const today = new Date();

  const getPlannedWorkoutsForDate = (date: Date): PlannedWorkout[] => {
    return plannedWorkouts.filter((pw) => {
      const scheduledDate = new Date(pw.scheduledDate);
      return isSameDay(scheduledDate, date) && !pw.isCompleted;
    });
  };

  const handlePrevWeek = () => {
    onWeekChange(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(currentDate, 1));
  };

  return (
    <div className="px-4 pb-4 border-b border-white/5">
      {/* Week Navigation */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={handlePrevWeek}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-base font-bold text-white">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <button
          onClick={handleNextWeek}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-y-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {days.map((day, index) => {
          const dayWorkouts = getPlannedWorkoutsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isSameDay(day, today);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                'h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-colors relative',
                isSelected
                  ? 'bg-primary text-background-dark font-bold shadow-lg shadow-primary/30 scale-110'
                  : isTodayDate
                    ? 'bg-surface-dark text-white'
                    : 'text-white hover:bg-surface-dark'
              )}
            >
              {format(day, 'd')}
              {dayWorkouts.length > 0 && (
                <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

