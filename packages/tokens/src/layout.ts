export const space = {
  0: 0,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
} as const;

export const radius = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const elevation = {
  light: {
    0: "none",
    1: "0 1px 2px rgba(26,26,25,.08), 0 4px 12px rgba(26,26,25,.06)",
    2: "0 2px 6px rgba(26,26,25,.08), 0 12px 32px rgba(26,26,25,.14)",
  },
  dark: {
    0: "none",
    1: "inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.4)",
    2: "inset 0 1px 0 rgba(255,255,255,.08), 0 12px 32px rgba(0,0,0,.6)",
  },
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type ElevationToken = keyof (typeof elevation)["light"];
