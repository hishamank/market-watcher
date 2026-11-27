import type { ConnectionHealth } from "@mini/core";
import { ScrollView, StyleSheet, Text } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";

export function HealthDiagnostics({
  diagnostics,
}: {
  diagnostics: ConnectionHealth["diagnostics"];
}) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <ScrollView nestedScrollEnabled style={styles.viewport}>
      <Text
        testID="health-diagnostics"
        selectable
        style={[textStyles.caption, styles.text, { color: palette.text }]}
      >
        {diagnostics && JSON.stringify(diagnostics, null, 2).split("\n").map(ltr).join("\n")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  viewport: { maxHeight: 256, flexGrow: 0, direction: "ltr" },
  text: { textAlign: "left", writingDirection: "ltr" },
});
