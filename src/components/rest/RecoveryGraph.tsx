import { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { calculateRecoveryTrendData } from '@/utils/recoveryHelpers';
import { sleepRecoveryService } from '@/services/sleepRecoveryService';
import { SleepLog } from '@/types/sleep';

export function RecoveryGraph() {
  const { muscleStatuses } = useMuscleRecovery();
  const { profile } = useUserStore();
  const { settings } = useSettingsStore();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);

  useEffect(() => {
    async function fetchSleepLogs() {
      if (profile?.id) {
        try {
          const logs = await sleepRecoveryService.getAllSleepLogs(profile.id);
          setSleepLogs(logs);
        } catch (error) {
          console.error('Failed to fetch sleep logs for graph:', error);
        }
      }
    }
    fetchSleepLogs();
  }, [profile?.id]);

  // Calculate historical recovery data for the last 7 days using shared helper
  const chartData = useMemo(() => {
    if (!profile) {
    return [];
  }

    const baseRestInterval = settings.baseRestInterval || 48;

    return calculateRecoveryTrendData(
      muscleStatuses,
      profile.experienceLevel,
      baseRestInterval,
      sleepLogs
    );
  }, [muscleStatuses, profile, settings.baseRestInterval, sleepLogs]);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0df269" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#0df269" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="currentColor" 
            strokeOpacity={0.1}
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            hide
          />
          <Area
            type="monotone"
            dataKey="recovery"
            stroke="#0df269"
            strokeWidth={2}
            fill="url(#recoveryGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#0df269' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

