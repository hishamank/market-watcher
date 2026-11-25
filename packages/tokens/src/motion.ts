export const duration = {
  fast: 120,
  base: 200,
  slow: 320,
  flash: 400,
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
