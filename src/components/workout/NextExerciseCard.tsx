import { motion } from 'framer-motion';
import { ArrowRight, FastForward } from 'lucide-react';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

interface NextExerciseCardProps {
  exerciseName: string;
  onClick?: () => void;
  className?: string;
}

export function NextExerciseCard({
  exerciseName,
  onClick,
  className,
}: NextExerciseCardProps) {
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-4 border border-indigo-200 dark:border-indigo-500/20 shadow-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-[0.99] group',
        className
      )}
      whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
    >
      <div className="flex items-center gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
          <FastForward className="w-5 h-5" />
        </div>
        <div className="flex flex-col items-start text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-0.5">
            Next in Superset
          </span>
          <span className="text-slate-900 dark:text-white font-bold text-base">
            {exerciseName}
          </span>
        </div>
      </div>
      <motion.span
        className="text-indigo-400 group-hover:text-indigo-500 transition-colors"
        animate={
          shouldReduceMotion
            ? {}
            : {
                x: [0, 4, 0],
              }
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <ArrowRight className="w-5 h-5" />
      </motion.span>
    </motion.button>
  );
}

