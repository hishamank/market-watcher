import { useLanguage, useT, type Locale } from "@mini/core";
import { space } from "@mini/tokens";
import { ScrollView, StyleSheet, View } from "react-native";
import { ChoiceRow } from "../components/choice-row.tsx";
import { SegmentedControl } from "../components/segmented-control.tsx";
import { SettingsGroup } from "../components/settings-group.tsx";
import { APPEARANCES, chooseAppearance, useAppearance } from "../platform/appearance.ts";

const LANGUAGES = [
  { locale: "en-US", key: "language.english", testID: "language-option-en" },
  { locale: "ar", key: "language.arabic", testID: "language-option-ar" },
] as const satisfies ReadonlyArray<{ locale: Locale; key: string; testID: string }>;

export function SettingsScreen() {
  const t = useT();
  const appearance = useAppearance();
  const { locale, setLocale } = useLanguage();
  const themeOptions = APPEARANCES.map((value) => ({
    value,
    label: t(`settings.appearance.${value}`),
    testID: `theme-option-${value}`,
  }));
  return (
    <ScrollView testID="settings-screen" contentContainerStyle={styles.content}>
      <SettingsGroup title={t("settings.appearance")}>
        <View style={styles.segmentRow}>
          <SegmentedControl
            label={t("settings.appearance")}
            options={themeOptions}
            value={appearance}
            onSelect={chooseAppearance}
          />
        </View>
      </SettingsGroup>
      <SettingsGroup title={t("language.label")}>
        {LANGUAGES.map((language, index) => (
          <ChoiceRow
            key={language.locale}
            label={t(language.key)}
            testID={language.testID}
            selected={locale === language.locale}
            divider={index < LANGUAGES.length - 1}
            onPress={() => setLocale(language.locale)}
          />
        ))}
      </SettingsGroup>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], gap: space[24] },
  segmentRow: { padding: space[8] },
});
