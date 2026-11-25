import { useT } from "@mini/core";
import { Button } from "./button.tsx";
import { EmptyState } from "./empty-state.tsx";
import { AlertIcon } from "./icons.tsx";

export function DetailError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <EmptyState
      testId="detail-error"
      icon={<AlertIcon />}
      title={t("detail.error.title")}
      help={t("detail.error.help")}
      action={
        <Button testId="detail-retry" variant="solid" onClick={onRetry}>
          {t("detail.error.retry")}
        </Button>
      }
    />
  );
}
