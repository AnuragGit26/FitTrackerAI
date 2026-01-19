import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkoutStore, useWorkoutError } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { HomeHeader } from '@/components/layout/HomeHeader';
import { StatsCarousel } from '@/components/home/StatsCarousel';
import { EmptyStateAIMessage } from '@/components/common/EmptyStateAIMessage';
import { AIFocusCard } from '@/components/home/AIFocusCard';
import { MuscleRecoverySection } from '@/components/home/MuscleRecoverySection';
import { QuickActions } from '@/components/home/QuickActions';
import { PlannedWorkoutsSection } from '@/components/home/PlannedWorkoutsSection';
import { staggerContainerSlow, slideUp, prefersReducedMotion } from '@/utils/animations';

export function Home() {
  const navigate = useNavigate();
  const { loadWorkouts, workouts } = useWorkoutStore();
  const { profile } = useUserStore();
  const error = useWorkoutError();

  useEffect(() => {
    if (profile?.id) {
      loadWorkouts(profile.id).catch(err => {
        console.error('[Home] Failed to load workouts:', err);
        // Error is already handled by workoutStore, just log it
      });
    }
  }, [profile?.id, loadWorkouts]);

  const handleStartWorkout = () => {
    navigate('/workout-templates');
  };

  const shouldReduceMotion = prefersReducedMotion();
  const containerVariants = shouldReduceMotion ? {} : staggerContainerSlow;

  return (
    <div className="relative flex flex-col h-full w-full max-w-md mx-auto min-h-screen bg-background-light dark:bg-background-dark pb-36">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <HomeHeader />
        </motion.div>

        {workouts.length === 0 && (
          <motion.div variants={shouldReduceMotion ? {} : slideUp} className="mx-4 mt-4">
            <EmptyStateAIMessage screenName="Home" />
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            variants={shouldReduceMotion ? {} : slideUp}
            className="mx-4 mt-4 mb-2"
          >
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-error font-medium mb-2">Unable to load workouts</p>
                <p className="text-xs text-error/80 mb-3">{error}</p>
                <button
                  onClick={() => profile?.id && loadWorkouts(profile.id)}
                  className="text-xs font-medium text-error hover:text-error/80 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <StatsCarousel />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <QuickActions />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <AIFocusCard />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <MuscleRecoverySection />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <PlannedWorkoutsSection />
        </motion.div>
      </motion.div>
      
      {/* Floating Action Button (Main Start) */}
      <motion.div 
        className="fixed bottom-24 left-0 right-0 px-5 z-10 flex justify-center pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <motion.button
          onClick={handleStartWorkout}
          className="pointer-events-auto shadow-[0_0_20px_rgba(255,153,51,0.4)] flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-background-dark h-14 rounded-full w-full max-w-[340px] font-bold text-lg tracking-wide transition-all group"
          whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          animate={shouldReduceMotion ? {} : {
            boxShadow: [
              '0 0 20px rgba(255,153,51,0.4)',
              '0 0 30px rgba(255,153,51,0.6)',
              '0 0 20px rgba(255,153,51,0.4)',
            ],
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }
          }}
        >
          <motion.div
            animate={shouldReduceMotion ? {} : {
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5
            }}
          >
            <Play className="w-6 h-6" />
          </motion.div>
          START WORKOUT
        </motion.button>
      </motion.div>
    </div>
  );
}
