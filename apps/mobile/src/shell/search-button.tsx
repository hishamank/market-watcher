import { useT } from "@mini/core";
import { radius } from "@mini/tokens";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { Icon } from "../components/icon.tsx";
import { usePalette } from "../theme/palette.ts";

export function SearchButton() {
  const t = useT();
  const palette = usePalette();
  const router = useRouter();
  return (
    <Pressable
      testID="search-open"
      accessibilityRole="button"
      accessibilityLabel={t("search.open")}
      onPress={() => router.push("/search")}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: palette.hover }]}
    >
      <Icon name="search" color={palette.textSecondary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
