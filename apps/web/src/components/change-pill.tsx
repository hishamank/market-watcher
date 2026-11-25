import {
  directionOf,
  formatSignedAmount,
  formatSignedPercent,
  type Direction,
  type FlashDirection,
} from "@mini/core";
import { DirectionIcon } from "./icons.tsx";

export interface ChangePillProps {
  change: string;
  changePercent: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  testId: string;
  large?: boolean;
  percentClassName?: string;
}

const tones: Record<Direction, string> = {
  up: "bg-gain-tint text-gain",
  down: "bg-loss-tint text-loss",
  flat: "bg-fill text-flat",
};

export function ChangePill(props: ChangePillProps) {
  const { change, changePercent, stale, flash, flashKey, testId, large = false } = props;
  const percent = ` (${formatSignedPercent(changePercent)})`;
  const direction = directionOf(change);
  const size = large ? "px-10 py-[3px] text-label leading-[18px]" : "px-8 py-2 text-numeric-change";
  return (
    <bdi
      dir="ltr"
      data-testid={testId}
      data-direction={direction}
      className={`relative inline-flex items-center gap-[5px] rounded-pill whitespace-nowrap ${size} ${stale ? "bg-fill text-text-secondary" : tones[direction]}`}
    >
      <DirectionIcon direction={direction} />
      {props.percentClassName === undefined ? (
        `${formatSignedAmount(change)}${percent}`
      ) : (
        <>
          {formatSignedAmount(change)}
          <span className={props.percentClassName}>{percent}</span>
        </>
      )}
      {flash === undefined ? null : (
        <span
          key={flashKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-flash rounded-pill shadow-[0_0_0_1.5px_currentColor] motion-reduce:hidden"
        />
      )}
    </bdi>
  );
}
