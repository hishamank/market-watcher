import { directionOf, formatPrice, formatSignedPercent, type FlashDirection } from "@mini/core";
import Link from "next/link";
import type { FlashRoll } from "../integrations/use-tick-flash.ts";
import { ChangePill } from "./change-pill.tsx";
import { Morph, OPEN_STOCK } from "./morph.tsx";
import { PriceCell } from "./price-cell.tsx";
import { StarButton } from "./star-button.tsx";

export const tableColumns =
  "list-table:grid list-table:grid-cols-[minmax(0,1fr)_88px_110px_128px_96px_124px_124px_44px] list-table:gap-x-16 list-table:ps-20 list-table:pe-8 list-wide:grid-cols-[minmax(0,1fr)_88px_110px_128px_96px_124px_104px_104px_124px_44px] list-compact:grid list-compact:grid-cols-[minmax(0,1fr)_72px_104px_172px_44px] list-compact:gap-x-16 list-compact:ps-20 list-compact:pe-8 list-custom:grid-cols-(--table-cols) list-custom:ps-0";

export const pinnedName =
  "list-custom:sticky list-custom:start-0 list-custom:z-1 list-custom:self-stretch list-custom:bg-surface list-custom:ps-20";

export const tableScroll = "list-custom:overflow-x-auto";
export const tableWidth = "list-custom:min-w-(--table-min)";

export interface StockRowProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  previousClose: string;
  dayHigh: string;
  dayLow: string;
  lastUpdate: string;
  asOf?: string | undefined;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  flashRoll?: FlashRoll | undefined;
  starred: boolean | undefined;
  onToggleStar: () => void;
  morph?: boolean;
  href?: string;
}

const tableOnly = "hidden text-end text-label font-normal text-text-secondary list-table:block";

const wideOnly = "hidden text-end text-label font-normal text-text-secondary list-wide:block";

const percentTones = { up: "text-gain", down: "text-loss", flat: "text-flat" } as const;

function ReferenceCells(props: StockRowProps) {
  return (
    <>
      <bdi dir="ltr" className={`${tableOnly} list-custom:[display:var(--col-previousClose)]`}>
        {formatPrice(props.previousClose)}
      </bdi>
      <bdi
        dir="ltr"
        data-testid={`stock-row-high-${props.symbol}`}
        className={`${wideOnly} list-custom:[display:var(--col-dayHigh)]`}
      >
        {props.dayHigh}
      </bdi>
      <bdi
        dir="ltr"
        data-testid={`stock-row-low-${props.symbol}`}
        className={`${wideOnly} list-custom:[display:var(--col-dayLow)]`}
      >
        {props.dayLow}
      </bdi>
      <bdi dir="ltr" className={`${tableOnly} list-custom:[display:var(--col-lastUpdate)]`}>
        {props.lastUpdate}
      </bdi>
    </>
  );
}

export function StockRow(props: StockRowProps) {
  const { symbol, name, stale, flash } = props;
  return (
    <div
      data-testid={`stock-row-${symbol}`}
      className={`group flex min-h-[68px] items-center ps-16 pe-6 transition-colors duration-(--duration-fast) ease-standard hover:bg-hover list-table:min-h-[56px] list-compact:min-h-[56px] ${tableColumns}`}
    >
      <Link
        href={props.href ?? `/stocks/${symbol}`}
        transitionTypes={[OPEN_STOCK]}
        className="-ms-8 flex min-w-0 flex-1 items-center gap-12 self-stretch rounded-md ps-8 focus-visible:outline-offset-[-2px] list-table:col-span-7 list-wide:col-span-9 list-custom:col-span-(--table-span) list-custom:mx-0 list-custom:px-0 list-table:-mx-8 list-table:grid list-table:grid-cols-subgrid list-table:px-8 list-compact:col-span-4 list-compact:-mx-8 list-compact:grid list-compact:grid-cols-subgrid list-compact:px-8"
      >
        <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px] list-table:contents list-compact:contents">
          <Morph name={`stock-name-${symbol}`} enabled={props.morph}>
            <span
              className={`max-w-full overflow-x-clip whitespace-nowrap text-body-strong list-table:text-body list-table:font-medium list-compact:text-body list-compact:font-medium ${pinnedName} list-custom:leading-[56px] transition-colors duration-(--duration-fast) ease-standard list-custom:group-hover:bg-hover`}
            >
              <span
                data-testid={`stock-row-name-${symbol}`}
                dir="auto"
                className="block overflow-x-clip text-ellipsis rtl:text-end"
              >
                {name}
              </span>
            </span>
          </Morph>
          <bdi
            dir="ltr"
            className="text-caption text-text-muted list-table:text-label list-table:font-normal list-compact:text-label list-compact:font-normal list-custom:[display:var(--col-symbol)]"
          >
            {symbol}
          </bdi>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-4 list-table:contents list-compact:contents">
          <span className="list-table:text-end list-compact:text-end">
            <Morph name={`stock-price-${symbol}`} enabled={props.morph}>
              <PriceCell
                price={props.price}
                change={props.change}
                stale={stale}
                asOf={props.asOf}
                flash={props.asOf ? undefined : flash}
                flashKey={props.flashKey}
                flashRoll={props.flashRoll}
                testId={`stock-row-price-${symbol}`}
              />
            </Morph>
          </span>
          <span className="list-table:justify-self-end list-compact:justify-self-end list-custom:[display:var(--col-change)]">
            <ChangePill
              change={props.change}
              changePercent={props.changePercent}
              stale={stale || !!props.asOf}
              testId={`stock-row-change-${symbol}`}
              percentClassName="list-table:hidden list-custom:[display:var(--col-pill-percent)]"
            />
          </span>
          <bdi
            dir="ltr"
            data-testid={`stock-row-percent-${symbol}`}
            className={`hidden text-end text-numeric-change list-table:block list-custom:[display:var(--col-changePercent)] ${stale || props.asOf ? "text-text-secondary" : percentTones[directionOf(props.change)]}`}
          >
            {formatSignedPercent(props.changePercent)}
          </bdi>
          <ReferenceCells {...props} />
        </span>
      </Link>
      <StarButton
        name={name}
        starred={props.starred}
        onToggle={props.onToggleStar}
        testId={`star-${symbol}`}
      />
    </div>
  );
}
