import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { modalBackdrop, modalContent, prefersReducedMotion } from '@/utils/animations';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  header,
  footer,
  closeOnBackdropClick = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus trap: focus the modal when it opens
      setTimeout(() => {
        const modalElement = modalRef.current;
        if (modalElement) {
          modalElement.focus();
        }
      }, 100);
    } else {
      document.body.style.overflow = '';
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap: keep focus within modal
  useEffect(() => {
    if (!isOpen) {return;}

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') {return;}

      const modal = modalRef.current;
      if (!modal) {return;}

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  const shouldReduceMotion = prefersReducedMotion();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm safe-area-inset"
          onClick={handleBackdropClick}
          variants={shouldReduceMotion ? {} : modalBackdrop}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
            className={cn(
              'bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-transparent w-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              sizes[size],
              'max-h-[90vh] overflow-hidden flex flex-col'
            )}
            onClick={(e) => e.stopPropagation()}
            variants={shouldReduceMotion ? {} : modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {(title || showCloseButton || header) && (
              <div className="relative flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-border-dark flex-shrink-0">
                {header ? (
                  header
                ) : (
                  <>
                    {title && (
                      <h2 id="modal-title" className="text-xl font-bold text-slate-900 dark:text-white pr-8">
                        {title}
                      </h2>
                    )}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-dark transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        aria-label="Close modal"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
            {footer && (
              <div className="flex-shrink-0 border-t border-gray-100 dark:border-border-dark p-4 sm:p-6">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

