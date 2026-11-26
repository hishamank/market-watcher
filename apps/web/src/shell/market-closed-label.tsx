import { useT } from "@mini/core";
import { MoonIcon } from "../components/icons.tsx";

export function MarketClosedLabel() {
  const t = useT();
  return (
    <span
      data-testid="market-status-label"
      className="inline-flex items-center gap-[5px] text-caption font-medium whitespace-nowrap text-text-secondary"
    >
      <MoonIcon />
      {t("marketStatus.closed")}
    </span>
  );
}
