import { Sparkles } from 'lucide-react';

interface AIInsightCardProps {
  insight: string;
}

export function AIInsightCard({ insight }: AIInsightCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#1E293B] to-[#111827] dark:from-surface-dark dark:to-background-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden shadow-lg">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[60px]"></div>
      <div className="relative z-10 flex items-start gap-4">
        <div className="bg-primary text-background-dark p-2 rounded-lg shrink-0 shadow-[0_0_15px_rgba(255,153,51,0.4)]">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-white text-lg">AI Insight</h3>
            <span className="text-[10px] uppercase tracking-wider text-primary/80 font-bold border border-primary/30 px-1.5 py-0.5 rounded">
              Beta
            </span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed font-light">
            {insight}
          </p>
        </div>
      </div>
    </div>
  );
}

