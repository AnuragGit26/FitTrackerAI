import { useMemo, memo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line } from 'recharts';
import { SleepMetrics } from '@/types/sleep';

interface SleepTrendChartProps {
  data: SleepMetrics['sleepTrend'];
}

function SleepTrendChartComponent({ data }: SleepTrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return Array.from({ length: 7 }, (_, i) => ({
        date: `Day ${i + 1}`,
        duration: 0,
        quality: 0,
      }));
    }
    return data;
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm">
        <p className="text-slate-500 dark:text-gray-400 text-center py-8">
          No sleep data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-border-dark/50 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Sleep Trend</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Duration (hrs) and Quality (1-10)
          </p>
        </div>
      </div>
      <div className="w-full aspect-[16/9] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#9ca3af', style: { fontSize: '10px' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 10]}
              label={{ value: 'Quality', angle: 90, position: 'insideRight', fill: '#9ca3af', style: { fontSize: '10px' } }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar
              yAxisId="left"
              dataKey="duration"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
              barSize={20}
              name="Duration (hrs)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="quality"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: '#10b981' }}
              name="Quality (1-10)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const SleepTrendChart = memo(SleepTrendChartComponent);
