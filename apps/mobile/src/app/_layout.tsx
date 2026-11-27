import { useLanguage, useT } from "@mini/core";
import { LocaleProvider, Stack } from "expo-router";
import type { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { duration } from "@mini/tokens";
import { useReduceMotion } from "../integrations/use-reduce-motion.ts";
import { useAnnounceMarketClosed } from "../integrations/use-announce-market-closed.ts";
import { useSavedAppearance } from "../integrations/use-saved-appearance.ts";
import { useSavedLocale } from "../integrations/use-saved-locale.ts";
import { Providers } from "../providers/providers.tsx";
import { usePalette } from "../theme/palette.ts";

function AppStack() {
  const t = useT();
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
          animation: reduceMotion ? "fade" : "slide_from_bottom",
          animationDuration: reduceMotion ? duration.fast : duration.slow,
        }}
      />
      <Stack.Screen name="settings" options={{ title: t("settings.title") }} />
    </Stack>
  );
}

function DirectionRoot({ children }: { children: ReactNode }) {
  const { direction } = useLanguage();
  useSavedLocale();
  useAnnounceMarketClosed();
  useSavedAppearance();
  return (
    <LocaleProvider direction={direction}>
      <View style={[styles.root, { direction }]}>{children}</View>
    </LocaleProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView testID="app-root" style={styles.root}>
      <Providers>
        <DirectionRoot>
          <AppStack />
        </DirectionRoot>
      </Providers>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
