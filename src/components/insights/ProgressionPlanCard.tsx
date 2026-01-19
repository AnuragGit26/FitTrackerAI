import { ProgressionPlan } from '@/types/insights';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, BarChart2, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProgressionPlanCardProps {
  plan: ProgressionPlan;
}

export function ProgressionPlanCard({ plan }: ProgressionPlanCardProps) {
  if (!plan) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl p-5 border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {plan.duration}-Day Progression
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 capitalize">
            {plan.periodization} Periodization
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {plan.phases.map((phase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5"
          >
            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-white/10 shrink-0 font-bold text-slate-700 dark:text-gray-300 shadow-sm text-sm">
              D{phase.day}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                  {phase.workoutType} Focus
                </span>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                  phase.intensity === 'high' ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  phase.intensity === 'medium' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" :
                  "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {phase.intensity}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" />
                  <span>Vol: {phase.volumeTarget}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Rec: {phase.recoveryTarget}%</span>
                </div>
              </div>
              
              {phase.exercises.length > 0 && (
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1 truncate">
                  {phase.exercises.join(', ')}
                </p>
              )}
            </div>
            
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-gray-600" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
