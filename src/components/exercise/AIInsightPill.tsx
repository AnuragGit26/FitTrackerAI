import { cn } from '@/utils/cn';
import { Sparkles } from 'lucide-react';

interface AIInsightPillProps {
  insight: string;
  className?: string;
}

export function AIInsightPill({ insight, className }: AIInsightPillProps) {
  return (
    <div
      className={cn(
        'flex h-auto py-2 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/10 dark:bg-[#224932] border border-primary/20 pl-3 pr-4 shadow-sm',
        className
      )}
    >
      <Sparkles className="w-5 h-5 text-primary" />
      <p className="text-slate-700 dark:text-white text-sm font-medium leading-normal">
        AI: {insight}
      </p>
    </div>
  );
}

