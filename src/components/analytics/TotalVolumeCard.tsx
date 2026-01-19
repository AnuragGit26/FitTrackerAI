import { TrendingUp, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { slideUp, prefersReducedMotion } from '@/utils/animations';

interface TotalVolumeCardProps {
  totalVolume: number;
  trendPercentage: number;
  unit: 'kg' | 'lbs';
}

export function TotalVolumeCard({ totalVolume, trendPercentage, unit }: TotalVolumeCardProps) {
  const volumeCount = useCountUp(totalVolume, 0, { duration: 1.5, decimals: 0 });
  const shouldReduceMotion = prefersReducedMotion();

  return (
    <motion.div 
      className="col-span-2 bg-surface-light dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-gray-100 dark:border-border-dark/50 relative overflow-hidden group"
      variants={shouldReduceMotion ? {} : slideUp}
      initial="hidden"
      animate="visible"
      whileHover={shouldReduceMotion ? {} : { y: -2 }}
    >
      <motion.div 
        className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8"
        animate={shouldReduceMotion ? {} : {
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <div className="relative z-10 flex justify-between items-start mb-2">
        <span className="text-slate-500 dark:text-gray-400 text-sm font-medium tracking-wide">
          TOTAL VOLUME
        </span>
        <motion.div
          animate={shouldReduceMotion ? {} : {
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Dumbbell className="w-5 h-5 text-primary/80" />
        </motion.div>
      </div>
      <div className="relative z-10 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{volumeCount.formattedValue}</span>
        <span className="text-sm font-medium text-slate-400 dark:text-gray-400">{unit}</span>
      </div>
      {trendPercentage !== 0 && (
        <div className="relative z-10 flex items-center gap-1 mt-2 text-primary text-sm font-bold bg-primary/10 w-fit px-2 py-0.5 rounded-md">
          <TrendingUp className="w-4 h-4" />
          <span>
            {trendPercentage > 0 ? '+' : ''}
            {trendPercentage}% vs last month
          </span>
        </div>
      )}
    </motion.div>
  );
}

