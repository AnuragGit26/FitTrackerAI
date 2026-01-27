import { useMemo, memo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { VolumeData } from '@/types/analytics';

interface VolumeTrendChartProps {
  data: VolumeData[];
}

function VolumeTrendChartComponent({ data }: VolumeTrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return Array.from({ length: 4 }, (_, i) => ({
        week: `Week ${i + 1}`,
        volume: 0,
      }));
    }
    return data.map((item) => ({
      week: item.date,
      volume: item.totalVolume,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm">
        <p className="text-slate-500 dark:text-gray-400 text-center py-8">
          No volume data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Volume Trend</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Total weight lifted over time
          </p>
        </div>
        <div className="flex gap-2 text-sm text-slate-500">
          <span className="text-primary font-bold">1M</span>
          <span>3M</span>
          <span>6M</span>
        </div>
      </div>
      <div className="w-full aspect-[16/9] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9933" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#FF9933" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="week"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              angle={chartData.length > 7 ? -45 : 0}
              textAnchor={chartData.length > 7 ? 'end' : 'middle'}
              height={chartData.length > 7 ? 60 : 30}
              interval={chartData.length > 14 ? Math.ceil(chartData.length / 7) : 0}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#FF9933"
              strokeWidth={3}
              fill="url(#volumeGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {chartData.length <= 14 && (
        <div className={`flex mt-4 text-xs text-slate-400 dark:text-gray-400 font-medium px-1 ${
          chartData.length <= 7 ? 'justify-between' : 'gap-2 overflow-x-auto scrollbar-hide'
        }`}>
          {chartData.map((item, index) => (
            <span
              key={index}
              className={`${chartData.length > 7 ? 'flex-shrink-0' : ''} ${
                index === chartData.length - 1 ? 'text-primary' : ''
              }`}
            >
              {item.week}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const VolumeTrendChart = memo(VolumeTrendChartComponent);

