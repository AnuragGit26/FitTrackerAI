import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '@/store/workoutStore';
import { useUserStore } from '@/store/userStore';
import { HomeHeader } from '@/components/layout/HomeHeader';
import { StatsCarousel } from '@/components/home/StatsCarousel';
import { AIFocusCard } from '@/components/home/AIFocusCard';
import { MuscleRecoverySection } from '@/components/home/MuscleRecoverySection';
import { QuickActions } from '@/components/home/QuickActions';
import { PlannedWorkoutsSection } from '@/components/home/PlannedWorkoutsSection';
import { staggerContainerSlow, slideUp, prefersReducedMotion } from '@/utils/animations';

export function Home() {
  const navigate = useNavigate();
  const { loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();

  useEffect(() => {
    if (profile) {
      loadWorkouts(profile.id);
    }
  }, [profile, loadWorkouts]);

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
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <StatsCarousel />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <AIFocusCard />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <MuscleRecoverySection />
        </motion.div>
        
        <motion.div variants={shouldReduceMotion ? {} : slideUp}>
          <QuickActions />
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
          className="pointer-events-auto shadow-[0_0_20px_rgba(13,242,105,0.4)] flex items-center justify-center gap-2 bg-primary hover:bg-[#0bd65d] text-background-dark h-14 rounded-full w-full max-w-[340px] font-bold text-lg tracking-wide transition-all group"
          whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          animate={shouldReduceMotion ? {} : {
            boxShadow: [
              '0 0 20px rgba(13,242,105,0.4)',
              '0 0 30px rgba(13,242,105,0.6)',
              '0 0 20px rgba(13,242,105,0.4)',
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
