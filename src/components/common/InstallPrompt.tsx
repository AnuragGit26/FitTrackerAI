import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
    } catch (error) {
      console.error('Failed to install app:', error);
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setDeferredPrompt(null);
    // Store dismissal in localStorage to avoid showing again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Check if user recently dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        setIsVisible(false);
      }
    }
  }, []);

  if (!isVisible || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 safe-area-inset-bottom"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-surface-border p-4 max-w-lg mx-auto">
          {/* Mobile-first: Stack vertically on small screens, horizontal on larger */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 sm:gap-2">
                <div className="flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Download className="w-5 h-5 sm:w-4 sm:h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-sm mb-1">
                    Install FitTrackAI
                  </h3>
                  <p className="text-sm sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Add to your home screen for quick access and offline support
                  </p>
                </div>
              </div>
            </div>
            
            {/* Buttons: Stack on mobile, side-by-side on larger screens */}
            <div className="flex items-center gap-2 sm:flex-shrink-0">
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className={cn(
                  'flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-primary hover:bg-[#0be060] active:bg-[#0be060]',
                  'text-black font-semibold rounded-xl transition-colors',
                  'flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'touch-manipulation'
                )}
              >
                <Download className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="text-base sm:text-sm">
                  {isInstalling ? 'Installing...' : 'Install'}
                </span>
              </button>
              <button
                onClick={handleDismiss}
                className={cn(
                  'p-3 sm:p-2 hover:bg-gray-100 dark:hover:bg-surface-dark-light',
                  'rounded-xl sm:rounded-lg transition-colors flex-shrink-0',
                  'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center',
                  'touch-manipulation'
                )}
                aria-label="Dismiss"
              >
                <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

