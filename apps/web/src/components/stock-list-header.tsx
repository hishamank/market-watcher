import { useT } from "@mini/core";
import { pinnedName, tableColumns, tableWidth } from "./stock-row.tsx";

export function StockListHeader() {
  const t = useT();
  return (
    <div
      aria-hidden="true"
      className={`hidden min-h-[44px] items-center border-b border-border text-caption font-medium text-text-secondary ${tableColumns} ${tableWidth}`}
    >
      <span className={`${pinnedName} list-custom:leading-[44px]`}>{t("list.column.name")}</span>
      <span className="list-custom:[display:var(--col-symbol)]">{t("list.column.symbol")}</span>
      <span className="text-end">{t("list.column.price")}</span>
      <span className="text-end list-custom:[display:var(--col-change)]">
        {t("list.column.change")}
      </span>
      <span className="text-end list-compact:hidden list-custom:[display:var(--col-changePercent)]">
        {t("list.column.changePercent")}
      </span>
      <span className="text-end list-compact:hidden list-custom:[display:var(--col-previousClose)]">
        {t("list.column.previousClose")}
      </span>
      <span className="hidden text-end list-wide:block list-custom:[display:var(--col-dayHigh)]">
        {t("list.column.dayHigh")}
      </span>
      <span className="hidden text-end list-wide:block list-custom:[display:var(--col-dayLow)]">
        {t("list.column.dayLow")}
      </span>
      <span className="text-end list-compact:hidden list-custom:[display:var(--col-lastUpdate)]">
        {t("list.column.lastUpdate")}
      </span>
      <span />
    </div>
  );
}
