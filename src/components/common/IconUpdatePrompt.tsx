import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Smartphone, Info } from 'lucide-react';
import { iconRefreshService } from '@/services/iconRefreshService';

export function IconUpdatePrompt() {
  const [show, setShow] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if icon update is needed and user hasn't been prompted yet
    const checkIconUpdate = async () => {
      const status = iconRefreshService.checkIconVersion();

      if (status.needsRefresh && !iconRefreshService.hasBeenPrompted()) {
        // Wait a bit before showing (let app load first)
        setTimeout(() => {
          setShow(true);
        }, 2000);
      }
    };

    checkIconUpdate();
  }, []);

  const handleDismiss = () => {
    iconRefreshService.markAsPrompted();
    setShow(false);
  };

  const handleShowInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  if (!show) return null;

  const instructions = iconRefreshService.getUpdateInstructions();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
      >
        <div className="bg-gradient-to-br from-surface-dark to-background-dark border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/10">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Icon Updated!</h3>
                <p className="text-xs text-gray-400">New app icon available</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-3">
            <p className="text-sm text-gray-300 mb-2">
              We&apos;ve updated the app icon! To see it on your home screen:
            </p>

            {/* Platform-specific badge */}
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {instructions.platform} Instructions
              </span>
            </div>

            {/* Toggle Instructions */}
            <button
              onClick={handleShowInstructions}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-2"
            >
              <Info className="w-4 h-4" />
              <span>{showInstructions ? 'Hide' : 'Show'} instructions</span>
            </button>

            {/* Instructions List */}
            <AnimatePresence>
              {showInstructions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <ol className="space-y-2 mt-3">
                    {instructions.instructions.map((instruction, index) => (
                      <li
                        key={index}
                        className="flex gap-2 text-xs text-gray-300"
                      >
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <span className="pt-0.5">{instruction}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleShowInstructions}
              className="flex-1 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-bold text-background-dark transition-colors shadow-lg shadow-primary/20"
            >
              {showInstructions ? 'Got It!' : 'Show How'}
            </button>
          </div>

          {/* Dismiss hint */}
          <p className="text-[10px] text-gray-500 text-center mt-2">
            This message will only show once
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
