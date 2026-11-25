export interface TypeStyle {
  readonly size: number;
  readonly lineHeight: number;
  readonly weight: number;
  readonly letterSpacingEm: number;
}

export interface TextStyle extends TypeStyle {
  readonly arabicLineHeight: number;
}

export const fontFamily = {
  name: "Alexandria",
  weights: [300, 400, 500, 600, 700],
  fallback: ["system-ui", "sans-serif"],
} as const;

export const type = {
  display: { size: 40, lineHeight: 48, weight: 600, letterSpacingEm: -0.02, arabicLineHeight: 64 },
  headingLg: { size: 22, lineHeight: 28, weight: 600, letterSpacingEm: 0, arabicLineHeight: 36 },
  headingMd: { size: 17, lineHeight: 24, weight: 600, letterSpacingEm: 0, arabicLineHeight: 30 },
  body: { size: 15, lineHeight: 22, weight: 400, letterSpacingEm: 0, arabicLineHeight: 28 },
  bodyStrong: { size: 15, lineHeight: 22, weight: 500, letterSpacingEm: 0, arabicLineHeight: 28 },
  label: { size: 13, lineHeight: 18, weight: 500, letterSpacingEm: 0, arabicLineHeight: 24 },
  caption: { size: 12, lineHeight: 16, weight: 400, letterSpacingEm: 0, arabicLineHeight: 22 },
  micro: { size: 11, lineHeight: 14, weight: 400, letterSpacingEm: 0, arabicLineHeight: 20 },
} as const satisfies Record<string, TextStyle>;

export const numeric = {
  display: { size: 40, lineHeight: 48, weight: 600, letterSpacingEm: -0.02 },
  price: { size: 15, lineHeight: 20, weight: 500, letterSpacingEm: 0 },
  change: { size: 12, lineHeight: 16, weight: 500, letterSpacingEm: 0 },
  axis: { size: 11, lineHeight: 14, weight: 400, letterSpacingEm: 0 },
} as const satisfies Record<string, TypeStyle>;

export type TypeToken = keyof typeof type;
export type NumericToken = keyof typeof numeric;
