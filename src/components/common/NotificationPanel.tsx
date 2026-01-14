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
    muscle_recovery: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    ai_insight: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    system: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    achievement: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
};

function formatRelativeTime(timestamp: number): string {
    if (!timestamp || isNaN(timestamp)) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

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
        if (isNaN(notificationDate.getTime())) return;

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
        if (!isOpen || !userId) return;

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

    if (!isOpen) return null;

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
                        className="fixed top-16 right-4 z-50 w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-surface-border overflow-hidden flex flex-col max-h-[80vh]"
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-border">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Notifications
                                </h3>
                                {hasUnread && (
                                    <span className="px-2 py-0.5 bg-primary text-black text-xs font-bold rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {hasUnread && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        disabled={isMarkingAll}
                                        className={cn(
                                            'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-light transition-colors',
                                            'disabled:opacity-50 disabled:cursor-not-allowed'
                                        )}
                                        aria-label="Mark all as read"
                                    >
                                        {isMarkingAll ? (
                                            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400 animate-spin" />
                                        ) : (
                                            <CheckCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-dark-light transition-colors"
                                    aria-label="Close notifications"
                                >
                                    <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            className="animate-pulse space-y-2"
                                        >
                                            <div className="h-4 bg-gray-200 dark:bg-surface-border rounded w-3/4" />
                                            <div className="h-3 bg-gray-200 dark:bg-surface-border rounded w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-surface-dark-light flex items-center justify-center mb-4">
                                        <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        No notifications
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        You&apos;re all caught up!
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200 dark:divide-surface-border">
                                    {/* Today */}
                                    {groupedNotifications.today.length > 0 && (
                                        <div>
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-dark-light">
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
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-dark-light">
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
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-dark-light">
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
                                            <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-gray-50 dark:bg-surface-dark-light">
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
                'flex items-start gap-3 p-4 cursor-pointer transition-colors',
                'hover:bg-gray-50 dark:hover:bg-surface-dark-light',
                !notification.isRead && 'bg-primary/5 dark:bg-primary/10'
            )}
            onClick={onClick}
            whileHover={shouldReduceMotion ? {} : { backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
            transition={{ duration: 0.15 }}
        >
            {/* Icon */}
            <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', colorClass)}>
                <Icon className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                        <h4 className={cn(
                            'text-sm font-semibold text-slate-900 dark:text-white mb-1',
                            !notification.isRead && 'font-bold'
                        )}>
                            {notification.title}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {formatRelativeTime(notification.createdAt)}
                        </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                    )}

                    {/* Mark as read button */}
                    {!notification.isRead && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead();
                            }}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-surface-border transition-colors"
                            aria-label="Mark as read"
                        >
                            <Check className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

