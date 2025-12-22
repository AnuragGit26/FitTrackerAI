import { Calendar, Dumbbell } from 'lucide-react';

interface PerformanceTrendsCardsProps {
  consistencyScore: number;
  consistencyChange: number;
  workoutCount: number;
  workoutCountChange: number;
}

export function PerformanceTrendsCards({
  consistencyScore,
  consistencyChange,
  workoutCount,
  workoutCountChange,
}: PerformanceTrendsCardsProps) {
  return (
    <section>
      <h2 className="text-slate-800 dark:text-white text-lg font-bold mb-3 px-1">Performance Trends</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-surface-card border border-gray-100 dark:border-[#316847]/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                consistencyChange >= 0
                  ? 'bg-green-100 dark:bg-[#0bda43]/20 text-green-700 dark:text-[#0bda43]'
                  : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
              }`}
            >
              {consistencyChange >= 0 ? '+' : ''}
              {consistencyChange}%
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-secondary-text text-xs font-medium uppercase tracking-wider">
              Consistency
            </p>
            <p className="text-slate-900 dark:text-white text-2xl font-bold">{consistencyScore}%</p>
          </div>
          <p className="text-slate-400 dark:text-gray-400 text-[10px]">Top 10% of users</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-surface-card border border-gray-100 dark:border-[#316847]/50 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                workoutCountChange >= 0
                  ? 'bg-green-100 dark:bg-[#0bda43]/20 text-green-700 dark:text-[#0bda43]'
                  : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
              }`}
            >
              {workoutCountChange >= 0 ? '+' : ''}
              {workoutCountChange}
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-secondary-text text-xs font-medium uppercase tracking-wider">
              Workouts
            </p>
            <p className="text-slate-900 dark:text-white text-2xl font-bold">{workoutCount}</p>
          </div>
          <p className="text-slate-400 dark:text-gray-400 text-[10px]">Sessions this month</p>
        </div>
      </div>
    </section>
  );
}

