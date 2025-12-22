import { RecoveryPrediction } from '@/types/insights';

interface PredictedRecoveryChartProps {
  predictions: RecoveryPrediction[];
}

export function PredictedRecoveryChart({ predictions }: PredictedRecoveryChartProps) {
  if (predictions.length === 0) return null;

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case 'push':
      case 'pull':
      case 'legs':
        return 'bg-primary';
      case 'rest':
        return 'bg-white/20';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="mt-2 px-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Predicted Recovery</h3>
        <span className="text-xs text-text-muted">Next 7 Days</span>
      </div>
      <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-gray-100 dark:border-white/5">
        <div className="flex justify-between items-end gap-1">
          {predictions.slice(0, 5).map((pred, index) => (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <div className="text-[10px] text-text-muted font-medium uppercase">{pred.dayLabel || 'N/A'}</div>
              <div className="w-full bg-primary/10 h-16 rounded-t-lg relative group overflow-hidden">
                <div
                  className={`absolute bottom-0 w-full ${getWorkoutTypeColor(pred.workoutType || 'rest')} transition-all duration-500 ease-out`}
                  style={{ height: `${pred.recoveryPercentage || 0}%` }}
                />
              </div>
              <div
                className={`text-xs font-medium ${
                  !pred.workoutType || pred.workoutType === 'rest' ? 'text-text-muted' : 'text-white'
                }`}
              >
                {!pred.workoutType || pred.workoutType === 'rest' 
                  ? 'Rest' 
                  : pred.workoutType.charAt(0).toUpperCase() + pred.workoutType.slice(1)}
              </div>
            </div>
          ))}
        </div>
        {(predictions[0]?.prPotential?.length || predictions[0]?.fatigueWarnings?.length) && (
          <div className="mt-3 flex gap-2 flex-wrap">
            {predictions[0].prPotential?.map((pr, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-text-muted border border-white/5"
              >
                PR Potential: {pr}
              </span>
            ))}
            {predictions[0].fatigueWarnings?.map((warning, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-text-muted border border-white/5"
              >
                High Fatigue: {warning}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

