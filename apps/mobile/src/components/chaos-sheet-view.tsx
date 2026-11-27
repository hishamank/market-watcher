import { type ConnectionHealth, useT } from "@mini/core";
import { space } from "@mini/tokens";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Button } from "./button.tsx";
import { ChaosGlobalSection, type ChaosGlobalSectionProps } from "./chaos-global-section.tsx";
import { ChaosSection } from "./chaos-section.tsx";
import { HealthDiagnostics } from "./health-diagnostics.tsx";
import { HealthTiles } from "./health-tiles.tsx";
import { Icon } from "./icon.tsx";

export interface ChaosSheetViewProps extends ChaosGlobalSectionProps {
  sharedControls: boolean;
  health: ConnectionHealth;
  onClose: () => void;
  onDrop: () => void;
  onFreeze: () => void;
}

function SheetHeader({ onClose }: { onClose: () => void }) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View style={styles.header}>
      <Icon name="bolt" color={palette.accent} />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[textStyles.headingMd, { color: palette.text }]}>
          {t("chaos.title")}
        </Text>
        <Text style={[textStyles.caption, { color: palette.textSecondary }]}>
          {t("chaos.subtitle")}
        </Text>
      </View>
      <Button testID="chaos-close" label={t("chaos.close")} onPress={onClose} />
    </View>
  );
}

function HealthSection({ health }: { health: ConnectionHealth }) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  const none = t("chaos.health.none");
  const latency =
    health.latencyMs === null ? none : t("chaos.health.latencyValue", { value: health.latencyMs });
  const skipped = health.skippedFrames === null ? none : String(health.skippedFrames);
  return (
    <ChaosSection title={t("chaos.section.health")}>
      <HealthTiles
        tiles={[
          {
            label: t("chaos.health.reconnects"),
            value: String(health.reconnects),
            testID: "health-reconnects",
          },
          {
            label: t("chaos.health.fps"),
            value: String(health.framesPerSecond),
            testID: "health-fps",
          },
          { label: t("chaos.health.latency"), value: latency, testID: "health-latency" },
          { label: t("chaos.health.skipped"), value: skipped, testID: "health-skipped" },
        ]}
      />
      <Text accessibilityRole="header" style={[textStyles.label, { color: palette.text }]}>
        {t("chaos.health.diagnostics")}
      </Text>
      <HealthDiagnostics diagnostics={health.diagnostics} />
    </ChaosSection>
  );
}

export function ChaosSheetView(props: ChaosSheetViewProps) {
  const t = useT();
  const palette = usePalette();
  return (
    <ScrollView
      testID="chaos-panel"
      style={{ backgroundColor: palette.surface }}
      contentContainerStyle={styles.content}
    >
      <SheetHeader onClose={props.onClose} />
      <ChaosSection title={t("chaos.section.connection")}>
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button testID="chaos-drop" label={t("chaos.drop")} onPress={props.onDrop} />
          </View>
          <View style={styles.action}>
            <Button testID="chaos-freeze" label={t("chaos.freeze")} onPress={props.onFreeze} />
          </View>
        </View>
      </ChaosSection>
      {props.sharedControls && <ChaosGlobalSection {...props} />}
      <HealthSection health={props.health} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], paddingTop: space[24], gap: space[16] },
  header: { flexDirection: "row", alignItems: "flex-start", gap: space[10] },
  heading: { flex: 1 },
  actions: { flexDirection: "row", gap: space[8] },
  action: { flex: 1 },
});
