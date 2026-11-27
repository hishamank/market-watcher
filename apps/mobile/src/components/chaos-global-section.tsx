import type { HistoryFailureRate } from "@mini/contracts";
import {
  type ChaosFailureRateView,
  type ChaosToggleView,
  type TextDirection,
  useT,
} from "@mini/core";
import { ChaosSection } from "./chaos-section.tsx";
import { CountdownPill } from "./countdown-pill.tsx";
import { SegmentedControl } from "./segmented-control.tsx";
import { SwitchRow } from "./switch-row.tsx";
import { StyleSheet, Text, View } from "react-native";
import { space } from "@mini/tokens";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

type RateKey = "0" | "50" | "100";

const RATES: ReadonlyArray<{ key: RateKey; rate: HistoryFailureRate }> = [
  { key: "0", rate: 0 },
  { key: "50", rate: 50 },
  { key: "100", rate: 100 },
];

export interface ChaosGlobalSectionProps {
  tickSpike: ChaosToggleView;
  historyLatency: ChaosToggleView;
  historyFailureRate: ChaosFailureRateView;
  forceClosed: ChaosToggleView;
  direction: TextDirection;
  onTickSpikeChange: (enabled: boolean) => void;
  onHistoryLatencyChange: (enabled: boolean) => void;
  onHistoryFailureRateChange: (rate: HistoryFailureRate) => void;
  onForceClosedChange: (enabled: boolean) => void;
}

function useSecondsLeft(): (secondsLeft: number | null) => string | null {
  const t = useT();
  return (secondsLeft) =>
    secondsLeft === null ? null : t("chaos.secondsLeft", { count: secondsLeft });
}

function FailureRateControl({
  rate,
  secondsLeft,
  direction,
  onChange,
}: {
  rate: HistoryFailureRate;
  secondsLeft: number | null;
  direction: TextDirection;
  onChange: (rate: HistoryFailureRate) => void;
}) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  const countdown = useSecondsLeft();
  const options = [
    { value: "0", label: t("chaos.historyFailures.off"), testID: "chaos-history-failures-0" },
    { value: "50", label: t("chaos.historyFailures.half"), testID: "chaos-history-failures-50" },
    { value: "100", label: t("chaos.historyFailures.all"), testID: "chaos-history-failures-100" },
  ] as const satisfies ReadonlyArray<{ value: RateKey; label: string; testID: string }>;
  return (
    <View style={styles.failures}>
      <View style={styles.title}>
        <Text style={[textStyles.bodyStrong, { color: palette.text }]}>
          {t("chaos.historyFailures")}
        </Text>
        <CountdownPill label={countdown(secondsLeft)} testID="chaos-countdown-history-failures" />
      </View>
      <SegmentedControl<RateKey>
        label={t("chaos.historyFailures")}
        options={options}
        value={RATES.find((option) => option.rate === rate)?.key ?? "0"}
        direction={direction}
        onSelect={(key) => onChange(RATES.find((option) => option.key === key)?.rate ?? 0)}
      />
    </View>
  );
}

export function ChaosGlobalSection(props: ChaosGlobalSectionProps) {
  const t = useT();
  const countdown = useSecondsLeft();
  return (
    <ChaosSection title={t("chaos.section.global")}>
      <SwitchRow
        label={t("chaos.tickSpike")}
        value={props.tickSpike.enabled}
        onChange={props.onTickSpikeChange}
        testID="chaos-tick-spike"
        countdown={{
          label: countdown(props.tickSpike.secondsLeft),
          testID: "chaos-countdown-tick-spike",
        }}
      />
      <SwitchRow
        label={t("chaos.historyLatency")}
        help={t("chaos.historyLatencyHelp")}
        value={props.historyLatency.enabled}
        onChange={props.onHistoryLatencyChange}
        testID="chaos-history-latency"
        countdown={{
          label: countdown(props.historyLatency.secondsLeft),
          testID: "chaos-countdown-history-latency",
        }}
      />
      <SwitchRow
        label={t("chaos.forceClosed")}
        value={props.forceClosed.enabled}
        onChange={props.onForceClosedChange}
        testID="chaos-force-closed"
        countdown={{
          label: countdown(props.forceClosed.secondsLeft),
          testID: "chaos-countdown-force-closed",
        }}
      />
      <FailureRateControl
        rate={props.historyFailureRate.rate}
        secondsLeft={props.historyFailureRate.secondsLeft}
        direction={props.direction}
        onChange={props.onHistoryFailureRateChange}
      />
    </ChaosSection>
  );
}

const styles = StyleSheet.create({
  failures: { gap: space[8] },
  title: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[8] },
});
