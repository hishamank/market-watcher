import { chart, color, type ChartToken, type ColorToken } from "@mini/tokens";
import { useColorScheme } from "react-native";

export type Palette = Readonly<Record<ColorToken, string>>;
export type ChartPalette = Readonly<Record<ChartToken, string>>;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? color.dark : color.light;
}

export function useChartPalette(): ChartPalette {
  return useColorScheme() === "dark" ? chart.dark : chart.light;
}
