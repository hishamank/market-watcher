import { directionOf, formatPrice, formatSignedPercent, type FlashDirection } from "@mini/core";
import Link from "next/link";
import { ChangePill } from "./change-pill.tsx";
import { PriceCell } from "./price-cell.tsx";
import { StarButton } from "./star-button.tsx";

export const tableColumns =
  "xl:grid xl:grid-cols-[minmax(0,1fr)_88px_110px_128px_96px_124px_124px_44px] xl:gap-x-16 xl:ps-20 xl:pe-8";

export interface StockRowProps {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  previousClose: string;
  lastUpdate: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  starred: boolean | undefined;
  onToggleStar: () => void;
}

const tableOnly = "hidden text-end text-label font-normal text-text-secondary xl:block";

const percentTones = { up: "text-gain", down: "text-loss", flat: "text-flat" } as const;

export function StockRow(props: StockRowProps) {
  const { symbol, name, stale, flash } = props;
  return (
    <div
      data-testid={`stock-row-${symbol}`}
      className={`flex min-h-[68px] items-center ps-16 pe-6 hover:bg-hover xl:min-h-[56px] ${tableColumns}`}
    >
      <Link
        href={`/stocks/${symbol}`}
        prefetch={false}
        className="-ms-8 flex min-w-0 flex-1 items-center gap-12 self-stretch rounded-md ps-8 focus-visible:outline-offset-[-2px] xl:col-span-7 xl:-mx-8 xl:grid xl:grid-cols-subgrid xl:px-8"
      >
        <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px] xl:contents">
          <span
            data-testid={`stock-row-name-${symbol}`}
            className="max-w-full overflow-x-clip text-ellipsis whitespace-nowrap text-body-strong xl:text-body xl:font-medium"
          >
            {name}
          </span>
          <bdi dir="ltr" className="text-caption text-text-muted xl:text-label xl:font-normal">
            {symbol}
          </bdi>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-4 xl:contents">
          <span className="xl:text-end">
            <PriceCell
              price={props.price}
              change={props.change}
              stale={stale}
              flash={flash}
              testId={`stock-row-price-${symbol}`}
            />
          </span>
          <span className="xl:justify-self-end">
            <ChangePill
              change={props.change}
              changePercent={props.changePercent}
              stale={stale}
              flash={flash}
              flashKey={props.flashKey}
              testId={`stock-row-change-${symbol}`}
              percentClassName="xl:hidden"
            />
          </span>
          <bdi
            dir="ltr"
            data-testid={`stock-row-percent-${symbol}`}
            className={`hidden text-end text-numeric-change xl:block ${stale ? "text-text-secondary" : percentTones[directionOf(props.change)]}`}
          >
            {formatSignedPercent(props.changePercent)}
          </bdi>
          <bdi dir="ltr" className={tableOnly}>
            {formatPrice(props.previousClose)}
          </bdi>
          <bdi dir="ltr" className={tableOnly}>
            {props.lastUpdate}
          </bdi>
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
