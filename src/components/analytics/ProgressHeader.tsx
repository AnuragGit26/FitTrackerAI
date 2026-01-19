import { Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { DateRange } from '@/utils/analyticsHelpers';

interface ProgressHeaderProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onComparePrevious?: () => void;
  onCustomRange?: () => void;
}

export function ProgressHeader({ selectedRange, onRangeChange, onComparePrevious, onCustomRange }: ProgressHeaderProps) {
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

  return (
    <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-border-dark/60">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Progress
        </h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onCustomRange?.()}
            className="w-10 h-10 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full border border-gray-100 dark:border-border-dark active:scale-95 transition-transform hover:bg-white dark:hover:bg-surface-dark"
            aria-label="Select custom date range"
          >
            <Calendar className="w-5 h-5 text-slate-500 dark:text-gray-400" />
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
            className="flex shrink-0 items-center gap-2 bg-primary text-[#050505] pl-4 pr-3 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            <span>{rangeLabels[selectedRange]}</span>
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
              <div className="absolute top-full mt-2 left-0 bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-100 dark:border-border-dark py-2 z-[9999] min-w-[160px]">
                {availableRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      onRangeChange(range);
                      setShowRangeMenu(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-white dark:hover:bg-surface-dark transition-colors',
                      selectedRange === range && 'text-primary font-bold'
                    )}
                  >
                    {rangeLabels[range]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {onComparePrevious && (
          <button
            onClick={onComparePrevious}
            className="flex shrink-0 items-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-border-dark px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 dark:text-gray-300 whitespace-nowrap active:bg-white dark:active:bg-surface-dark transition-colors"
          >
            Compare to previous
          </button>
        )}
        {onCustomRange && (
          <button
            onClick={onCustomRange}
            className="flex shrink-0 items-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-border-dark px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 dark:text-gray-300 whitespace-nowrap active:bg-white dark:active:bg-surface-dark transition-colors"
          >
            Custom Range
          </button>
        )}
      </div>
    </div>
  );
}

