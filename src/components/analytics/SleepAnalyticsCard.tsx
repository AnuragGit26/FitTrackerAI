import { Moon, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { sleepRecoveryService } from '@/services/sleepRecoveryService';
import { SleepLog, SleepMetrics } from '@/types/sleep';
import { DateRange } from '@/utils/analyticsHelpers';

interface SleepAnalyticsCardProps {
  sleepLogs: SleepLog[];
  dateRange: DateRange;
}

export function SleepAnalyticsCard({ sleepLogs, dateRange: _dateRange }: SleepAnalyticsCardProps) {
  const metrics: SleepMetrics = sleepRecoveryService.calculateSleepMetrics(sleepLogs);

  const averageHours = metrics.averageDuration / 60;
  const optimalSleepCount = sleepLogs.filter(
    (log) => log.duration >= 420 && log.duration <= 540
  ).length;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Avg Sleep Duration
            </span>
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {averageHours.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">hours</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {optimalSleepCount} of {sleepLogs.length} nights optimal
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Sleep Quality
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {metrics.averageQuality.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">/ 10</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {metrics.optimalSleepPercentage.toFixed(0)}% optimal nights
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Consistency
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.consistencyScore.toFixed(0)}
            </span>
            <span className="text-sm text-gray-400">/ 100</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs">
            {metrics.consistencyScore >= 70 ? (
              <>
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-green-500">Great consistency</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-yellow-500" />
                <span className="text-yellow-500">Improve consistency</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sleep Duration Trend */}
      {metrics.sleepTrend.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Sleep Duration Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.sleepTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`${value.toFixed(1)}h`, 'Duration']}
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#0df269"
                strokeWidth={2}
                dot={{ fill: '#0df269', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sleep Quality Trend */}
      {metrics.sleepTrend.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Sleep Quality Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metrics.sleepTrend}>
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
                formatter={(value: number) => [`${value.toFixed(1)}/10`, 'Quality']}
              />
              <Bar
                dataKey="quality"
                fill="#0df269"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

