import { duration, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";

export interface EmptyStateProps {
  testID: string;
  icon: string;
  title: string;
  help: string;
  actionLabel: string;
  actionTestID: string;
  onAction: () => void;
  popIcon?: boolean;
}

const iconPop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.85 }] },
  35: { opacity: 1, transform: [{ scale: 1.25 }] },
  65: { opacity: 1, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(duration.flash);

export function EmptyState(props: EmptyStateProps) {
  const palette = usePalette();
  return (
    <View testID={props.testID} style={styles.container}>
      <View style={[styles.icon, { backgroundColor: palette.fill }]}>
        <Animated.View {...(props.popIcon ? { entering: iconPop } : {})}>
          <Text style={[styles.iconGlyph, { color: palette.textSecondary }]}>{props.icon}</Text>
        </Animated.View>
      </View>
      <Text style={[textStyles.headingMd, styles.centred, { color: palette.text }]}>
        {props.title}
      </Text>
      <Text style={[textStyles.label, styles.help, { color: palette.textSecondary }]}>
        {props.help}
      </Text>
      <View style={styles.action}>
        <Button label={props.actionLabel} onPress={props.onAction} testID={props.actionTestID} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: space[6],
    paddingInline: space[20],
    paddingBlock: space[24],
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBlockEnd: space[6],
  },
  iconGlyph: { fontSize: 24, lineHeight: 28 },
  centred: { textAlign: "center" },
  help: { maxWidth: 280, fontWeight: 400, textAlign: "center" },
  action: { marginBlockStart: space[10] },
});
