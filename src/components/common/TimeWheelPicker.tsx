import { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface TimeWheelPickerProps {
  minutes: number;
  seconds: number;
  onChange: (minutes: number, seconds: number) => void;
  disabled?: boolean;
  className?: string;
}

export function TimeWheelPicker({
  minutes: initialMinutes,
  seconds: initialSeconds,
  onChange,
  disabled = false,
  className,
}: TimeWheelPickerProps) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(initialSeconds);
  const minutesRef = useRef<HTMLDivElement>(null);
  const secondsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMinutes(initialMinutes);
    setSeconds(initialSeconds);
  }, [initialMinutes, initialSeconds]);

  useEffect(() => {
    onChange(minutes, seconds);
  }, [minutes, seconds, onChange]);

  const handleMinutesScroll = (e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setMinutes((prev) => Math.max(0, Math.min(59, prev + delta)));
  };

  const handleSecondsScroll = (e: React.WheelEvent) => {
    if (disabled) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 5 : -5;
    setSeconds((prev) => {
      const newValue = prev + delta;
      if (newValue < 0) return 59;
      if (newValue > 59) return 0;
      return newValue;
    });
  };

  const renderMinutesColumn = () => {
    const items = [];
    for (let i = Math.max(0, minutes - 1); i <= Math.min(59, minutes + 1); i++) {
      items.push(
        <div
          key={i}
          className={cn(
            'text-lg font-medium transition-all',
            i === minutes
              ? 'text-slate-900 dark:text-primary text-xl font-bold'
              : 'text-slate-300 dark:text-gray-600 opacity-50'
          )}
        >
          {i}
        </div>
      );
    }
    return items;
  };

  const renderSecondsColumn = () => {
    const items = [];
    const start = Math.max(0, seconds - 15);
    const end = Math.min(59, seconds + 15);
    for (let i = start; i <= end; i += 5) {
      items.push(
        <div
          key={i}
          className={cn(
            'text-lg font-medium transition-all',
            Math.abs(i - seconds) <= 2
              ? 'text-slate-900 dark:text-primary text-xl font-bold'
              : 'text-slate-300 dark:text-gray-600 opacity-50'
          )}
        >
          {i}
        </div>
      );
    }
    return items;
  };

  return (
    <div
      className={cn(
        'relative h-32 overflow-hidden flex items-center justify-center',
        className
      )}
    >
      {/* Selection Highlight Background */}
      <div className="absolute w-full h-10 bg-gray-100 dark:bg-surface-darker rounded-lg border border-primary/30 z-0 top-1/2 -translate-y-1/2 pointer-events-none"></div>

      {/* Minutes Column */}
      <div
        ref={minutesRef}
        className="flex-1 z-10 h-full overflow-hidden relative"
        onWheel={handleMinutesScroll}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-surface-dark dark:via-transparent dark:to-surface-dark pointer-events-none z-20"></div>
        <div className="flex flex-col items-center justify-center space-y-3 py-10">
          {renderMinutesColumn()}
        </div>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-gray-500">
          MIN
        </span>
      </div>

      {/* Separator */}
      <div className="text-slate-300 dark:text-gray-600 text-xl font-bold pb-1 z-10">
        :
      </div>

      {/* Seconds Column */}
      <div
        ref={secondsRef}
        className="flex-1 z-10 h-full overflow-hidden relative"
        onWheel={handleSecondsScroll}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white dark:from-surface-dark dark:via-transparent dark:to-surface-dark pointer-events-none z-20"></div>
        <div className="flex flex-col items-center justify-center space-y-3 py-10">
          {renderSecondsColumn()}
        </div>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-gray-500">
          SEC
        </span>
      </div>
    </div>
  );
}

