export type ColorScheme = "light" | "dark";

export interface ColorSchemeStore {
  getSnapshot(): ColorScheme;
  subscribe(listener: () => void): () => void;
  set(scheme: ColorScheme): void;
}
