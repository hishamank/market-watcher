import { color, space } from "@mini/tokens";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { CountdownPill } from "./countdown-pill.tsx";

export interface SwitchRowProps {
  label: string;
  help?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID: string;
  countdown?: { label: string | null; testID: string };
}

export function SwitchRow({ label, help, value, onChange, testID, countdown }: SwitchRowProps) {
  const palette = usePalette();
  const textStyles = useTextStyles();
  const isIOS = Platform.OS === "ios";
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <View style={styles.title}>
          <Text style={[textStyles.bodyStrong, { color: palette.text }]}>{label}</Text>
          {countdown === undefined ? null : (
            <CountdownPill label={countdown.label} testID={countdown.testID} />
          )}
        </View>
        {help === undefined ? null : (
          <Text style={[textStyles.caption, { color: palette.textSecondary }]}>{help}</Text>
        )}
      </View>
      <Switch
        testID={testID}
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: isIOS ? palette.borderStrong : palette.fill,
          true: isIOS ? color.light.accent : palette.text,
        }}
        {...(isIOS
          ? { ios_backgroundColor: palette.borderStrong }
          : { thumbColor: value ? palette.bg : palette.textSecondary })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: space[12] },
  text: { flex: 1, gap: space[2] },
  title: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[8] },
});
