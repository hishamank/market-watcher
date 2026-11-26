import * as Haptics from "expo-haptics";

export function tapHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function selectionHaptic(): void {
  Haptics.selectionAsync().catch(() => {});
}
