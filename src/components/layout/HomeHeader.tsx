import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { getTimeBasedGreeting } from '@/utils/dateHelpers';
import { UserMenu } from './UserMenu';
import { fadeIn, prefersReducedMotion } from '@/utils/animations';

export function HomeHeader() {
  const { profile } = useUserStore();
  const greeting = getTimeBasedGreeting();
  const userName = profile?.name || 'User';

  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.header 
      className="flex items-center justify-between p-5 pt-6 bg-background-light dark:bg-background-dark sticky top-0 z-20"
      variants={shouldReduceMotion ? {} : fadeIn}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-3">
        <UserMenu />
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 leading-none mb-1">
            {greeting},
          </p>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-none tracking-tight">
            {userName}
          </h2>
        </div>
      </div>
      <motion.button 
        className="flex items-center justify-center size-10 rounded-full bg-surface-dark-light/50 text-white hover:bg-surface-dark-light transition-colors relative"
        whileHover={shouldReduceMotion ? {} : { scale: 1.1 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
      >
        <Bell className="w-5 h-5" />
        <motion.span 
          className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border border-surface-dark"
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      </motion.button>
    </motion.header>
  );
}

