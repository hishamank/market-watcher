import {
  firstStockSortDirection,
  useT,
  type StockSort,
  type StockSortDirection,
  type StockSortField,
} from "@mini/core";
import { DirectionIcon } from "./icons.tsx";
import { pinnedName, tableColumns, tableWidth } from "./stock-row.tsx";

export interface HeaderSort {
  readonly current: StockSort | undefined;
  readonly onSelect: (field: StockSortField) => void;
}

interface HeaderCellProps {
  readonly column: StockSortField;
  readonly className: string;
  readonly sort: HeaderSort | undefined;
}

const START_ALIGNED: readonly StockSortField[] = ["name", "symbol"];

const arrowIcon = { asc: "up", desc: "down" } as const;

function SortArrow({
  column,
  active,
}: {
  column: StockSortField;
  active: StockSortDirection | undefined;
}) {
  const side = START_ALIGNED.includes(column) ? "end-[-14px]" : "start-[-14px]";
  const shown = active === undefined ? "opacity-0 group-hover:opacity-40" : "opacity-100";
  return (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 flex -translate-y-1/2 ${side} ${shown} group-focus-visible:opacity-100 motion-safe:transition-opacity`}
    >
      <DirectionIcon direction={arrowIcon[active ?? firstStockSortDirection(column)]} />
    </span>
  );
}

function HeaderCell({ column, className, sort }: HeaderCellProps) {
  const t = useT();
  const label = t(`list.column.${column}`);
  if (sort === undefined) return <span className={className}>{label}</span>;
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
        <SortArrow column={column} active={direction} />
      </button>
    </span>
  );
}

export function StockListHeader({ sort }: { sort?: HeaderSort | undefined }) {
  const t = useT();
  const cell = (column: StockSortField, className: string) => (
    <HeaderCell column={column} className={className} sort={sort} />
  );
  return (
    <div
      aria-hidden={sort === undefined ? "true" : undefined}
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
      <span aria-hidden="true" />
    </div>
  );
}
