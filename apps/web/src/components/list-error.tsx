import { useT } from "@mini/core";
import { Button } from "./button.tsx";
import { EmptyState } from "./empty-state.tsx";
import { AlertIcon } from "./icons.tsx";

export interface ListErrorProps {
  onRetry: () => void;
}

export function ListError({ onRetry }: ListErrorProps) {
  const t = useT();
  return (
    <EmptyState
      testId="list-error"
      icon={<AlertIcon />}
      title={t("list.error.title")}
      help={t("list.error.help")}
      action={
        <Button testId="list-retry" variant="solid" onClick={onRetry}>
          {t("list.error.retry")}
        </Button>
      }
    />
  );
}
