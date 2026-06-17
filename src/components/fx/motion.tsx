"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Soft fade + lift on route change. Wraps each (main) route via template.tsx.
 *  Motion is mounted client-only so the SSR'd HTML doesn't ship with the
 *  initial transform/opacity styles (which would mismatch Next 16's Suspense
 *  fallback during hydration). The animation still runs on every route change
 *  because template.tsx remounts this component. */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (reduce || !mounted) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </motion.div>
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
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
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
