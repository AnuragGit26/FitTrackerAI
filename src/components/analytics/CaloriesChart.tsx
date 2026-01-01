import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface CaloriesChartProps {
  data: Array<{ date: string; calories: number }>;
}

export function CaloriesChart({ data }: CaloriesChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) {
      return [];
    }
    return data.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calories: item.calories,
    }));
  }, [data]);

  if (chartData.length === 0 || chartData.every(item => item.calories === 0)) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
        <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">
          Calories Burned
        </h3>
        <p className="text-xs text-gray-500 mb-4">Total calories burned over time</p>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No calorie data available. Track calories when finishing workouts to see your progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Calories Burned</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Total calories burned over time
          </p>
        </div>
      </div>
      <div className="w-full aspect-[16/9] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <defs>
              <linearGradient id="caloriesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              angle={chartData.length > 7 ? -45 : 0}
              textAnchor={chartData.length > 7 ? 'end' : 'middle'}
              height={chartData.length > 7 ? 60 : 30}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 'dataMax']}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [`${value} cal`, 'Calories']}
            />
            <Area
              type="monotone"
              dataKey="calories"
              stroke="#f59e0b"
              strokeWidth={3}
              fill="url(#caloriesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

