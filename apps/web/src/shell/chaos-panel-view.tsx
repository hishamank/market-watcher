import type { HistoryFailureRate } from "@mini/contracts";
import {
  type ChaosFailureRateView,
  type ChaosToggleView,
  type ConnectionHealth,
  useT,
} from "@mini/core";
import { Button } from "../components/button.tsx";
import { BoltIcon } from "../components/icons.tsx";
import { FailureRateControl, SwitchRow } from "./chaos-controls-ui.tsx";
import { HealthSection } from "./health-tiles.tsx";

export interface ChaosPanelViewProps {
  sharedControls: boolean;
  offline: boolean;
  tickSpike: ChaosToggleView;
  historyLatency: ChaosToggleView;
  historyFailureRate: ChaosFailureRateView;
  forceClosed: ChaosToggleView;
  health: ConnectionHealth;
  onClose: () => void;
  onDrop: () => void;
  onFreeze: () => void;
  onOfflineChange: (offline: boolean) => void;
  onTickSpikeChange: (enabled: boolean) => void;
  onHistoryLatencyChange: (enabled: boolean) => void;
  onHistoryFailureRateChange: (rate: HistoryFailureRate) => void;
  onForceClosedChange: (enabled: boolean) => void;
}

function ConnectionSection(props: ChaosPanelViewProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-12 border-t border-border pt-12">
      <h3 className="text-label text-text-secondary">{t("chaos.section.connection")}</h3>
      <div className="grid grid-cols-2 gap-8">
        <Button testId="chaos-drop" onClick={props.onDrop} compact>
          {t("chaos.drop")}
        </Button>
        <Button testId="chaos-freeze" onClick={props.onFreeze} compact>
          {t("chaos.freeze")}
        </Button>
      </div>
      <SwitchRow
        label={t("chaos.offline")}
        checked={props.offline}
        onChange={props.onOfflineChange}
        testId="chaos-offline"
      />
    </div>
  );
}

function GlobalSection(props: ChaosPanelViewProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-12 border-t border-border pt-12">
      <h3 className="text-label text-text-secondary">{t("chaos.section.global")}</h3>
      <SwitchRow
        label={t("chaos.tickSpike")}
        checked={props.tickSpike.enabled}
        secondsLeft={props.tickSpike.secondsLeft}
        countdownTestId="chaos-countdown-tick-spike"
        onChange={props.onTickSpikeChange}
        testId="chaos-tick-spike"
      />
      <SwitchRow
        label={t("chaos.historyLatency")}
        help={t("chaos.historyLatencyHelp")}
        checked={props.historyLatency.enabled}
        secondsLeft={props.historyLatency.secondsLeft}
        countdownTestId="chaos-countdown-history-latency"
        onChange={props.onHistoryLatencyChange}
        testId="chaos-history-latency"
      />
      <SwitchRow
        label={t("chaos.forceClosed")}
        checked={props.forceClosed.enabled}
        secondsLeft={props.forceClosed.secondsLeft}
        countdownTestId="chaos-countdown-force-closed"
        onChange={props.onForceClosedChange}
        testId="chaos-force-closed"
      />
      <FailureRateControl
        rate={props.historyFailureRate.rate}
        secondsLeft={props.historyFailureRate.secondsLeft}
        onChange={props.onHistoryFailureRateChange}
      />
    </div>
  );
}

export function ChaosPanelView(props: ChaosPanelViewProps) {
  const t = useT();
  return (
    <>
      <div
        aria-hidden="true"
        onClick={props.onClose}
        className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.45)] md:hidden"
      />
      <section
        data-testid="chaos-panel"
        aria-label={t("chaos.title")}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-16 overflow-y-auto rounded-t-xl border-t border-border bg-surface p-16 shadow-2 md:inset-x-auto md:end-24 md:bottom-24 md:w-[360px] md:rounded-xl md:border"
      >
        <header className="flex items-start justify-between gap-12">
          <div className="flex items-start gap-10">
            <BoltIcon className="mt-2 text-accent" />
            <div>
              <h2 className="text-heading-md">{t("chaos.title")}</h2>
              <p className="text-caption text-text-secondary">{t("chaos.subtitle")}</p>
            </div>
          </div>
          <Button testId="chaos-close" onClick={props.onClose} compact>
            {t("chaos.close")}
          </Button>
        </header>
        <ConnectionSection {...props} />
        {props.sharedControls && <GlobalSection {...props} />}
        <HealthSection health={props.health} />
      </section>
    </>
  );
}
