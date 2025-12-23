import { Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { DateRange } from '@/utils/analyticsHelpers';

type TimePeriod = 'Week' | 'Month' | 'Year';

interface UnifiedDateSelectorProps {
  mode: 'progress' | 'muscle';
  selectedRange?: DateRange;
  selectedPeriod?: TimePeriod;
  onRangeChange?: (range: DateRange) => void;
  onPeriodChange?: (period: TimePeriod) => void;
  onCustomRange?: () => void;
  title?: string;
}

// Convert TimePeriod to DateRange
function timePeriodToDateRange(period: TimePeriod): DateRange {
  switch (period) {
    case 'Week':
      return '7d';
    case 'Month':
      return '30d';
    case 'Year':
      return '1y';
    default:
      return '30d';
  }
}

// Convert DateRange to TimePeriod (closest match)
function dateRangeToTimePeriod(range: DateRange): TimePeriod {
  switch (range) {
    case '7d':
      return 'Week';
    case '30d':
    case '90d':
    case '180d':
      return 'Month';
    case '1y':
    case 'all':
      return 'Year';
    default:
      return 'Month';
  }
}

export function UnifiedDateSelector({
  mode,
  selectedRange,
  selectedPeriod,
  onRangeChange,
  onPeriodChange,
  onCustomRange,
  title,
}: UnifiedDateSelectorProps) {
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  const rangeLabels: Record<DateRange, string> = {
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '180d': 'Last 180 Days',
    '1y': 'Last Year',
    'all': 'All Time',
  };

  const availableRanges: DateRange[] = ['7d', '30d', '90d', '180d', '1y'];

  if (mode === 'muscle') {
    // Muscle view: Show Week/Month/Year selector
    const periods: TimePeriod[] = ['Week', 'Month', 'Year'];
    const currentPeriod = selectedPeriod || dateRangeToTimePeriod(selectedRange || '30d');

    return (
      <>
        <div className="sticky top-0 z-40 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-[#316847]">
          <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">
            {title || 'Muscle Analytics'}
          </h2>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onCustomRange?.()}
              className="w-10 h-10 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Select custom date range"
            >
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="flex items-center justify-center rounded-full h-10 w-10 bg-gray-200 dark:bg-surface-dark text-slate-700 dark:text-white hover:bg-primary hover:text-black transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="px-4 py-4">
          <div className="flex h-10 w-full items-center justify-center rounded-lg bg-gray-200 dark:bg-[#1c3a29] p-1">
            {periods.map((period) => (
              <label
                key={period}
                className={`group flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all duration-200 ${
                  currentPeriod === period
                    ? 'bg-white dark:bg-surface-dark shadow-sm'
                    : ''
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    currentPeriod === period
                      ? 'text-primary'
                      : 'text-slate-600 dark:text-[#90cba8]'
                  }`}
                >
                  {period}
                </span>
                <input
                  type="radio"
                  name="date-range"
                  value={period}
                  checked={currentPeriod === period}
                  onChange={() => {
                    onPeriodChange?.(period);
                    // Also update range for consistency
                    if (onRangeChange) {
                      onRangeChange(timePeriodToDateRange(period));
                    }
                  }}
                  className="invisible w-0 h-0 absolute"
                />
              </label>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Progress view: Show date range dropdown
  const currentRange = selectedRange || '30d';

  return (
    <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/60">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {title || 'Progress'}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onCustomRange?.()}
            className="w-10 h-10 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Select custom date range"
          >
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
            <User className="w-6 h-6 text-primary" />
          </div>
        </div>
      </div>
      <div className="px-4 pb-3 flex gap-3 overflow-x-auto no-scrollbar">
        <div className="relative">
          <button
            onClick={() => setShowRangeMenu(!showRangeMenu)}
            className="flex shrink-0 items-center gap-2 bg-primary text-[#102217] pl-4 pr-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <span>{rangeLabels[currentRange]}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showRangeMenu && (
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowRangeMenu(false)}
              />
              <div className="absolute top-full mt-2 left-0 bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[9999] min-w-[160px]">
                {availableRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      onRangeChange?.(range);
                      setShowRangeMenu(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                      currentRange === range && 'text-primary font-bold'
                    )}
                  >
                    {rangeLabels[range]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

