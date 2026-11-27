import {
  firstStockSortDirection,
  useT,
  type StockSort,
  type StockSortDirection,
  type StockSortField,
} from "@mini/core";
import type { ReactNode } from "react";
import { DirectionIcon } from "./icons.tsx";
import { pinnedName, tableColumns, tableWidth } from "./stock-row.tsx";

export interface FadingSort {
  readonly sort: StockSort;
  readonly onEnd: () => void;
}

export interface HeaderSort {
  readonly current: StockSort | undefined;
  readonly onSelect: (field: StockSortField) => void;
}

interface HeaderCellProps {
  readonly column: StockSortField;
  readonly className: string;
  readonly sort: HeaderSort | undefined;
  readonly fading: FadingSort | undefined;
}

const START_ALIGNED: readonly StockSortField[] = ["name", "symbol"];

const arrowIcon = { asc: "up", desc: "down" } as const;

function SortArrow(props: {
  column: StockSortField;
  direction: StockSortDirection;
  visibility: string;
  onAnimationEnd?: () => void;
}) {
  const side = START_ALIGNED.includes(props.column) ? "end-[-14px]" : "start-[-14px]";
  return (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 flex -translate-y-1/2 ${side} ${props.visibility}`}
      onAnimationEnd={props.onAnimationEnd}
    >
      <DirectionIcon direction={arrowIcon[props.direction]} />
    </span>
  );
}

function FadingLabel({
  column,
  label,
  fading,
}: {
  column: StockSortField;
  label: string;
  fading: FadingSort;
}) {
  return (
    <span className="relative inline-flex items-center">
      {label}
      <SortArrow
        column={column}
        direction={fading.sort.direction}
        visibility="opacity-0 motion-safe:animate-fade-out"
        onAnimationEnd={fading.onEnd}
      />
    </span>
  );
}

function HeaderCell({ column, className, sort, fading }: HeaderCellProps) {
  const t = useT();
  const label = t(`list.column.${column}`);
  if (sort === undefined) {
    return (
      <span aria-hidden="true" className={className}>
        {fading?.sort.field === column ? (
          <FadingLabel column={column} label={label} fading={fading} />
        ) : (
          label
        )}
      </span>
    );
  }
  const direction = sort.current?.field === column ? sort.current.direction : undefined;
  const name =
    direction === undefined
      ? t("list.sort.button", { column: label })
      : t(direction === "asc" ? "list.sort.ascending" : "list.sort.descending", { column: label });
  return (
    <span className={className}>
      <button
        type="button"
        data-testid={`watchlist-sort-${column}`}
        data-sort={direction ?? "none"}
        aria-label={name}
        onClick={() => sort.onSelect(column)}
        className={`group relative inline-flex min-h-[44px] cursor-pointer items-center rounded-sm hover:text-text ${direction === undefined ? "" : "text-text"}`}
      >
        {label}
        <SortArrow
          column={column}
          direction={direction ?? firstStockSortDirection(column)}
          visibility={`${direction === undefined ? "opacity-0 group-hover:opacity-40 group-focus-visible:opacity-40" : "opacity-100"} motion-safe:transition-opacity`}
        />
      </button>
    </span>
  );
}

export interface StockListHeaderProps {
  readonly sort?: HeaderSort | undefined;
  readonly fading?: FadingSort | undefined;
  readonly action: ReactNode;
}

export function StockListHeader({ sort, fading, action }: StockListHeaderProps) {
  const t = useT();
  const cell = (column: StockSortField, className: string) => (
    <HeaderCell column={column} className={className} sort={sort} fading={fading} />
  );
  return (
    <div
      role={sort === undefined ? undefined : "group"}
      aria-label={sort === undefined ? undefined : t("list.sort.label")}
      className={`hidden min-h-[44px] items-center border-b border-border text-caption font-medium text-text-secondary ${tableColumns} ${tableWidth}`}
    >
      {cell("name", `${pinnedName} list-custom:leading-[44px]`)}
      {cell("symbol", "list-custom:[display:var(--col-symbol)]")}
      {cell("price", "text-end")}
      {cell("change", "text-end list-custom:[display:var(--col-change)]")}
      {cell(
        "changePercent",
        "text-end list-compact:hidden list-custom:[display:var(--col-changePercent)]",
      )}
      {cell(
        "previousClose",
        "text-end list-compact:hidden list-custom:[display:var(--col-previousClose)]",
      )}
      {cell("dayHigh", "hidden text-end list-wide:block list-custom:[display:var(--col-dayHigh)]")}
      {cell("dayLow", "hidden text-end list-wide:block list-custom:[display:var(--col-dayLow)]")}
      {cell(
        "lastUpdate",
        "text-end list-compact:hidden list-custom:[display:var(--col-lastUpdate)]",
      )}
      <div className="grid items-center list-custom:sticky list-custom:end-0 list-custom:self-stretch list-custom:bg-surface">
        {action}
      </div>
    </div>
  );
}
