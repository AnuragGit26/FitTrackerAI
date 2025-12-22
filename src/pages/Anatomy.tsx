import { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { Calendar, Activity, BatteryCharging } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Lazy load Three.js components for better performance
const MuscleMap = lazy(() => import('@/components/anatomy/MuscleMap').then(m => ({ default: m.MuscleMap })));

export function Anatomy() {
  const navigate = useNavigate();
  const { muscleStatuses, isLoading } = useMuscleRecovery();

  const stats = useMemo(() => {
    if (isLoading || muscleStatuses.length === 0) {
      return {
        recoveryScore: 85,
        recoveryChange: 5,
        readiness: 'High',
        readinessChange: 2,
      };
    }

    const avgRecovery = Math.round(
      muscleStatuses.reduce((sum, m) => sum + m.recoveryPercentage, 0) / muscleStatuses.length
    );

    const readyCount = muscleStatuses.filter(
      (m) => m.recoveryStatus === 'ready' || m.recoveryStatus === 'fresh'
    ).length;
    const readinessPercentage = Math.round((readyCount / muscleStatuses.length) * 100);

    return {
      recoveryScore: avgRecovery,
      recoveryChange: 5,
      readiness: readinessPercentage >= 70 ? 'High' : readinessPercentage >= 40 ? 'Medium' : 'Low',
      readinessChange: 2,
    };
  }, [muscleStatuses, isLoading]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white antialiased transition-colors duration-200">
      <Header
        title="Body Status"
        showBack
        rightAction={
          <button
            onClick={() => {}}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Calendar"
          >
            <Calendar className="w-5 h-5" />
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="flex flex-wrap gap-4 p-4">
        <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex justify-between items-start">
            <Activity className="text-primary text-2xl" />
            <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded-full">
              +{stats.recoveryChange}%
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-2">
            Recovery Score
          </p>
          <p className="text-gray-900 dark:text-white text-2xl font-bold leading-tight">
            {stats.recoveryScore}%
          </p>
        </div>

        <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-dark shadow-sm border border-gray-100 dark:border-white/5">
          <div className="flex justify-between items-start">
            <BatteryCharging className="text-orange-400 text-2xl" />
            <span className="text-orange-400 text-xs font-bold bg-orange-400/10 px-2 py-0.5 rounded-full">
              +{stats.readinessChange}%
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-2">
            Readiness
          </p>
          <p className="text-gray-900 dark:text-white text-2xl font-bold leading-tight">
            {stats.readiness}
          </p>
        </div>
      </div>

      {/* Muscle Map */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <MuscleMap />
      </Suspense>
    </div>
  );
}
