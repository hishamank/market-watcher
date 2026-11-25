import { useT } from "@mini/core";
import { EmptyState } from "./empty-state.tsx";

export function ListError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <EmptyState
      testID="list-error"
      icon="!"
      title={t("list.error.title")}
      help={t("list.error.help")}
      actionLabel={t("list.error.retry")}
      actionTestID="list-retry"
      onAction={onRetry}
    />
  );
}
