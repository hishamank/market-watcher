import { useFeedMode, useT } from "@mini/core";
import { space } from "@mini/tokens";
import { StyleSheet, View } from "react-native";
import { SettingsGroup } from "../components/settings-group.tsx";
import { SwitchRow } from "../components/switch-row.tsx";
import { chooseDebugTools, useDebugTools } from "../platform/debug-tools.ts";

export function DebugSection() {
  const t = useT();
  const feedMode = useFeedMode();
  const debugTools = useDebugTools();
  if (feedMode !== "simulated") return null;
  return (
    <SettingsGroup title={t("settings.debug")}>
      <View style={styles.row}>
        <SwitchRow
          label={t("chaos.title")}
          help={t("settings.debug.chaosHelp")}
          value={debugTools}
          onChange={chooseDebugTools}
          testID="debug-toggle"
        />
      </View>
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  row: { paddingInline: space[16], paddingBlock: space[8] },
});
