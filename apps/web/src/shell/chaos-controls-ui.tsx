import type { HistoryFailureRate } from "@mini/contracts";
import { useT } from "@mini/core";
import { ClockIcon } from "../components/icons.tsx";

export interface CountdownPillProps {
  secondsLeft: number | null;
  testId: string;
}

export function CountdownPill({ secondsLeft, testId }: CountdownPillProps) {
  const t = useT();
  if (secondsLeft === null) {
    return null;
  }
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-4 rounded-pill bg-stale-tint px-8 py-2 text-caption font-medium text-stale"
    >
      <ClockIcon className="text-stale" />
      <bdi dir="ltr">{t("chaos.secondsLeft", { count: secondsLeft })}</bdi>
    </span>
  );
}

export interface ChaosSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId: string;
}

export function ChaosSwitch({ label, checked, onChange, testId }: ChaosSwitchProps) {
  const track = checked ? "bg-text" : "bg-fill";
  const knob = checked ? "ms-[18px] bg-bg" : "ms-0 bg-text-secondary";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] min-w-[52px] shrink-0 items-center justify-end"
    >
      <span className={`flex h-[26px] w-[44px] items-center rounded-pill p-[3px] ${track}`}>
        <span
          className={`size-[20px] rounded-pill motion-safe:transition-[margin] duration-fast ease-standard ${knob}`}
        />
      </span>
    </button>
  );
}

export interface SwitchRowProps {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId: string;
  secondsLeft?: number | null;
  countdownTestId?: string;
}

export function SwitchRow(props: SwitchRowProps) {
  const { label, help, checked, onChange, testId, secondsLeft = null, countdownTestId } = props;
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-12">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-8">
          <span className="text-body-strong">{label}</span>
          {countdownTestId !== undefined ? (
            <CountdownPill secondsLeft={secondsLeft} testId={countdownTestId} />
          ) : null}
        </div>
        {help !== undefined ? <p className="text-caption text-text-secondary">{help}</p> : null}
      </div>
      <ChaosSwitch label={label} checked={checked} onChange={onChange} testId={testId} />
    </div>
  );
}

export interface FailureRateControlProps {
  rate: HistoryFailureRate;
  secondsLeft: number | null;
  onChange: (rate: HistoryFailureRate) => void;
}

export function FailureRateControl({ rate, secondsLeft, onChange }: FailureRateControlProps) {
  const t = useT();
  const options: ReadonlyArray<{ value: HistoryFailureRate; label: string; testId: string }> = [
    { value: 0, label: t("chaos.historyFailures.off"), testId: "chaos-history-failures-0" },
    { value: 50, label: t("chaos.historyFailures.half"), testId: "chaos-history-failures-50" },
    { value: 100, label: t("chaos.historyFailures.all"), testId: "chaos-history-failures-100" },
  ];
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-8">
        <span className="text-body-strong">{t("chaos.historyFailures")}</span>
        <CountdownPill secondsLeft={secondsLeft} testId="chaos-countdown-history-failures" />
      </div>
      <div
        role="radiogroup"
        aria-label={t("chaos.historyFailures")}
        className="grid grid-cols-3 gap-2 rounded-lg bg-fill p-4"
      >
        {options.map((option) => {
          const selected = rate === option.value;
          const style = selected
            ? "bg-raised font-semibold text-text shadow-1"
            : "text-text-secondary";
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={option.testId}
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] rounded-sm px-8 text-label ${style}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
