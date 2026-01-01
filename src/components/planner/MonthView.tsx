import { useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, format } from 'date-fns';
import { PlannedWorkout } from '@/types/workout';
import { cn } from '@/utils/cn';

interface MonthViewProps {
  currentDate: Date;
  selectedDate: Date;
  plannedWorkouts: PlannedWorkout[];
  onDateSelect: (date: Date) => void;
}

export function MonthView({ currentDate, selectedDate, plannedWorkouts, onDateSelect }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const today = new Date();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getPlannedWorkoutsForDate = (date: Date): PlannedWorkout[] => {
    return plannedWorkouts.filter((pw) => {
      const scheduledDate = new Date(pw.scheduledDate);
      return isSameDay(scheduledDate, date) && !pw.isCompleted;
    });
  };

  const isDateInCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentDate);
  };

  return (
    <div className="px-4 pb-4 border-b border-white/5">
      {/* Month Navigation */}
      <div className="flex items-center justify-between py-4">
        <h2 className="text-base font-bold text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-y-2 mb-2">
        {weekDays.map((day, index) => (
          <div
            key={index}
            className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {days.map((day, index) => {
          const dayWorkouts = getPlannedWorkoutsForDate(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isSameDay(day, today);
          const isCurrentMonth = isDateInCurrentMonth(day);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day)}
              className={cn(
                'h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-colors relative',
                !isCurrentMonth && 'opacity-30',
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

