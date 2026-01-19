import { Trophy, Dumbbell } from 'lucide-react';
import { PersonalRecord } from '@/types/analytics';
import { formatDistanceToNow } from 'date-fns';
import { useUserStore } from '@/store/userStore';

interface RecentRecordsListProps {
  records: PersonalRecord[];
}

export function RecentRecordsList({ records }: RecentRecordsListProps) {
  const { profile } = useUserStore();
  const unit = profile?.preferredUnit || 'kg';
  const recentRecords = records.slice(0, 5);

  if (recentRecords.length === 0) {
    return (
      <div className="pt-2 pb-6">
        <h3 className="font-bold text-lg mb-4 pl-1 text-slate-900 dark:text-white flex items-center gap-2">
          Recent Records
          <Trophy className="w-4 h-4 text-primary" />
        </h3>
        <p className="text-slate-500 dark:text-gray-400 text-center py-4">
          No personal records yet. Keep training to set new PRs!
        </p>
      </div>
    );
  }

  return (
    <div className="pt-2 pb-6">
      <h3 className="font-bold text-lg mb-4 pl-1 text-slate-900 dark:text-white flex items-center gap-2">
        Recent Records
        <Trophy className="w-4 h-4 text-primary" />
      </h3>
      <div className="space-y-3">
        {recentRecords.map((record, index) => {
          const isNew = index === 0;
          const timeAgo = formatDistanceToNow(record.date, { addSuffix: true });

          return (
            <div
              key={`${record.exerciseId}-${record.date.getTime()}`}
              className="group flex items-center gap-4 bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-border-dark/50 shadow-sm relative overflow-hidden"
            >
              {isNew && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              )}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  isNew
                    ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-[#050505]'
                    : 'bg-white dark:bg-white/5 text-gray-400'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-base text-slate-900 dark:text-white">
                    {record.exerciseName}
                  </span>
                  {isNew && (
                    <span className="text-[10px] font-bold bg-primary text-background-dark px-2 py-0.5 rounded shadow-[0_0_8px_rgba(255,153,51,0.4)]">
                      NEW BEST
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm text-slate-500">
                  <span className="font-medium text-gray-400">
                    {record.maxWeight} {unit} × {record.maxReps} reps
                  </span>
                  <span>{timeAgo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

