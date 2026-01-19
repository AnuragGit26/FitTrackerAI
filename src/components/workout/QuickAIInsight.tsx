import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeIn, prefersReducedMotion } from '@/utils/animations';
import { Skeleton } from '@/components/common/Skeleton';
import { cleanPlainTextResponse } from '@/utils/aiResponseCleaner';
import type { AIInsights } from '@/hooks/useAIInsights';

interface QuickAIInsightProps {
  insight: AIInsights | null;
  isLoading: boolean;
  variant: 'banner' | 'card' | 'inline';
  onDismiss?: () => void;
}

export function QuickAIInsight({ insight, isLoading, variant }: QuickAIInsightProps) {
  const shouldReduceMotion = prefersReducedMotion();

  const sizeClasses = {
    banner: 'p-4 rounded-xl',
    card: 'p-3 rounded-lg',
    inline: 'p-2 rounded-md'
  };

  if (isLoading) {
    return (
      <div className={`w-full ${sizeClasses[variant]}`}>
        <Skeleton height={60} className="rounded-lg" />
      </div>
    );
  }

  const displayText = insight?.recommendations?.[0] ||
    "Let's make today count! Start with your first exercise.";

  return (
    <motion.div
      variants={shouldReduceMotion ? {} : fadeIn}
      className={`w-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 ${sizeClasses[variant]}`}
    >
      <div className="flex items-start gap-3">
        <Bot className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white mb-1">AI Insight</h4>
          <p className="text-sm text-gray-200 leading-relaxed">
            {cleanPlainTextResponse(displayText)}
          </p>
          {insight?.tip && (
            <p className="text-xs text-primary/80 mt-2 italic">
              💡 {cleanPlainTextResponse(insight.tip)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
