import { useT } from "@mini/core";
import { space } from "@mini/tokens";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { LanguageToggle } from "../../shell/language-toggle.tsx";
import { SearchButton } from "../../shell/search-button.tsx";
import { usePalette } from "../../theme/palette.ts";
import { TabIcon } from "../../theme/tab-icon.tsx";

export default function TabsLayout() {
  const t = useT();
  const palette = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerRight: () => (
          <View style={styles.actions}>
            <SearchButton />
            <LanguageToggle />
          </View>
        ),
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.text,
        tabBarInactiveTintColor: palette.textMuted,
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("header.title"),
          tabBarButtonTestID: "tab-markets",
          tabBarIcon: ({ color }) => <TabIcon name="markets" color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: t("list.view.watchlist"),
          tabBarButtonTestID: "tab-watchlist",
          tabBarIcon: ({ color }) => <TabIcon name="star" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", alignItems: "center", paddingEnd: space[6] },
});
