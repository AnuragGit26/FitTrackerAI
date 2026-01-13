import { useState, useCallback } from 'react';
import { ToastType } from '@/components/common/Toast';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    action?: { label: string; onClick: () => void }
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, action }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((message: string, action?: { label: string; onClick: () => void }) =>
    showToast(message, 'success', action), [showToast]);
  const error = useCallback((message: string, action?: { label: string; onClick: () => void }) =>
    showToast(message, 'error', action), [showToast]);
  const warning = useCallback((message: string, action?: { label: string; onClick: () => void }) =>
    showToast(message, 'warning', action), [showToast]);
  const info = useCallback((message: string, action?: { label: string; onClick: () => void }) =>
    showToast(message, 'info', action), [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

