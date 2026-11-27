import { useT } from "@mini/core";
import { Tabs } from "expo-router";
import { TabHeaderActions } from "../../shell/tab-header-actions.tsx";
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
        headerRight: () => <TabHeaderActions />,
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
