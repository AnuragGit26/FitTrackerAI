import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { toastSlideIn, prefersReducedMotion } from '@/utils/animations';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({ message, type = 'info', duration = 3000, onClose, action }: ToastProps) {
  // Use longer duration for toasts with actions to give user time to click
  const effectiveDuration = action && duration === 3000 ? 8000 : duration;

  useEffect(() => {
    if (effectiveDuration > 0) {
      const timer = setTimeout(onClose, effectiveDuration);
      return () => clearTimeout(timer);
    }
  }, [effectiveDuration, onClose]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: 'bg-success/10 text-success border-success/20',
    error: 'bg-error/10 text-error border-error/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-primary-50 text-primary-600 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800',
  };

  const Icon = icons[type];
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.div
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm',
        styles[type]
      )}
      variants={shouldReduceMotion ? {} : toastSlideIn}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
    >
      <motion.div
        animate={shouldReduceMotion ? {} : {
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
      </motion.div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-3 py-1.5 text-sm font-medium rounded hover:bg-white/10 transition-colors"
        >
          {action.label}
        </button>
      )}
      <motion.button
        onClick={onClose}
        className="p-2 rounded hover:bg-black/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
        aria-label="Close toast"
        whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 90 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
    action?: { label: string; onClick: () => void };
  }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-[calc(100%-2rem)] px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            className="pointer-events-auto"
          >
            <Toast
              message={toast.message}
              type={toast.type}
              action={toast.action}
              onClose={() => onRemove(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

