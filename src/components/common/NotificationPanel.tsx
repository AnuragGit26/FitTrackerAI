import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    Check,
    CheckCheck,
    X,
    Activity,
    Brain,
    Trophy,
    AlertCircle,
    Clock,
} from 'lucide-react';
import { notificationService } from '@/services/notificationService';
import type { Notification, NotificationType } from '@/types/notification';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
    workout_reminder: Clock,
    muscle_recovery: Activity,
    ai_insight: Brain,
    system: AlertCircle,
    achievement: Trophy,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
    workout_reminder: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    muscle_recovery: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    ai_insight: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    system: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    achievement: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
};

function formatRelativeTime(timestamp: number): string {
    if (!timestamp || isNaN(timestamp)) {return '';}

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
    return 'Just now';
  }
    if (minutes < 60) {return `${minutes}m ago`;}
    if (hours < 24) {return `${hours}h ago`;}
    if (days < 7) {return `${days}d ago`;}

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {return '';}

    const nowDate = new Date();
    const diffDays = Math.floor((nowDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
        return `${diffDays}d ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupNotificationsByDate(notifications: Notification[]): {
    today: Notification[];
    yesterday: Notification[];
    thisWeek: Notification[];
    older: Notification[];
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const groups = {
        today: [] as Notification[],
        yesterday: [] as Notification[],
        thisWeek: [] as Notification[],
        older: [] as Notification[],
    };

    notifications.forEach((notification) => {
        const notificationDate = new Date(notification.createdAt);
        if (isNaN(notificationDate.getTime())) {return;}

        if (notificationDate >= today) {
            groups.today.push(notification);
        } else if (notificationDate >= yesterday) {
            groups.yesterday.push(notification);
        } else if (notificationDate >= thisWeek) {
            groups.thisWeek.push(notification);
        } else {
            groups.older.push(notification);
        }
    });

    return groups;
}

export function NotificationPanel({ isOpen, onClose, userId }: NotificationPanelProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isMarkingAll, setIsMarkingAll] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            // Load notifications from IndexedDB
            const [allNotifications, unread] = await Promise.all([
                notificationService.getNotifications({ userId, limit: 50 }),
                notificationService.getUnreadCount(userId),
            ]);
            setNotifications(allNotifications);
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (isOpen && userId) {
            loadNotifications();
        }
    }, [isOpen, userId, loadNotifications]);

    // Periodically refresh notifications when panel is open (every 5 minutes)
    useEffect(() => {
        if (!isOpen || !userId) {
    return;
  }

        const intervalId = setInterval(() => {
            loadNotifications();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(intervalId);
    }, [isOpen, userId, loadNotifications]);

    // Close panel when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen, onClose]);

    const handleMarkAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
        await loadNotifications();
    };

    const handleMarkAllAsRead = async () => {
        setIsMarkingAll(true);
        try {
            await notificationService.markAllAsRead(userId);
            await loadNotifications();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        } finally {
            setIsMarkingAll(false);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            await handleMarkAsRead(notification.id);
        }
    };

    const groupedNotifications = groupNotificationsByDate(notifications);
    const hasUnread = unreadCount > 0;

    if (!isOpen) {
    return null;
  }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        className="fixed top-16 right-4 z-50 w-full max-w-sm bg-gradient-to-b from-white to-gray-50 dark:from-surface-dark dark:to-surface-dark-light rounded-2xl shadow-2xl border border-gray-200 dark:border-primary/20 overflow-hidden flex flex-col max-h-[80vh]"
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                    >
                        {/* Header with gradient background */}
                        <div className="relative flex items-center justify-between p-5 border-b border-gray-200 dark:border-primary/10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
                                    <Bell className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Notifications
                                    </h3>
                                    {hasUnread && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {unreadCount} unread
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {hasUnread && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        disabled={isMarkingAll}
                                        className={cn(
                                            'p-2 rounded-xl hover:bg-primary/10 transition-all duration-200',
                                            'disabled:opacity-50 disabled:cursor-not-allowed',
                                            'hover:scale-105 active:scale-95'
                                        )}
                                        aria-label="Mark all as read"
                                        title="Mark all as read"
                                    >
                                        {isMarkingAll ? (
                                            <Clock className="w-4 h-4 text-primary animate-spin" />
                                        ) : (
                                            <CheckCheck className="w-4 h-4 text-primary" />
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-surface-border transition-all duration-200 hover:scale-105 active:scale-95"
                                    aria-label="Close notifications"
                                >
                                    <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 animate-pulse"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-surface-border" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-200 dark:bg-surface-border rounded w-3/4" />
                                                <div className="h-3 bg-gray-200 dark:bg-surface-border rounded w-full" />
                                                <div className="h-3 bg-gray-200 dark:bg-surface-border rounded w-1/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', duration: 0.5 }}
                                        className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4"
                                    >
                                        <Bell className="w-10 h-10 text-primary" />
                                    </motion.div>
                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                        All caught up!
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                                        You don&apos;t have any notifications right now. Check back later for updates!
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-surface-border">
                                    {/* Today */}
                                    {groupedNotifications.today.length > 0 && (
                                        <div>
                                            <div className="sticky top-0 px-4 py-2.5 text-xs font-bold text-primary uppercase tracking-wider bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-primary/10">
                                                Today
                                            </div>
                                            {groupedNotifications.today.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Yesterday */}
                                    {groupedNotifications.yesterday.length > 0 && (
                                        <div>
                                            <div className="sticky top-0 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-surface-border">
                                                Yesterday
                                            </div>
                                            {groupedNotifications.yesterday.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* This Week */}
                                    {groupedNotifications.thisWeek.length > 0 && (
                                        <div>
                                            <div className="sticky top-0 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-surface-border">
                                                This Week
                                            </div>
                                            {groupedNotifications.thisWeek.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    {/* Older */}
                                    {groupedNotifications.older.length > 0 && (
                                        <div>
                                            <div className="sticky top-0 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-white/80 dark:bg-surface-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-surface-border">
                                                Older
                                            </div>
                                            {groupedNotifications.older.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                    onClick={() => handleNotificationClick(notification)}
                                                    onMarkAsRead={() => handleMarkAsRead(notification.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

interface NotificationItemProps {
    notification: Notification;
    onClick: () => void;
    onMarkAsRead: () => void;
}

function NotificationItem({ notification, onClick, onMarkAsRead }: NotificationItemProps) {
    const Icon = NOTIFICATION_ICONS[notification.type];
    const colorClass = NOTIFICATION_COLORS[notification.type];
    const shouldReduceMotion = prefersReducedMotion();

    return (
        <motion.div
            className={cn(
                'flex items-start gap-3 p-4 cursor-pointer transition-all duration-200 group relative',
                'hover:bg-gray-100 dark:hover:bg-surface-dark-light',
                !notification.isRead && 'bg-gradient-to-r from-primary/8 via-primary/5 to-transparent dark:from-primary/15 dark:via-primary/10 dark:to-transparent border-l-2 border-primary'
            )}
            onClick={onClick}
            whileHover={shouldReduceMotion ? {} : { x: 4 }}
            transition={{ duration: 0.2 }}
        >
            {/* Icon with enhanced styling */}
            <motion.div
                className={cn('flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm', colorClass)}
                whileHover={shouldReduceMotion ? {} : { scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
            >
                <Icon className="w-5 h-5" />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={cn(
                        'text-sm font-semibold text-slate-900 dark:text-white',
                        !notification.isRead && 'font-bold text-slate-900 dark:text-white'
                    )}>
                        {notification.title}
                    </h4>

                    {/* Unread indicator badge */}
                    {!notification.isRead && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5 shadow-glow"
                        />
                    )}
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {notification.message}
                </p>

                <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-500 font-medium">
                        {formatRelativeTime(notification.createdAt)}
                    </p>

                    {/* Mark as read button - shows on hover for unread */}
                    {!notification.isRead && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead();
                            }}
                            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all duration-200"
                            aria-label="Mark as read"
                            title="Mark as read"
                        >
                            <Check className="w-3.5 h-3.5 text-primary" />
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

