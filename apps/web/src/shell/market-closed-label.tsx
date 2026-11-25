import { MoonIcon } from "../components/icons.tsx";
import { useT } from "../i18n/use-t.ts";

export function MarketClosedLabel() {
  const t = useT();
  return (
    <span
      data-testid="market-status-label"
      className="inline-flex items-center gap-[5px] text-caption font-medium text-text-secondary"
    >
      <MoonIcon />
      {t("marketStatus.closed")}
    </span>
  );
}
