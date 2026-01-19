import { User } from 'lucide-react';

interface SymmetryScoreCardProps {
  score: number;
}

export function SymmetryScoreCard({ score }: SymmetryScoreCardProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-1 flex-col justify-between rounded-xl bg-white dark:bg-surface-dark p-5 shadow-sm border border-gray-100 dark:border-border-dark">
        <div className="flex items-start justify-between">
          <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-normal">
            Symmetry Score
          </p>
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-bold leading-tight mt-2">
            {score}%
          </p>
          <p className="text-xs text-primary mt-1 font-medium">Top 15% of users</p>
        </div>
      </div>
    </div>
  );
}

