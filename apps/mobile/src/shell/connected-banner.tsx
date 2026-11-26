import { useConnectionStatus, useT } from "@mini/core";
import { ConnectionBanner } from "../components/connection-banner.tsx";
import { usePalette } from "../theme/palette.ts";

import { useReduceMotion } from "../integrations/use-reduce-motion.ts";

export function ConnectedBanner() {
  const { status, retryNow } = useConnectionStatus();
  const t = useT();
  const palette = usePalette();
  const reduceMotion = useReduceMotion();
  if (status === "connected" || status === "connecting") return null;
  return (
    <ConnectionBanner
      reduceMotion={reduceMotion}
      offline={status === "offline"}
      palette={palette}
      title={t(`connection.${status}.title`)}
      help={t(`connection.${status}.help`)}
      retryLabel={t("connection.retry")}
      onRetry={retryNow}
    />
  );
}
