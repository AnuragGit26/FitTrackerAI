import { User } from 'lucide-react';

type TimePeriod = 'Week' | 'Month' | 'Year';

interface MuscleAnalyticsHeaderProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
}

export function MuscleAnalyticsHeader({
  selectedPeriod,
  onPeriodChange,
}: MuscleAnalyticsHeaderProps) {
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 border-b border-gray-100 dark:border-border-dark">
        <h2 className="text-xl font-bold leading-tight tracking-tight flex-1">
          Muscle Analytics
        </h2>
        <div className="flex items-center justify-end">
          <button className="flex items-center justify-center rounded-full h-10 w-10 bg-white dark:bg-surface-dark text-slate-700 dark:text-white hover:bg-primary hover:text-black transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="px-4 py-4">
        <div className="flex h-10 w-full items-center justify-center rounded-lg bg-white dark:bg-surface-dark p-1">
          {(['Week', 'Month', 'Year'] as TimePeriod[]).map((period) => (
            <label
              key={period}
              className={`group flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-surface-dark shadow-sm'
                  : ''
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  selectedPeriod === period
                    ? 'text-primary'
                    : 'text-slate-600 dark:text-[#FF9933]'
                }`}
              >
                {period}
              </span>
              <input
                type="radio"
                name="date-range"
                value={period}
                checked={selectedPeriod === period}
                onChange={() => onPeriodChange(period)}
                className="invisible w-0 h-0 absolute"
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

