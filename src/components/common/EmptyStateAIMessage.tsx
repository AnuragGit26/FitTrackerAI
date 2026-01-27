import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { aiEmptyStateService } from '@/services/aiEmptyStateService';
import { Skeleton } from '@/components/common/Skeleton';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateAIMessageProps {
    screenName: 'Home' | 'Analytics' | 'Insights' | 'History' | 'Templates';
    className?: string;
}

export function EmptyStateAIMessage({ screenName, className = '' }: EmptyStateAIMessageProps) {
    const { profile } = useUserStore();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const isMounted = true;

        async function fetchMessage() {
            const hours = new Date().getHours();
            const timeOfDay = hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';
            const userName = profile?.name || 'Athlete';

            try {
                const msg = await aiEmptyStateService.generateMessage({
                    userName,
                    screenName,
                    timeOfDay,
                });

                if (isMounted) {
                    setMessage(msg);
                    setIsLoading(false);
                }
            } catch (error) {
                if (isMounted) {
                    // Service handles fallback internally, but safe default here
                    setMessage(`Welcome, ${userName}! Let's get started.`);
                    setIsLoading(false);
                }
            }
        }

        if (profile) {
            fetchMessage();
        } else {
            // If profile isn't loaded yet, don't fetch but don't stop loading state if we expect it soon
            // Or we can just wait.
        }
    }, [profile, screenName]);

    if (isLoading) {
        return (
            <div className={`space-y-2 ${className}`}>
                <Skeleton variant="text" className="w-3/4 h-6" />
                <Skeleton variant="text" className="w-1/2 h-6" />
            </div>
        );
    }

    if (!message) {
    return null;
  }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`relative p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 ${className}`}
        >
            <div className="absolute -top-3 -left-2 bg-background-light dark:bg-background-dark p-1 rounded-full border border-primary/20 shadow-sm">
                <Sparkles className="w-5 h-5 text-primary fill-primary/20" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                &ldquo;{message}&rdquo;
            </p>
        </motion.div>
    );
}
