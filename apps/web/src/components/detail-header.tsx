import type { Change } from "@mini/contracts";
import type { FlashDirection } from "@mini/core";
import { ChangePill } from "./change-pill.tsx";
import { PriceCell } from "./price-cell.tsx";
import { QuoteAsOf } from "./quote-as-of.tsx";
import { Skeleton } from "./skeleton.tsx";
import { StarButton } from "./star-button.tsx";

export interface DetailHeaderProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  rangeChange: Change | undefined;
  changeLoading: boolean;
  rangeLabel: string;
  asOf?: string | undefined;
  asOfHelp: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  flashFrom?: string | undefined;
  starred: boolean | undefined;
  onToggleStar: () => void;
}

function UnknownChange() {
  return (
    <bdi
      dir="ltr"
      data-testid="detail-change"
      data-direction="flat"
      className="inline-flex items-center gap-[5px] rounded-pill bg-fill px-10 py-[3px] text-label leading-[18px] text-flat"
    >
      —
    </bdi>
  );
}

export function DetailHeader(props: DetailHeaderProps) {
  const { symbol, name, rangeChange, stale } = props;
  return (
    <header data-testid="detail-header" className="flex flex-col">
      <div className="flex items-start justify-between gap-12">
        <div className="flex min-w-0 flex-col items-start gap-6">
          <bdi
            dir="ltr"
            className="rounded-pill bg-fill px-10 py-[3px] text-caption font-medium text-text-secondary"
          >
            {symbol}
          </bdi>
          <h2 data-testid="detail-name" className="text-body text-text-secondary">
            {name}
          </h2>
        </div>
        <StarButton
          name={name}
          starred={props.starred}
          onToggle={props.onToggleStar}
          testId="detail-star"
        />
      </div>
      <div className="mt-8">
        <PriceCell
          price={props.price}
          change={props.change}
          stale={stale}
          flash={props.asOf ? undefined : props.flash}
          flashKey={props.flashKey}
          flashFrom={props.flashFrom}
          testId="detail-price"
          display
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-8 text-label font-normal text-text-secondary">
        {props.changeLoading ? (
          <Skeleton className="h-[24px] w-[132px]" pill />
        ) : rangeChange === undefined ? (
          <UnknownChange />
        ) : (
          <ChangePill
            change={rangeChange.change}
            changePercent={rangeChange.changePercent}
            stale={stale || !!props.asOf}
            testId="detail-change"
            large
          />
        )}
        <bdi data-testid="detail-change-label">{props.rangeLabel}</bdi>
      </div>
      {props.asOf ? <QuoteAsOf label={props.asOf} help={props.asOfHelp} /> : null}
    </header>
  );
}
