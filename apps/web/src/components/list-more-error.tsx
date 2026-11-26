import { useT } from "@mini/core";
import { Button } from "./button.tsx";

export interface ListMoreErrorProps {
  onRetry: () => void;
}

export function ListMoreError({ onRetry }: ListMoreErrorProps) {
  const t = useT();
  return (
    <div
      data-testid="list-more-error"
      role="alert"
      className="flex items-center justify-between gap-12 border-t border-border py-12 ps-16 pe-6 list-table:ps-20 list-table:pe-8 list-compact:ps-20 list-compact:pe-8"
    >
      <p className="text-label font-normal text-text-secondary">{t("list.more.error")}</p>
      <Button testId="list-more-retry" compact onClick={onRetry}>
        {t("list.error.retry")}
      </Button>
    </div>
  );
}
