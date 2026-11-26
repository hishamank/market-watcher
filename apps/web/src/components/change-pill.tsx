import { directionOf, formatSignedAmount, formatSignedPercent, type Direction } from "@mini/core";
import { DirectionIcon } from "./icons.tsx";

export interface ChangePillProps {
  change: string;
  changePercent: string;
  stale: boolean;
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
  const { change, changePercent, stale, testId, large = false } = props;
  const percent = ` (${formatSignedPercent(changePercent)})`;
  const direction = directionOf(change);
  const size = large ? "px-10 py-[3px] text-label leading-[18px]" : "px-8 py-2 text-numeric-change";
  return (
    <bdi
      dir="ltr"
      data-testid={testId}
      data-direction={direction}
      className={`inline-flex items-center gap-[5px] rounded-pill whitespace-nowrap ${size} ${stale ? "bg-fill text-text-secondary" : tones[direction]}`}
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
    </bdi>
  );
}
