import { motion, AnimatePresence, Transition, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const smoothTransition: Transition = {
  type: 'tween',
  ease: [0.22, 1, 0.36, 1],
  duration: 0.35,
};

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative min-h-screen">
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={prefersReducedMotion ? { duration: 0 } : smoothTransition}
          className="absolute inset-0 will-change-opacity"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
