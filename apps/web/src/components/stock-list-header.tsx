import { useT } from "@mini/core";
import { tableColumns } from "./stock-row.tsx";

export function StockListHeader() {
  const t = useT();
  return (
    <div
      aria-hidden="true"
      className={`hidden min-h-[44px] items-center border-b border-border text-caption font-medium text-text-secondary ${tableColumns}`}
    >
      <span>{t("list.column.name")}</span>
      <span>{t("list.column.symbol")}</span>
      <span className="text-end">{t("list.column.price")}</span>
      <span className="text-end">{t("list.column.change")}</span>
      <span className="text-end">{t("list.column.changePercent")}</span>
      <span className="text-end">{t("list.column.previousClose")}</span>
      <span className="text-end">{t("list.column.lastUpdate")}</span>
      <span />
    </div>
  );
}
