import { useFeedMode, useT } from "@mini/core";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Icon } from "../components/icon.tsx";
import { useDebugTools } from "../platform/debug-tools.ts";
import { usePalette } from "../theme/palette.ts";

export function useChaosAvailable(): boolean {
  const debugTools = useDebugTools();
  const feedMode = useFeedMode();
  return debugTools && feedMode === "simulated";
}

export function ChaosButton() {
  const t = useT();
  const palette = usePalette();
  const router = useRouter();
  if (!useChaosAvailable()) return null;
  return (
    <Pressable
      testID="chaos-open"
      accessibilityRole="button"
      accessibilityLabel={t("chaos.open")}
      onPress={() => router.push("/debug")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="bolt" color={palette.textSecondary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
});
