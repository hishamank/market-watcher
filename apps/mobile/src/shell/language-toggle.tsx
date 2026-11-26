import { useLanguage, useT } from "@mini/core";
import { space } from "@mini/tokens";
import { Pressable, StyleSheet, Text } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export function LanguageToggle() {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  const { locale, setLocale } = useLanguage();
  return (
    <Pressable
      testID="language-toggle"
      accessibilityRole="button"
      hitSlop={space[8]}
      onPress={() => setLocale(locale === "ar" ? "en-US" : "ar")}
      style={styles.toggle}
    >
      <Text style={[textStyles.label, { color: palette.textSecondary }]}>
        {t("language.switch")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { paddingHorizontal: space[16] },
});
