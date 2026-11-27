import type { Change } from "@mini/contracts";
import { useT, type FlashDirection } from "@mini/core";
import type { FlashRoll } from "../integrations/use-tick-flash.ts";
import { ChangePill } from "./change-pill.tsx";
import { Morph } from "./morph.tsx";
import { PriceCell } from "./price-cell.tsx";
import { QuoteAsOf } from "./quote-as-of.tsx";
import { Skeleton } from "./skeleton.tsx";
import { updatingFade } from "./updating-fade.ts";
import { StarButton } from "./star-button.tsx";

export interface DetailHeaderProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  rangeChange: Change | undefined;
  changeLoading: boolean;
  changeUpdating?: boolean;
  rangeLabel: string;
  asOf?: string | undefined;
  asOfHelp: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  flashRoll?: FlashRoll | undefined;
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
  const t = useT();
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
          <Morph name={`stock-name-${symbol}`}>
            <h2 data-testid="detail-name" dir="auto" className="text-body text-text-secondary">
              {name}
            </h2>
          </Morph>
        </div>
        <StarButton
          symbol={symbol}
          name={name}
          starred={props.starred}
          onToggle={props.onToggleStar}
          testId="detail-star"
        />
      </div>
      <div className="mt-8">
        <span className="sr-only">{t("list.column.price")}: </span>
        <Morph name={`stock-price-${symbol}`}>
          <PriceCell
            price={props.price}
            change={props.change}
            stale={stale}
            flash={props.asOf ? undefined : props.flash}
            flashKey={props.flashKey}
            flashRoll={props.flashRoll}
            testId="detail-price"
            display
          />
        </Morph>
      </div>
      <div
        className={`mt-6 flex flex-wrap items-center gap-8 text-label font-normal text-text-secondary ${updatingFade(props.changeUpdating === true)}`}
      >
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
