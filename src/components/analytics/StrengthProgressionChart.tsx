import { useMemo, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Brush, ReferenceLine, Dot } from 'recharts';
import { StrengthProgression } from '@/types/analytics';
import { format } from 'date-fns';

interface StrengthProgressionChartProps {
  progressions: StrengthProgression[];
}

export function StrengthProgressionChart({ progressions }: StrengthProgressionChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [selectedPoint, setSelectedPoint] = useState<{ date: string; exercise: string; value: number } | null>(null);

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
          // Store original data for tooltip
          point[`${prog.exerciseName}_data`] = dp;
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

  const toggleSeries = useCallback((exerciseName: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseName)) {
        next.delete(exerciseName);
      } else {
        next.add(exerciseName);
      }
      return next;
    });
  }, []);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2 text-sm">
            {format(new Date(label), 'MMM d, yyyy')}
          </p>
          {payload.map((entry: any, index: number) => {
            if (hiddenSeries.has(entry.dataKey)) return null;
            const dataPoint = entry.payload[`${entry.dataKey}_data`];
            return (
              <div key={index} className="mb-1 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-white font-medium text-sm">{entry.dataKey.replace('Barbell ', '')}</span>
                </div>
                <div className="text-gray-300 text-xs ml-5">
                  <div>1RM: {entry.value} lbs</div>
                  {dataPoint && (
                    <>
                      <div>Weight: {dataPoint.maxWeight} lbs</div>
                      <div>Reps: {dataPoint.maxReps}</div>
                      <div>Volume: {Math.round(dataPoint.totalVolume)} lbs</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom Dot Component with click handler
  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    return (
      <Dot
        {...props}
        onClick={() => {
          const value = payload[dataKey];
          if (value) {
            setSelectedPoint({
              date: payload.date,
              exercise: dataKey,
              value,
            });
          }
        }}
        style={{ cursor: 'pointer' }}
      />
    );
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
      <div className="flex gap-4 mb-4 flex-wrap">
        {progressions.map((prog) => {
          const isHidden = hiddenSeries.has(prog.exerciseName);
          return (
            <button
              key={prog.exerciseName}
              onClick={() => toggleSeries(prog.exerciseName)}
              className={`flex items-center gap-2 px-2 py-1 bg-white/5 dark:bg-gray-800/50 rounded-md transition-opacity ${
                isHidden ? 'opacity-40' : 'opacity-100'
              } hover:opacity-80 cursor-pointer`}
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
            </button>
          );
        })}
      </div>
      {selectedPoint && (
        <div className="mb-4 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/30">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Selected:</span> {selectedPoint.exercise.replace('Barbell ', '')} - {format(new Date(selectedPoint.date), 'MMM d, yyyy')} - {selectedPoint.value} lbs
          </p>
        </div>
      )}
      <div className="w-full aspect-[16/9] min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#333" opacity={0.4} />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => format(new Date(value), 'MMM d')}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              label={{ value: '1RM (lbs)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9ca3af' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" opacity={0.5} />
            {progressions.map((prog) => {
              if (hiddenSeries.has(prog.exerciseName)) return null;
              return (
                <Line
                  key={prog.exerciseName}
                  type="monotone"
                  dataKey={prog.exerciseName}
                  stroke={colors[prog.exerciseName as keyof typeof colors] || '#0df269'}
                  strokeWidth={3}
                  strokeLinecap="round"
                  dot={<CustomDot />}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
              );
            })}
            <Brush
              dataKey="date"
              height={30}
              stroke="#6b7280"
              fill="#1f2937"
              tickFormatter={(value) => format(new Date(value), 'MMM d')}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

