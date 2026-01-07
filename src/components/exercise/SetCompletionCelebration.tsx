import { useEffect, useState } from 'react';
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
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-primary/90 backdrop-blur-sm rounded-2xl px-8 py-4">
              <p className="text-2xl font-bold text-background-dark text-center">
                {message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const centerX = position?.x ?? window.innerWidth / 2;
  const centerY = position?.y ?? window.innerHeight / 2;

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 60 }, (_, i) => {
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

  // Generate sparkle particles
  const sparkleParticles = Array.from({ length: 25 }, (_, i) => {
    const angle = (i * 360) / 25;
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
      size: 3 + Math.random() * 4,
    };
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
          style={{
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {/* Screen Flash - Phase 1 (0-200ms) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.25, 0],
            }}
            transition={{ 
              duration: 0.2,
              times: [0, 0.5, 1],
            }}
            className="absolute inset-0 bg-primary"
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
                boxShadow: `0 0 ${particle.size * 2}px rgba(13, 242, 105, 0.8)`,
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
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(13, 242, 105, 0.4) 0%, rgba(13, 242, 105, 0) 70%)',
              transform: 'translate(-50%, -50%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: [0, 2, 3],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              times: [0, 0.5, 1],
              ease: 'easeOut',
            }}
          />

          {/* Ripple Waves - Phase 3 (600-1200ms) */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`ripple-${i}`}
              className="absolute rounded-full border-4 border-primary/40"
              style={{
                left: centerX,
                top: centerY,
                width: 100,
                height: 100,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{
                scale: [0, 3, 5],
                opacity: [0.6, 0.3, 0],
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
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.3, 1],
                rotate: 0,
              }}
              transition={{ 
                type: 'spring',
                damping: 15,
                stiffness: 300,
                duration: 0.6,
                delay: 0.2,
              }}
              className="relative"
            >
              <div className="size-28 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border-4 border-primary shadow-[0_0_40px_rgba(13,242,105,0.5)]">
                <Check className="w-16 h-16 text-primary stroke-[4]" />
              </div>
              
              {/* Inner Pulse */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/30"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.8, 0, 0.8],
                }}
                transition={{
                  duration: 1,
                  delay: 0.3,
                  repeat: 1,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            {/* Success Message - Phase 2 (200-600ms) */}
            <motion.p
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ 
                y: 0,
                opacity: 1,
                scale: [0.8, 1.15, 1],
              }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ 
                delay: 0.4,
                duration: 0.5,
                times: [0, 0.6, 1],
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              className="mt-6 text-4xl font-bold text-primary text-center drop-shadow-[0_0_20px_rgba(13,242,105,0.8)]"
              style={{
                textShadow: '0 0 30px rgba(13, 242, 105, 0.6), 0 0 60px rgba(13, 242, 105, 0.4)',
              }}
            >
              {message}
            </motion.p>
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
                  boxShadow: `0 0 ${particle.size * 3}px rgba(13, 242, 105, 1)`,
                }}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

