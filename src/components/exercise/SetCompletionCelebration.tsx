import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { prefersReducedMotion } from '@/utils/animations';
import { restTimerService } from '@/services/restTimerService';
import { useSettingsStore } from '@/store/settingsStore';

interface SetCompletionCelebrationProps {
  isVisible: boolean;
  onComplete?: () => void;
  position?: { x: number; y: number };
}

const MOTIVATIONAL_MESSAGES = [
  'NICE!',
  'STRONG!',
  'KEEP GOING!',
  'BEAST MODE!',
  'CRUSHING IT!',
  'FIRE!',
  'LEGEND!',
  'UNSTOPPABLE!',
  'POWER UP!',
  'DOMINATING!',
  'INCREDIBLE!',
  'AMAZING!',
  'PHENOMENAL!',
  'OUTSTANDING!',
  'EPIC!',
  'MONSTER!',
  'WOW!',
  'INSANE!',
  'PERFECT!',
  'ELITE!',
];

export function SetCompletionCelebration({
  isVisible,
  onComplete,
  position,
}: SetCompletionCelebrationProps) {
  const [message, setMessage] = useState<string>('SET COMPLETE!');
  const { settings } = useSettingsStore();
  const shouldReduceMotion = prefersReducedMotion();

  // Select random motivational message
  useEffect(() => {
    if (isVisible) {
      const randomMessage = MOTIVATIONAL_MESSAGES[
        Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
      ];
      setMessage(randomMessage);

      // Play celebration sound if enabled
      if (settings.soundEnabled) {
        try {
          restTimerService.playCompletionSound();
        } catch (error) {
          console.warn('Failed to play celebration sound:', error);
        }
      }
    }
  }, [isVisible, settings.soundEnabled]);

  // Auto-dismiss after 2 seconds
  useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const centerX = position?.x ?? window.innerWidth / 2;
  const centerY = position?.y ?? window.innerHeight / 2;

  // Generate confetti particles - memoized to prevent regeneration on re-renders
  // Reduced count for better performance (60 instead of 90)
  const confettiParticles = useMemo(() => {
    if (!isVisible) {
    return [];
  }
    return Array.from({ length: 60 }, (_, i) => {
      const angle = (i * 360) / 60;
      const distance = 80 + Math.random() * 40;
      const x = Math.cos((angle * Math.PI) / 180) * distance;
      const y = Math.sin((angle * Math.PI) / 180) * distance;
      const delay = Math.random() * 0.2;
      const duration = 1.2 + Math.random() * 0.4;
      const size = 4 + Math.random() * 6;
      
      return {
        id: i,
        x,
        y,
        delay,
        duration,
        size,
        rotation: Math.random() * 360,
      };
    });
  }, [isVisible]);

  // Generate sparkle particles - memoized to prevent regeneration on re-renders
  // Reduced count for better performance (20 instead of 25)
  const sparkleParticles = useMemo(() => {
    if (!isVisible) {
    return [];
  }
    return Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 360) / 20;
      const distance = 40 + Math.random() * 30;
      const x = Math.cos((angle * Math.PI) / 180) * distance;
      const y = Math.sin((angle * Math.PI) / 180) * distance;
      const delay = 0.6 + Math.random() * 0.2;
      const duration = 0.8 + Math.random() * 0.4;
      
      return {
        id: i,
        x,
        y,
        delay,
        duration,
                size: 4 + Math.random() * 6,
      };
    });
  }, [isVisible]);

  if (shouldReduceMotion) {
    // Simplified version for reduced motion
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-primary/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-2xl border-2 border-primary/50">
              <p className="text-2xl font-bold text-background-dark text-center drop-shadow-lg">
                {message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
          style={{
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            willChange: 'opacity',
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          {/* Screen Flash - Phase 1 (0-200ms) - Double Flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.6, 0, 0.4, 0],
            }}
            transition={{ 
              duration: 0.25,
              times: [0, 0.2, 0.4, 0.6, 1],
            }}
            className="absolute inset-0 bg-primary"
            style={{ willChange: 'opacity' }}
          />

          {/* Confetti Explosion - Phase 1 (0-200ms) */}
          {confettiParticles.map((particle) => (
            <motion.div
              key={`confetti-${particle.id}`}
              className="absolute rounded-full bg-primary"
              style={{
                left: centerX,
                top: centerY,
                width: particle.size,
                height: particle.size,
                willChange: 'transform, opacity',
                transform: 'translate3d(0, 0, 0)',
                boxShadow: `0 0 ${particle.size * 2}px rgba(255, 153, 51, 0.8)`,
              }}
              initial={{ 
                scale: 0,
                opacity: 1,
                x: 0,
                y: 0,
                rotate: particle.rotation,
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
                x: [0, particle.x, particle.x * 1.5],
                y: [0, particle.y, particle.y * 1.5],
                rotate: [particle.rotation, particle.rotation + 360, particle.rotation + 720],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                times: [0, 0.5, 1],
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Glow Pulse Effect - Phase 2 (200-600ms) */}
          <motion.div
            className="absolute rounded-full"
              style={{
                left: centerX,
                top: centerY,
                width: 250,
                height: 250,
                background: 'radial-gradient(circle, rgba(255, 153, 51, 0.75) 0%, rgba(255, 153, 51, 0) 70%)',
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform, opacity',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 2.2, 3.5],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: 0.9,
                delay: 0.15,
                times: [0, 0.5, 1],
                ease: 'easeOut',
              }}
          />

          {/* Ripple Waves - Phase 3 (600-1200ms) */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`ripple-${i}`}
              className="absolute rounded-full border-4 border-primary/60"
              style={{
                left: centerX,
                top: centerY,
                width: 100,
                height: 100,
                transform: 'translate3d(-50%, -50%, 0)',
                willChange: 'transform, opacity',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{
                scale: [0, 3, 5],
                opacity: [0.8, 0.4, 0],
              }}
              transition={{
                duration: 1.2,
                delay: 0.6 + i * 0.15,
                times: [0, 0.5, 1],
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Success Checkmark with Message - Phase 2 (200-600ms) */}
          <div
            className="absolute flex flex-col items-center justify-center"
            style={{
              left: centerX,
              top: centerY,
              transform: 'translate3d(-50%, -50%, 0)',
              willChange: 'transform',
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.5, 0.95, 1.1, 1],
                rotate: 0,
              }}
              transition={{ 
                type: 'spring',
                damping: 12,
                stiffness: 400,
                duration: 0.7,
                delay: 0.15,
              }}
              className="relative"
              style={{ willChange: 'transform' }}
            >
              <div className="size-36 rounded-full bg-background-dark/80 dark:bg-background-dark/90 flex items-center justify-center border-4 border-primary shadow-[0_0_50px_rgba(255,153,51,0.8)] ring-4 ring-primary/40">
                <Check className="w-20 h-20 text-primary stroke-[4] drop-shadow-[0_0_15px_rgba(255,153,51,0.9)]" />
              </div>
              
              {/* Shimmer Effect - Simplified for performance */}
              <motion.div
                className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
                initial={{ rotate: 0 }}
                animate={{ 
                  rotate: 360,
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ willChange: 'transform' }}
              >
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 0%, rgba(255, 153, 51, 0.3) 40%, transparent 80%)',
                  }}
                />
              </motion.div>
              
              {/* Inner Pulse */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/50"
                initial={{ scale: 1, opacity: 0.9 }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.9, 0, 0.9],
                }}
                transition={{
                  duration: 1,
                  delay: 0.3,
                  repeat: 1,
                  ease: 'easeInOut',
                }}
                style={{ willChange: 'transform, opacity' }}
              />
            </motion.div>

            {/* Success Message - Phase 2 (200-600ms) */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ 
                y: 0,
                opacity: 1,
                scale: [0.8, 1.25, 1.05, 1],
              }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ 
                delay: 0.35,
                duration: 0.6,
                times: [0, 0.4, 0.7, 1],
                type: 'spring',
                stiffness: 250,
                damping: 12,
              }}
              className="mt-6 relative"
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="absolute inset-0 bg-background-dark/70 dark:bg-background-dark/80 rounded-xl px-6 py-3 -mx-6 -my-3" />
              <p
                className="relative text-4xl font-bold text-primary text-center drop-shadow-[0_0_20px_rgba(255,153,51,0.9)]"
                style={{
                  textShadow: '0 0 40px rgba(255, 153, 51, 0.8), 0 0 80px rgba(255, 153, 51, 0.6), 2px 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                {message}
              </p>
            </motion.div>
          </div>

          {/* Sparkle Effects - Phase 3 (600-1200ms) */}
          {sparkleParticles.map((particle) => (
            <motion.div
              key={`sparkle-${particle.id}`}
              className="absolute"
              style={{
                left: centerX,
                top: centerY,
                width: particle.size,
                height: particle.size,
                willChange: 'transform, opacity',
                transform: 'translate3d(0, 0, 0)',
              }}
              initial={{ 
                scale: 0,
                opacity: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
                x: [0, particle.x],
                y: [0, particle.y],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                times: [0, 0.5, 1],
                ease: 'easeOut',
              }}
            >
              <div
                className="w-full h-full rounded-full bg-primary"
                style={{
                  boxShadow: `0 0 ${particle.size * 3}px rgba(255, 153, 51, 0.9)`,
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

