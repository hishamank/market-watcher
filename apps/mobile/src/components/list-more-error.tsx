import { useT } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";

export function ListMoreError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  const palette = usePalette();
  return (
    <View testID="list-more-error" accessibilityRole="alert" style={styles.footer}>
      <Text style={[textStyles.label, styles.message, { color: palette.textSecondary }]}>
        {t("list.more.error")}
      </Text>
      <Button label={t("list.error.retry")} onPress={onRetry} testID="list-more-retry" />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[12],
    paddingInline: space[16],
    paddingBlock: space[12],
  },
  message: { flex: 1 },
});
