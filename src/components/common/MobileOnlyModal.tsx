import { useEffect, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * Detects if the current viewport is mobile-sized
 * Uses both viewport width and touch capability for better detection
 */
function isMobileViewport(): boolean {
  // Check viewport width (mobile breakpoint at 768px)
  const isMobileWidth = window.innerWidth < 768;
  
  // Check if device has touch capability (mobile devices typically do)
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Consider it mobile if width is small OR if it's a small width with touch
  return isMobileWidth || (window.innerWidth < 1024 && hasTouchScreen);
}

export function MobileOnlyModal() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip modal entirely if running in Cypress or other test environments
    if (
      typeof window !== 'undefined' &&
      ((window as Window & { Cypress?: unknown; __CYPRESS__?: unknown }).Cypress ||
       (window as Window & { Cypress?: unknown; __CYPRESS__?: unknown }).__CYPRESS__ ||
       process.env.NODE_ENV === 'test')
    ) {
      setIsChecking(false);
      setIsDesktop(false);
      return;
    }

    // Initial check
    const checkViewport = () => {
      const mobile = isMobileViewport();
      setIsDesktop(!mobile);
      setIsChecking(false);
    };

    checkViewport();

    // Listen for resize events
    window.addEventListener('resize', checkViewport);

    // Also check on orientation change (for mobile devices)
    window.addEventListener('orientationchange', () => {
      // Small delay to allow viewport to update after orientation change
      setTimeout(checkViewport, 100);
    });

    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
    };
  }, []);

  // Prevent body scrolling when modal is shown
  useEffect(() => {
    if (isDesktop && !isChecking) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isDesktop, isChecking]);

  // Don't show anything while checking or if on mobile
  if (isChecking || !isDesktop) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-light dark:bg-background-dark pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className={cn(
            'bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-[#316847]/50',
            'w-full max-w-md p-6',
            'flex flex-col items-center text-center gap-4'
          )}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Mobile-Only App
            </h2>
            <p className="text-slate-600 dark:text-gray-400 text-base leading-relaxed">
              FitTrackAI is optimized for mobile devices. Please open this app on your smartphone or tablet for the best experience.
            </p>
          </div>

          <div className="w-full pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-start gap-3 text-left">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Optimized for Mobile
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Designed specifically for touch interactions and mobile screens
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-left">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Better Experience
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Access all features with native mobile performance
                </p>
              </div>
            </div>
          </div>

          <div className="w-full pt-2">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Current viewport: {window.innerWidth}px × {window.innerHeight}px
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
