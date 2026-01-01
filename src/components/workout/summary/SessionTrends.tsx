import { ExerciseTrend } from '@/types/workoutSummary';
import { useUserStore } from '@/store/userStore';

interface SessionTrendsProps {
  trends: ExerciseTrend[];
}

export function SessionTrends({ trends }: SessionTrendsProps) {
  const { profile } = useUserStore();
  const unit = profile?.preferredUnit || 'kg';

  if (trends.length === 0) {
    return null;
  }

  const generateSparklinePath = (data: number[]): string => {
    if (data.length === 0) return '';
    const width = 100;
    const height = 40;
    const stepX = width / (data.length - 1 || 1);
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = height - (value / 100) * height;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const getTrendIcon = (trend: ExerciseTrend['trend']): string => {
    switch (trend) {
      case 'increasing':
        return 'arrow_forward';
      case 'decreasing':
        return 'arrow_back';
      default:
        return 'remove';
    }
  };

  const getTrendColor = (trend: ExerciseTrend['trend']): string => {
    switch (trend) {
      case 'increasing':
        return 'text-primary';
      case 'decreasing':
        return 'text-red-500';
      default:
        return 'text-[#90cba8]';
    }
  };


  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-bold">Session Trends</h2>
        <span className="text-xs text-[#90cba8] bg-[#162e21] px-2 py-1 rounded-full">
          Last 5 Sessions
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {trends.slice(0, 5).map((trend) => {
          const bestSet = trend.dataPoints[trend.dataPoints.length - 1];
          const sets = bestSet ? 3 : 0; // Approximate, could be improved
          const maxWeight = bestSet?.maxWeight || 0;

          return (
            <div
              key={trend.exerciseId}
              className="flex items-center justify-between rounded-xl bg-[#162e21] p-4 border border-white/5"
            >
              <div className="flex flex-col gap-1 min-w-[120px]">
                <span className="text-white font-medium text-base">{trend.exerciseName}</span>
                <span className="text-[#90cba8] text-sm">
                  {sets} Sets • {maxWeight > 0 ? `${maxWeight}${unit}` : 'N/A'}
                </span>
              </div>
              {/* Sparkline Container */}
              <div className="h-10 w-24 relative flex items-center">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 40"
                >
                  {trend.trend === 'increasing' && (
                    <defs>
                      <linearGradient id={`gradient-${trend.exerciseId}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0df269" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#0df269" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  )}
                  <path
                    d={generateSparklinePath(trend.sparklineData)}
                    fill="none"
                    stroke={trend.trend === 'increasing' ? '#0df269' : trend.trend === 'decreasing' ? '#ef4444' : '#90cba8'}
                    strokeLinecap="round"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {trend.trend === 'increasing' && (
                    <path
                      d={`${generateSparklinePath(trend.sparklineData)} L 100 40 L 0 40 Z`}
                      fill={`url(#gradient-${trend.exerciseId})`}
                      stroke="none"
                    />
                  )}
                </svg>
              </div>
              <div className="flex flex-col items-end gap-0.5 min-w-[50px]">
                <span className={`${getTrendColor(trend.trend)} font-bold text-sm`}>
                  {trend.changePercent !== undefined
                    ? `${trend.changePercent > 0 ? '+' : ''}${Math.round(trend.changePercent)}%`
                    : '0%'}
                </span>
                <span
                  className={`material-symbols-outlined ${getTrendColor(trend.trend)} text-xs ${
                    trend.trend === 'increasing' ? 'rotate-[-45deg]' : ''
                  }`}
                  style={{ fontSize: '12px' }}
                >
                  {getTrendIcon(trend.trend)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

