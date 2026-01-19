import { cn } from '@/utils/cn';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface WeightChangeBadgeProps {
  change: number;
  className?: string;
}

export function WeightChangeBadge({ change, className }: WeightChangeBadgeProps) {
  if (Math.abs(change) < 0.5) {return null;}

  const isPositive = change > 0;
  const displayValue = `${isPositive ? '+' : ''}${change.toFixed(1)}`;

  return (
    <span
      className={cn(
        'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded',
        isPositive
          ? 'text-primary bg-primary/10'
          : 'text-slate-500 bg-slate-200 dark:bg-white/10',
        className
      )}
    >
      {isPositive ? (
        <ArrowUp className="w-2.5 h-2.5" />
      ) : (
        <ArrowDown className="w-2.5 h-2.5" />
      )}
      {displayValue}
    </span>
  );
}

