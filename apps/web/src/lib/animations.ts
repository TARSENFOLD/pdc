/**
 * PDC v2 — "Soul & Elite" Animation System
 * Enforced by Constitution Rule 28: "Apple Physics"
 * stiffness: 220, damping: 28
 */

export const APPLE_SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 28,
} as const;

export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: APPLE_SPRING,
};

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: APPLE_SPRING,
};
