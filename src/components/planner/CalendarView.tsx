import { useState } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, startOfDay } from 'date-fns';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { CustomRangeView } from './CustomRangeView';
import { PlannedWorkout } from '@/types/workout';
import { PlannerViewMode } from '@/store/plannedWorkoutStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  currentDate: Date;
  selectedDate: Date;
  viewMode: PlannerViewMode;
  plannedWorkouts: PlannedWorkout[];
  onDateSelect: (date: Date) => void;
  onCurrentDateChange: (date: Date) => void;
}

export function CalendarView({
  currentDate,
  selectedDate,
  viewMode,
  plannedWorkouts,
  onDateSelect,
  onCurrentDateChange,
}: CalendarViewProps) {
  const handlePrev = () => {
    if (viewMode === 'month') {
      onCurrentDateChange(subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onCurrentDateChange(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      onCurrentDateChange(addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      onCurrentDateChange(addWeeks(currentDate, 1));
    }
  };

  return (
    <div>
      {/* Navigation for Month/Week views */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={handlePrev}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Render appropriate view */}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          selectedDate={selectedDate}
          plannedWorkouts={plannedWorkouts}
          onDateSelect={onDateSelect}
        />
      )}

      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          selectedDate={selectedDate}
          plannedWorkouts={plannedWorkouts}
          onDateSelect={onDateSelect}
          onWeekChange={onCurrentDateChange}
        />
      )}

      {viewMode === 'custom' && (
        <CustomRangeView
          startDate={currentDate}
          selectedDate={selectedDate}
          plannedWorkouts={plannedWorkouts}
          onDateSelect={onDateSelect}
        />
      )}
    </div>
  );
}

