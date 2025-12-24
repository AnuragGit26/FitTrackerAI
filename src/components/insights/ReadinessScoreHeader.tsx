import { Zap } from 'lucide-react';
import { WorkoutRecommendations } from '@/types/insights';

interface ReadinessScoreHeaderProps {
  recommendations: WorkoutRecommendations;
}

export function ReadinessScoreHeader({ recommendations }: ReadinessScoreHeaderProps) {

  return (
    <div className="px-4 pt-6 pb-2">
      <div className="flex items-end justify-between mb-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Readiness</h1>
        <div className="flex items-center gap-1 text-primary font-bold text-xl mb-1">
          <Zap className="w-6 h-6" />
          <span>{recommendations?.readinessScore ?? 'N/A'}%</span>
        </div>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-card-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${recommendations?.readinessScore ?? 0}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-3">
        <p className="text-slate-500 dark:text-text-muted text-sm font-medium">
          System Status: <span className="text-primary font-bold">{recommendations?.readinessStatus ?? 'N/A'}</span>
        </p>
        <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
          {(recommendations?.readinessScore ?? 0) >= 80 ? 'High Energy' : (recommendations?.readinessScore ?? 0) >= 60 ? 'Moderate' : 'Low Energy'}
        </span>
      </div>
    </div>
  );
}

