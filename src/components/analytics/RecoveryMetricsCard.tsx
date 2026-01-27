import { RecoveryMetrics } from '@/types/sleep';
import { Activity, Battery, Zap, AlertCircle } from 'lucide-react';

interface RecoveryMetricsCardProps {
  metrics: RecoveryMetrics;
}

export function RecoveryMetricsCard({ metrics }: RecoveryMetricsCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) {return 'text-blue-500';}
    if (score >= 5) {return 'text-yellow-500';}
    return 'text-red-500';
  };

  const getRecoveryColor = (score: number) => {
    if (score >= 75) {return 'text-blue-500';}
    if (score >= 50) {return 'text-yellow-500';}
    return 'text-red-500';
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm">
      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-4">Recovery Status</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-background-light dark:bg-background-dark/50 rounded-lg p-3 border border-gray-100 dark:border-border-dark">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs text-slate-500 dark:text-gray-400">Avg Recovery</span>
          </div>
          <p className={`text-xl font-bold ${getRecoveryColor(metrics.averageRecovery)}`}>
            {Math.round(metrics.averageRecovery)}%
          </p>
        </div>
        
        <div className="bg-background-light dark:bg-background-dark/50 rounded-lg p-3 border border-gray-100 dark:border-border-dark">
          <div className="flex items-center gap-2 mb-1">
            <Battery className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500 dark:text-gray-400">Sleep Correlation</span>
          </div>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {metrics.correlationWithSleep !== null 
              ? metrics.correlationWithSleep.toFixed(2) 
              : 'N/A'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-slate-500 dark:text-gray-300">Avg Energy</span>
          </div>
          <span className={`font-bold ${getScoreColor(metrics.averageEnergy)}`}>
            {metrics.averageEnergy.toFixed(1)}/10
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-slate-500 dark:text-gray-300">Avg Stress</span>
          </div>
          <span className={`font-bold ${getScoreColor(10 - metrics.averageStress)}`}>
            {metrics.averageStress.toFixed(1)}/10
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-slate-500 dark:text-gray-300">Avg Soreness</span>
          </div>
          <span className={`font-bold ${getScoreColor(10 - metrics.averageSoreness)}`}>
            {metrics.averageSoreness.toFixed(1)}/10
          </span>
        </div>
      </div>
    </div>
  );
}
