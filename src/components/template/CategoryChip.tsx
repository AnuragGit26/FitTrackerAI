import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CategoryChipProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

export function CategoryChip({ label, isActive, onClick }: CategoryChipProps) {
    return (
        <motion.button
            onClick={onClick}
            className={cn(
                'flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 border transition-colors cursor-pointer',
                isActive
                    ? 'bg-primary text-background-dark border-primary shadow-md shadow-primary/20 font-bold'
                    : 'bg-slate-200 dark:bg-surface-dark text-slate-700 dark:text-white border-transparent dark:border-white/5 font-medium hover:bg-primary/10 dark:hover:bg-surface-highlight'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <p className="text-sm whitespace-nowrap">{label}</p>
        </motion.button>
    );
}
