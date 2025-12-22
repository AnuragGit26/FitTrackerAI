import { Calendar, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/utils/cn';

type DateRangeOption = '30d' | '90d' | '180d' | '1y';

interface ProgressHeaderProps {
  selectedRange: DateRangeOption;
  onRangeChange: (range: DateRangeOption) => void;
}

export function ProgressHeader({ selectedRange, onRangeChange }: ProgressHeaderProps) {
  const [showRangeMenu, setShowRangeMenu] = useState(false);

  const rangeLabels: Record<DateRangeOption, string> = {
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '180d': 'Last 180 Days',
    '1y': 'Last Year',
  };

  return (
    <div className="sticky top-0 z-40 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800/60">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Progress
        </h1>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full border border-gray-200 dark:border-gray-700 active:scale-95 transition-transform">
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
                className="fixed inset-0 z-[90]"
                onClick={() => setShowRangeMenu(false)}
              />
              <div className="absolute top-full mt-2 left-0 bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-[100] min-w-[160px]">
                {(Object.keys(rangeLabels) as DateRangeOption[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      onRangeChange(range);
                      setShowRangeMenu(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
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
        <button className="flex shrink-0 items-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          Compare to previous
        </button>
        <button className="flex shrink-0 items-center gap-2 bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-700 px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          Custom Range
        </button>
      </div>
    </div>
  );
}

