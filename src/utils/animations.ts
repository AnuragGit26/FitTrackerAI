import { Variants } from 'framer-motion';

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Common animation variants for Framer Motion
 * Using seamless spring animations and smooth easing curves
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

export const slideUp: Variants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    y: -20,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

export const slideDown: Variants = {
  hidden: { 
    opacity: 0,
    y: -20
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    y: 20,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

export const slideLeft: Variants = {
  hidden: { 
    opacity: 0,
    x: 20
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    x: -20,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

export const slideRight: Variants = {
  hidden: { 
    opacity: 0,
    x: -20
  },
  visible: { 
    opacity: 1,
    x: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    x: 20,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

export const scaleIn: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.9
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 25,
      mass: 0.7
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.9,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 0.5
    }
  }
};

export const scaleUp: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.8
  },
  visible: { 
    opacity: 1,
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 200,
      damping: 20,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.8,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 0.5
    }
  }
};

/**
 * Stagger children animation variants
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

/**
 * Page transition variants - seamless spring animation
 */
export const pageTransition: Variants = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

/**
 * Button press animation - seamless spring feedback
 */
export const buttonPress: Variants = {
  rest: { scale: 1 },
  pressed: { 
    scale: 0.95,
    transition: { 
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.3
    }
  }
};

/**
 * Card hover animation - seamless spring lift
 */
export const cardHover: Variants = {
  rest: { 
    scale: 1,
    y: 0
  },
  hover: { 
    scale: 1.02,
    y: -4,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 0.5
    }
  }
};

/**
 * Toast animation variants - seamless spring entrance
 */
export const toastSlideIn: Variants = {
  initial: { 
    opacity: 0,
    y: -20,
    scale: 0.95
  },
  animate: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      type: 'spring',
      stiffness: 500,
      damping: 30,
      mass: 0.6
    }
  },
  exit: { 
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { 
      type: 'spring',
      stiffness: 500,
      damping: 35,
      mass: 0.4
    }
  }
};

/**
 * Modal animation variants - seamless fade
 */
export const modalBackdrop: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.5
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.4
    }
  }
};

export const modalContent: Variants = {
  initial: { 
    opacity: 0,
    scale: 0.95,
    y: 10
  },
  animate: { 
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30,
      mass: 0.8
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

/**
 * Stagger animation for modal content
 */
export const modalStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

/**
 * Success checkmark animation - seamless spring bounce
 */
export const checkmarkAnimation: Variants = {
  initial: { 
    scale: 0,
    opacity: 0
  },
  animate: { 
    scale: [0, 1.2, 1],
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 0.5,
      times: [0, 0.6, 1]
    }
  }
};

/**
 * Shake animation for errors - seamless transition shake
 */
export const shake: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { 
      duration: 0.5,
      ease: 'easeInOut'
    }
  }
};

/**
 * Pulse animation - seamless transition pulse
 */
export const pulse: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * Get reduced motion variants (no animation)
 */
export const getReducedMotionVariants = (): Variants => {
  if (prefersReducedMotion()) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      exit: { opacity: 1 }
    };
  }
  return {};
};

/**
 * Celebration particle explosion animation - seamless transition
 */
export const celebrationParticles: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: [0, 1.5, 0],
    opacity: [0, 1, 0],
    transition: {
      duration: 1.0,
      times: [0, 0.5, 1],
      ease: 'easeOut',
    },
  },
};

/**
 * Success pulse animation - seamless transition pulse
 */
export const successPulse: Variants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.9, 1],
    transition: {
      duration: 0.6,
      times: [0, 0.5, 1],
      ease: 'easeOut',
    },
  },
};

/**
 * Ripple effect for button clicks - seamless transition expansion
 */
export const rippleEffect: Variants = {
  hidden: {
    scale: 0,
    opacity: 0.8,
  },
  visible: {
    scale: [0, 2, 3],
    opacity: [0.8, 0.4, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.5, 1],
      ease: 'easeOut',
    },
  },
};

/**
 * Full celebration animation sequence for set completion - seamless transition bounce
 */
export const setCompleteCelebration: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  celebrate: {
    scale: [1, 1.15, 1.05, 1],
    opacity: [1, 1, 1, 1],
    transition: {
      duration: 0.8,
      times: [0, 0.3, 0.7, 1],
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
};

/**
 * Hero slide up animation with seamless spring bounce for workout start banner
 */
export const heroSlideUp: Variants = {
  hidden: {
    opacity: 0,
    y: 60,
    scale: 0.95
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
      mass: 0.8
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 35,
      mass: 0.6
    }
  }
};

/**
 * Energy pulse animation with expanding saffron glow for CTA button - seamless transition
 */
export const energyPulse: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(255, 153, 51, 0)',
      '0 0 0 10px rgba(255, 153, 51, 0.3)',
      '0 0 0 20px rgba(255, 153, 51, 0)'
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * Saffron glow pulse animation for primary action buttons - seamless transition pulse
 */
export const saffronGlowPulse: Variants = {
  initial: { boxShadow: '0 0 20px rgba(255, 153, 51, 0.4)' },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(255, 153, 51, 0.4)',
      '0 0 30px rgba(255, 153, 51, 0.6)',
      '0 0 20px rgba(255, 153, 51, 0.4)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

/**
 * Saffron glow animation for secondary elements - seamless transition pulse
 */
export const saffronGlow: Variants = {
  initial: { boxShadow: '0 0 20px rgba(255, 153, 51, 0.4)' },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(255, 153, 51, 0.4)',
      '0 0 30px rgba(255, 153, 51, 0.6)',
      '0 0 20px rgba(255, 153, 51, 0.4)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};
