import { useMarketStatus, useT } from "@mini/core";
import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useAnnounceMarketClosed() {
  const status = useMarketStatus();
  const t = useT();
  const message = status === "closed" ? t("marketStatus.closed") : undefined;

  useEffect(() => {
    if (message === undefined || Platform.OS !== "ios") return;
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
