import { Home, Dumbbell, Moon, TrendingUp, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { prefersReducedMotion } from '@/utils/animations';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/log-workout', icon: Dumbbell, label: 'Log' },
  { path: '/rest', icon: Moon, label: 'Rest' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/insights', icon: Sparkles, label: 'AI' },
];

// Ripple effect component
function RippleEffect({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/30 pointer-events-none"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
      }}
      initial={{ width: 0, height: 0, opacity: 0.6 }}
      animate={{ 
        width: 80, 
        height: 80, 
        opacity: 0,
        x: -40,
        y: -40,
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    />
  );
}

export function BottomNavigation() {
  const location = useLocation();
  const shouldReduceMotion = prefersReducedMotion();
  const [ripples, setRipples] = useState<Array<{ id: number; path: string; x: number; y: number }>>([]);

  const handleTap = (itemPath: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduceMotion) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const rippleId = Date.now();
    setRipples((prev) => [...prev, { id: rippleId, path: itemPath, x, y }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 300);
  };

  return (
    <motion.nav 
      className="fixed bottom-0 left-0 right-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-lg border-t border-gray-200 dark:border-surface-dark-light pb-6 pt-2 px-3 z-20 w-full max-w-md mx-auto"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.4
      }}
    >
      <div className="flex justify-between items-center w-full relative">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <motion.div
              key={item.path}
              className="flex-1 min-w-0 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: index * 0.05
              }}
            >
              <Link
                to={item.path}
                onClick={(e) => handleTap(item.path, e)}
                className={cn(
                  'flex flex-col items-center gap-1 transition-colors relative py-2 px-3 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                )}
                aria-label={`Navigate to ${item.label} page`}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Pill-shaped active background indicator */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 bg-primary/10 dark:bg-primary/15 rounded-xl"
                    layoutId="activePill"
                    transition={{ 
                      type: 'spring', 
                      stiffness: 400, 
                      damping: 30 
                    }}
                    initial={false}
                  />
                )}

                {/* Ripple effects */}
                <AnimatePresence>
                  {ripples
                    .filter((r) => r.path === item.path)
                    .map((ripple) => (
                      <RippleEffect key={ripple.id} x={ripple.x} y={ripple.y} />
                    ))}
                </AnimatePresence>

                {/* Icon container with enhanced animations */}
                <motion.div
                  className="relative z-10"
                  animate={isActive && !shouldReduceMotion ? {
                    scale: 1.1,
                  } : {
                    scale: 1,
                  }}
                  whileHover={shouldReduceMotion ? {} : { 
                    scale: 1.15,
                    y: -2,
                    rotate: [0, -5, 5, 0],
                    transition: { duration: 0.3 }
                  }}
                  whileTap={shouldReduceMotion ? {} : { 
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    duration: 0.2
                  }}
                >
                  <Icon 
                    className={cn(
                      'w-6 h-6 transition-all duration-200',
                      isActive 
                        ? 'fill-primary drop-shadow-[0_0_8px_rgba(13,242,105,0.4)]' 
                        : ''
                    )} 
                  />
                  {/* Glow effect for active icon */}
                  {isActive && !shouldReduceMotion && (
                    <motion.div
                      className="absolute inset-0 -z-10 bg-primary/20 rounded-full blur-md"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                </motion.div>

                {/* Label with smooth transitions */}
                <motion.span 
                  className={cn(
                    'text-[10px] truncate relative z-10 transition-colors duration-150',
                    isActive ? 'font-bold' : 'font-medium'
                  )}
                  animate={isActive && !shouldReduceMotion ? {
                    scale: 1.05,
                  } : {
                    scale: 1,
                  }}
                  transition={{ 
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    duration: 0.2
                  }}
                >
                  {item.label}
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
}

