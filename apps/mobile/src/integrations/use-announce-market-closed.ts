import { useMarketStatus, useT } from "@mini/core";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useAnnounceMarketClosed() {
  const closed = useMarketStatus() === "closed";
  const message = useT()("marketStatus.closed");
  const announced = useRef(false);

  useEffect(() => {
    if (!closed) {
      announced.current = false;
      return;
    }
    if (announced.current || Platform.OS !== "ios") return;
    announced.current = true;
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, [closed, message]);
}
