import { useT } from "@mini/core";
import { space } from "@mini/tokens";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Icon } from "../components/icon.tsx";
import { usePalette } from "../theme/palette.ts";

export function SettingsButton() {
  const t = useT();
  const palette = usePalette();
  const router = useRouter();
  return (
    <Pressable
      testID="settings-button"
      accessibilityRole="button"
      accessibilityLabel={t("settings.open")}
      onPress={() => router.push("/settings")}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="gear" color={palette.textSecondary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginEnd: space[6],
  },
  pressed: { opacity: 0.6 },
});
