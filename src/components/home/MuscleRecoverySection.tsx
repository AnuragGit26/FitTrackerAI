import { Dumbbell } from 'lucide-react';
import { useMuscleRecovery } from '@/hooks/useMuscleRecovery';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/common/EmptyState';
import { RecoveryScoreCard } from './RecoveryScoreCard';
import { RecoveryTrendChart } from './RecoveryTrendChart';
import { RecoveryInsightsCard } from './RecoveryInsightsCard';
import { MuscleGroupCards } from './MuscleGroupCards';
import { motion } from 'framer-motion';
import { slideUp, prefersReducedMotion, staggerContainerSlow } from '@/utils/animations';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { logger } from '@/utils/logger';
import { useMemo } from 'react';

export function MuscleRecoverySection() {
  const { muscleStatuses, isLoading } = useMuscleRecovery();
  const navigate = useNavigate();

  // Safe muscle statuses with fallback
  const safeMuscleStatuses = useMemo(() => {
    try {
      return Array.isArray(muscleStatuses) ? muscleStatuses : [];
    } catch {
      return [];
    }
  }, [muscleStatuses]);

  // Safe isLoading with fallback
  const safeIsLoading = useMemo(() => {
    try {
      return typeof isLoading === 'boolean' ? isLoading : false;
    } catch {
      return false;
    }
  }, [isLoading]);

  const shouldReduceMotion = useMemo(() => {
    try {
      return prefersReducedMotion();
    } catch {
      return false;
    }
  }, []);

  const containerVariants = useMemo(() => {
    try {
      return shouldReduceMotion ? {} : (staggerContainerSlow || {});
    } catch {
      return {};
    }
  }, [shouldReduceMotion]);

  const slideUpVariant = useMemo(() => {
    try {
      return shouldReduceMotion ? {} : (slideUp || {});
    } catch {
      return {};
    }
  }, [shouldReduceMotion]);

  // Safe navigation handler
  const handleNavigate = () => {
    try {
      navigate('/log-workout');
    } catch (err) {
      logger.error('[MuscleRecoverySection] Navigation error:', err);
      try {
        window.location.href = '/log-workout';
      } catch (fallbackErr) {
        logger.error('[MuscleRecoverySection] Fallback navigation also failed:', fallbackErr);
      }
    }
  };

  if (!safeIsLoading && safeMuscleStatuses.length === 0) {
    return (
      <motion.div
        className="mt-8"
        variants={slideUpVariant}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold px-5 pb-2">
          Muscle Recovery
        </h2>
        <div className="px-5">
          <div className="rounded-2xl bg-white dark:bg-surface-dark-light border border-gray-200 dark:border-surface-dark-light p-6">
            <EmptyState
              icon={Dumbbell}
              title="No recovery data yet"
              description="Log workouts to track muscle recovery and optimize your training schedule."
              action={
                <button
                  onClick={handleNavigate}
                  className="px-4 py-2 rounded-lg bg-primary text-background-dark font-bold text-sm hover:bg-primary/90 transition-colors"
                >
                  Log a Workout
                </button>
              }
              className="py-8"
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mt-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={containerVariants}>
        <motion.div variants={slideUpVariant}>
          <h2 className="text-slate-900 dark:text-white tracking-tight text-xl font-bold px-5 pb-2">
            Muscle Recovery
          </h2>
        </motion.div>

        <div className="flex flex-col gap-4">
          <ErrorBoundary fallback={null}>
            <motion.div variants={slideUpVariant} className="px-5">
              <RecoveryScoreCard />
            </motion.div>
          </ErrorBoundary>

          <ErrorBoundary fallback={null}>
            <motion.div variants={slideUpVariant} className="px-5">
              <RecoveryTrendChart />
            </motion.div>
          </ErrorBoundary>

          <ErrorBoundary fallback={null}>
            <motion.div variants={slideUpVariant}>
              <div className="mb-3 px-5">
                <p className="text-slate-500 dark:text-gray-300 text-xs font-medium uppercase tracking-wider">
                  Muscle Groups
                </p>
              </div>
              <MuscleGroupCards />
            </motion.div>
          </ErrorBoundary>

          <ErrorBoundary fallback={null}>
            <motion.div variants={slideUpVariant} className="px-5">
              <RecoveryInsightsCard />
            </motion.div>
          </ErrorBoundary>
        </div>
      </motion.div>
    </motion.div>
  );
}

