import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StrengthProgression } from '@/types/analytics';

interface StrengthProgressionChartProps {
  progressions: StrengthProgression[];
}

export function StrengthProgressionChart({ progressions }: StrengthProgressionChartProps) {
  const chartData = useMemo(() => {
    if (progressions.length === 0) return [];

    const allDates = new Set<string>();
    progressions.forEach((prog) => {
      prog.dataPoints.forEach((dp) => allDates.add(dp.date));
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map((date) => {
      const point: Record<string, any> = { date };
      progressions.forEach((prog) => {
        const dp = prog.dataPoints.find((p) => p.date === date);
        if (dp) {
          const estimated1RM = dp.maxWeight * (1 + dp.maxReps / 30);
          point[prog.exerciseName] = Math.round(estimated1RM);
        }
      });
      return point;
    });
  }, [progressions]);

  const colors = {
    'Barbell Squat': '#0df269',
    'Barbell Bench Press': '#9ca3af',
    'Barbell Deadlift': '#4b5563',
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
        <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">
          Strength Progression (1RM)
        </h3>
        <p className="text-xs text-gray-500 mb-4">Estimated One Rep Max over time</p>
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No strength progression data available
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-5 border border-gray-100 dark:border-gray-800/50 shadow-sm">
      <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">
        Strength Progression (1RM)
      </h3>
      <p className="text-xs text-gray-500 mb-4">Estimated One Rep Max over time</p>
      <div className="flex gap-4 mb-4">
        {progressions.map((prog) => (
          <div
            key={prog.exerciseName}
            className="flex items-center gap-2 px-2 py-1 bg-white/5 dark:bg-gray-800/50 rounded-md"
          >
            <div
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_#0df269]"
              style={{
                backgroundColor:
                  colors[prog.exerciseName as keyof typeof colors] || '#0df269',
              }}
            ></div>
            <span className="text-xs font-bold text-gray-300">
              {prog.exerciseName.replace('Barbell ', '')}
            </span>
          </div>
        ))}
      </div>
      <div className="w-full aspect-[16/9] min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" stroke="#333" opacity={0.4} />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
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
            <Legend />
            {progressions.map((prog) => (
              <Line
                key={prog.exerciseName}
                type="monotone"
                dataKey={prog.exerciseName}
                stroke={colors[prog.exerciseName as keyof typeof colors] || '#0df269'}
                strokeWidth={3}
                strokeLinecap="round"
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

