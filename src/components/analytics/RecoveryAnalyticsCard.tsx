import { useState } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { sleepRecoveryService } from '@/services/sleepRecoveryService';
import { RecoveryLog, RecoveryMetrics } from '@/types/sleep';
import { DateRange } from '@/utils/analyticsHelpers';
import { cn } from '@/utils/cn';

interface RecoveryAnalyticsCardProps {
  recoveryLogs: RecoveryLog[];
  dateRange: DateRange;
}

const COLORS = ['#0df269', '#fbbf24', '#ef4444'];

export function RecoveryAnalyticsCard({ recoveryLogs, dateRange }: RecoveryAnalyticsCardProps) {
  const metrics: RecoveryMetrics = sleepRecoveryService.calculateRecoveryMetrics(recoveryLogs);

  const readinessData = [
    { name: 'Full Power', value: metrics.readinessDistribution['full-power'] },
    { name: 'Light', value: metrics.readinessDistribution['light'] },
    { name: 'Rest Day', value: metrics.readinessDistribution['rest-day'] },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Avg Recovery
            </span>
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {metrics.averageRecovery.toFixed(0)}
            </span>
            <span className="text-sm text-gray-400">%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Avg Stress
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-sky-400">
              {metrics.averageStress.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">/ 10</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Avg Energy
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-yellow-400">
              {metrics.averageEnergy.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">/ 10</span>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Avg Soreness
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400">
              {metrics.averageSoreness.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">/ 10</span>
          </div>
        </div>
      </div>

      {/* Recovery Trend */}
      {metrics.recoveryTrend.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Recovery Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics.recoveryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: '#6b7280' }}
                label={{ value: 'Recovery %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`${value.toFixed(0)}%`, 'Recovery']}
              />
              <Line
                type="monotone"
                dataKey="recovery"
                stroke="#0df269"
                strokeWidth={2}
                dot={{ fill: '#0df269', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Readiness Distribution */}
      {recoveryLogs.length > 0 && (
        <div className="bg-white dark:bg-surface-dark rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Readiness Distribution
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={readinessData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {readinessData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

