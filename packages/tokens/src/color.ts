export const color = {
  light: {
    bg: "#F1F1EF",
    surface: "#FFFFFF",
    raised: "#FFFFFF",
    fill: "#E4E3DF",
    hover: "#F7F7F5",
    text: "#1A1A19",
    textSecondary: "#51504C",
    textMuted: "#696862",
    border: "#DEDDD9",
    borderStrong: "#8A8882",
    focus: "#9A5600",
    accent: "#9A5600",
    accentFill: "#B86E00",
    accentTint: "#F3EBE0",
    gain: "#0B7049",
    gainTint: "#E7F1ED",
    loss: "#BF3A22",
    lossTint: "#F9EBE9",
    flat: "#51504C",
    stale: "#6F5B00",
    staleTint: "#EEEBE0",
    error: "#B4233F",
    errorTint: "#F6E5E8",
    info: "#1F5FBF",
    infoTint: "#E4ECF7",
  },
  dark: {
    bg: "#0E0E0F",
    surface: "#171718",
    raised: "#2C2C30",
    fill: "#222224",
    hover: "#1D1D1F",
    text: "#F2F1EE",
    textSecondary: "#B5B3AD",
    textMuted: "#93918B",
    border: "#2E2E31",
    borderStrong: "#6F6E6A",
    focus: "#F5A524",
    accent: "#F5A524",
    accentFill: "#F5A524",
    accentTint: "#322819",
    gain: "#4ADE9A",
    gainTint: "#1C2B25",
    loss: "#FF8A75",
    lossTint: "#2E2221",
    flat: "#B5B3AD",
    stale: "#E9D15B",
    staleTint: "#302D20",
    error: "#FF7A90",
    errorTint: "#332326",
    info: "#7FB2FF",
    infoTint: "#232A34",
  },
} as const;

export const chart = {
  light: {
    gainLine: "#0B7049",
    lossLine: "#BF3A22",
    grid: "#EDECEA",
    crosshair: "#51504C",
    previousClose: "#696862",
  },
  dark: {
    gainLine: "#4ADE9A",
    lossLine: "#FF8A75",
    grid: "#242426",
    crosshair: "#B5B3AD",
    previousClose: "#93918B",
  },
} as const;

export const chartArea = { topOpacity: 0.2, bottomOpacity: 0 } as const;

export type Theme = keyof typeof color;
export type ColorToken = keyof (typeof color)["light"];
export type ChartToken = keyof (typeof chart)["light"];
