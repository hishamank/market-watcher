import { duration, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import type { Palette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";

import Animated, { FadeInDown } from "react-native-reanimated";

interface ConnectionBannerProps {
  offline: boolean;
  reduceMotion: boolean;
  title: string;
  help: string;
  retryLabel: string;
  onRetry: () => void;
  palette: Palette;
}

export function ConnectionBanner(props: ConnectionBannerProps) {
  return (
    <Animated.View
      {...(props.reduceMotion ? {} : { entering: FadeInDown.duration(duration.base) })}
      testID="connection-banner"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        { backgroundColor: props.offline ? props.palette.fill : props.palette.staleTint },
      ]}
    >
      <Text
        accessibilityElementsHidden
        style={{ color: props.offline ? props.palette.textSecondary : props.palette.stale }}
      >
        {props.offline ? "⊘" : "↻"}
      </Text>
      <View style={styles.copy}>
        <Text style={[textStyles.label, styles.title, { color: props.palette.text }]}>
          {props.title}
        </Text>
        <Text style={[textStyles.label, { color: props.palette.textSecondary }]}>{props.help}</Text>
      </View>
      {!props.offline && (
        <Button label={props.retryLabel} onPress={props.onRetry} testID="connection-retry" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space[6],
    paddingStart: space[14],
    paddingEnd: space[6],
    gap: space[10],
  },
  copy: { flex: 1 },
  title: { fontWeight: "600" },
});
