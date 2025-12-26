import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { rpeService, RPEMetrics } from '@/services/rpeService';
import { Workout } from '@/types/workout';
import { DateRange } from '@/utils/analyticsHelpers';
import { cn } from '@/utils/cn';
import { getRpeColor } from '@/utils/rpeHelpers';

interface RPEAnalyticsCardProps {
  workouts: Workout[];
  dateRange: DateRange;
}

export function RPEAnalyticsCard({ workouts, dateRange }: RPEAnalyticsCardProps) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const metrics: RPEMetrics = rpeService.getAllMetrics(workouts, dateRange);
  const trend = rpeService.detectTrend(metrics.trend);

  const exerciseData = selectedExercise
    ? metrics.exerciseBreakdown.filter((ex) => ex.exerciseId === selectedExercise)
    : metrics.exerciseBreakdown.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Average RPE
            </span>
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-3xl font-bold"
              style={{ color: getRpeColor(metrics.averageRPE) }}
            >
              {metrics.averageRPE.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">/ 10</span>
          </div>
          {trend !== 'stable' && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trend === 'increasing' ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Increasing intensity</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">Decreasing intensity</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Total Sets Tracked
            </span>
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.exerciseBreakdown.reduce((sum, ex) => sum + ex.setCount, 0)}
          </span>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Exercises Tracked
            </span>
          </div>
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {metrics.exerciseBreakdown.length}
          </span>
        </div>
      </div>

      {/* RPE Trend Chart */}
      {metrics.trend.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            RPE Trend Over Time
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                domain={[0, 10]}
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="rpe"
                stroke={getRpeColor(metrics.averageRPE)}
                strokeWidth={2}
                dot={{ fill: getRpeColor(metrics.averageRPE), r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exercise Breakdown */}
      {metrics.exerciseBreakdown.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            RPE by Exercise
          </h3>
          <div className="space-y-3">
            {exerciseData.map((exercise) => (
              <div
                key={exercise.exerciseId}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-surface-darker"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {exercise.exerciseName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {exercise.setCount} sets
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className="text-2xl font-bold"
                      style={{ color: getRpeColor(exercise.averageRPE) }}
                    >
                      {exercise.averageRPE.toFixed(1)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">avg RPE</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Volume vs RPE Correlation */}
      {metrics.volumeCorrelation.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Volume vs RPE Correlation
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.volumeCorrelation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="volume"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                domain={[0, 10]}
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar
                dataKey="averageRPE"
                fill={getRpeColor(metrics.averageRPE)}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

