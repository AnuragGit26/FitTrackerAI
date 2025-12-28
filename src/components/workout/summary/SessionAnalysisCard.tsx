import { SessionComparison } from '@/types/workoutSummary';
import { formatDuration } from '@/utils/calculations';

interface SessionAnalysisCardProps {
  comparison: SessionComparison;
}

export function SessionAnalysisCard({ comparison }: SessionAnalysisCardProps) {
  const formatVolume = (volume: number): string => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return Math.round(volume).toString();
  };

  const getIntensityLabel = (intensity: number): string => {
    if (intensity >= 85) return 'High Intensity';
    if (intensity >= 70) return 'Moderate Intensity';
    return 'Low Intensity';
  };

  const getChangeColor = (change?: number): string => {
    if (!change) return 'text-gray-500 dark:text-gray-400';
    return change > 0 ? 'text-primary' : 'text-red-500';
  };

  const getChangeIcon = (change?: number): string => {
    if (!change) return 'remove';
    return change > 0 ? 'arrow_upward' : 'arrow_downward';
  };

  return (
    <div className="px-4 py-6">
      <h2 className="text-slate-900 dark:text-white text-xl font-bold mb-4 px-1">
        Session Analysis
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {/* Duration */}
        <div className="bg-white dark:bg-[#162e21] border border-gray-200 dark:border-[#316847] rounded-xl p-4 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-4xl">timer</span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
            Duration
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {formatDuration(comparison.duration.current)}
            </span>
            {comparison.duration.change !== undefined && (
              <span
                className={`text-xs font-bold flex items-center ${getChangeColor(
                  comparison.duration.change
                )}`}
              >
                <span className="material-symbols-outlined text-[10px] mr-0.5">
                  {getChangeIcon(comparison.duration.change)}
                </span>
                {Math.abs(comparison.duration.change)}m
              </span>
            )}
          </div>
          {comparison.duration.previous !== undefined && (
            <p className="text-slate-400 dark:text-gray-500 text-[10px] mt-1">
              vs {formatDuration(comparison.duration.previous)} last time
            </p>
          )}
        </div>

        {/* Volume */}
        <div className="bg-white dark:bg-[#162e21] border border-gray-200 dark:border-[#316847] rounded-xl p-4 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-4xl">weight</span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
            Volume
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {formatVolume(comparison.volume.current)}
            </span>
            {comparison.volume.changePercent !== undefined && (
              <span
                className={`text-xs font-bold flex items-center ${getChangeColor(
                  comparison.volume.changePercent
                )}`}
              >
                <span className="material-symbols-outlined text-[10px] mr-0.5">
                  {getChangeIcon(comparison.volume.changePercent)}
                </span>
                {Math.abs(Math.round(comparison.volume.changePercent))}%
              </span>
            )}
          </div>
          {comparison.volume.previous !== undefined && (
            <p className="text-slate-400 dark:text-gray-500 text-[10px] mt-1">
              vs {formatVolume(comparison.volume.previous)} last time
            </p>
          )}
        </div>

        {/* Intensity */}
        <div className="bg-white dark:bg-[#162e21] border border-gray-200 dark:border-[#316847] rounded-xl p-4 flex flex-col col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <span className="material-symbols-outlined text-4xl">monitor_heart</span>
          </div>
          <div className="flex justify-between items-center w-full">
            <div>
              <p className="text-slate-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                Avg. RPE Intensity
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  {comparison.rpe.current.toFixed(1)}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">
                  {getIntensityLabel(comparison.intensity.current)}
                </span>
              </div>
            </div>
            {comparison.rpe.previous !== undefined && (
              <div className="text-right">
                <p className="text-slate-400 dark:text-gray-500 text-[10px]">Previous</p>
                <p className="text-slate-300 dark:text-gray-300 text-lg font-semibold">
                  {comparison.rpe.previous.toFixed(1)}
                </p>
              </div>
            )}
          </div>
          {/* Mini bar chart visual */}
          <div className="w-full h-1.5 bg-gray-200 dark:bg-black/40 rounded-full mt-3 overflow-hidden flex">
            <div
              className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(13,242,105,0.5)]"
              style={{ width: `${comparison.intensity.current}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

