import { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '@/store/userStore';
import { getTimeBasedGreeting } from '@/utils/dateHelpers';
import { UserMenu } from './UserMenu';
import { NotificationPanel } from '@/components/common/NotificationPanel';
import { notificationService } from '@/services/notificationService';
import { fadeIn, prefersReducedMotion } from '@/utils/animations';

export function HomeHeader() {
  const { profile } = useUserStore();
  const greeting = getTimeBasedGreeting();
  const userName = profile?.name || 'User';
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const shouldReduceMotion = prefersReducedMotion();

  const loadUnreadCount = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const count = await notificationService.getUnreadCount(profile.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [profile?.id]);

  // Load unread count
  useEffect(() => {
    if (profile?.id) {
      loadUnreadCount();
      // Refresh unread count every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [profile?.id, loadUnreadCount]);

  const handleNotificationClick = () => {
    setIsNotificationPanelOpen(!isNotificationPanelOpen);
    // Refresh notifications when opening
    if (!isNotificationPanelOpen && profile?.id) {
      loadUnreadCount();
    }
  };

  return (
    <>
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
          onClick={handleNotificationClick}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <motion.span 
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-background-light dark:border-background-dark"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      </motion.header>

      {profile?.id && (
        <NotificationPanel
          isOpen={isNotificationPanelOpen}
          onClose={() => setIsNotificationPanelOpen(false)}
          userId={profile.id}
        />
      )}
    </>
  );
}

