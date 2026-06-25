"use client";

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Reduced-motion is handled at the LIBRARY level via <MotionConfig
// reducedMotion="user"> below, NOT by branching the rendered tree on
// useReducedMotion() — that hook is client-only, so branching produced a
// different DOM on the server (which can't read the media query) and triggered a
// hydration mismatch on every (main) route. MotionConfig only changes the
// animated *values* (dropping transforms, keeping opacity) for users who ask for
// reduced motion, leaving the DOM identical on server and client. CSS
// prefers-reduced-motion can't catch motion/react's JS-driven transforms, which
// is why this lives in JS.

/** Soft fade + lift on route change. Wraps each (main) route via template.tsx.
 *  Also hosts the app-wide MotionConfig so every descendant motion respects the
 *  user's reduced-motion preference. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/** Reveal on scroll-into-view. Use for feed cards, sections. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
