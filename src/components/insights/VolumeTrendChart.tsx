import { TrendingUp, MoreHorizontal } from 'lucide-react';

interface VolumeTrendChartProps {
  currentVolume: number;
  previousVolume: number;
  changePercent: number;
  weeklyData: Array<{ week: string; volume: number }>;
}

export function VolumeTrendChart({
  currentVolume,
  previousVolume: _previousVolume,
  changePercent,
  weeklyData,
}: VolumeTrendChartProps) {
  const maxVolume = Math.max(...weeklyData.map((d) => d.volume), 1);
  const normalizedData = weeklyData.map((d) => ({
    ...d,
    normalized: (d.volume / maxVolume) * 100,
  }));

  const generatePath = (data: typeof normalizedData) => {
    if (data.length === 0) {
    return '';
  }
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * 100;
      const y = 100 - d.normalized;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  const generateAreaPath = (data: typeof normalizedData) => {
    if (data.length === 0) {
    return '';
  }
    const path = generatePath(data);
    const x = ((data.length - 1) / (data.length - 1 || 1)) * 100;
    return `${path} L${x},100 L0,100 Z`;
  };

  return (
    <section className="rounded-xl border border-gray-100 dark:border-border-dark bg-white dark:bg-surface-card p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 dark:text-secondary-text text-sm font-medium">Volume vs Last Month</p>
          <div className="flex items-baseline gap-2">
            {changePercent !== 0 && (
              <p className="text-slate-900 dark:text-white text-3xl font-bold">
                {changePercent >= 0 ? '+' : ''}
                {changePercent.toFixed(0)}%
              </p>
            )}
            <span className="flex items-center text-blue-600 dark:text-primary text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              {Math.round(currentVolume / 1000)}k lbs
            </span>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div className="h-40 w-full relative">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0df269" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0df269" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              className="text-slate-200 dark:text-white/10"
              stroke="currentColor"
              strokeDasharray="2"
              strokeWidth="0.5"
              x1="0"
              x2="100"
              y1={y}
              y2={y}
            />
          ))}
          <path
            d={generateAreaPath(normalizedData)}
            fill="url(#chartGradient)"
          />
          <path
            d={generatePath(normalizedData)}
            fill="none"
            stroke="#0df269"
            strokeLinecap="round"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="transition-all duration-500"
          />
        </svg>
      </div>
      <div className="flex justify-between mt-2 px-1">
        {weeklyData.map((d) => (
          <span key={d.week} className="text-[10px] font-bold text-slate-400 dark:text-gray-500">
            {d.week}
          </span>
        ))}
      </div>
    </section>
  );
}

