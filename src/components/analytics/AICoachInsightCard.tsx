import { Brain } from 'lucide-react';

interface AICoachInsightCardProps {
  insight: string;
}

export function AICoachInsightCard({ insight }: AICoachInsightCardProps) {
  return (
    <div className="px-4 py-2">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a4430] to-[#102217] p-5 border border-primary/20 shadow-lg">
        <div className="absolute -right-4 -top-4 text-primary/10">
          <Brain className="w-[100px] h-[100px]" />
        </div>
        <div className="flex gap-3 relative z-10">
          <div className="min-w-[40px] h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">
              AI Coach Insight
            </h3>
            <p className="text-gray-200 text-sm leading-relaxed">{insight}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

