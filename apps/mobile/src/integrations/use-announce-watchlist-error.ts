import { useT, useWatchlist } from "@mini/core";
import { useEffect } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useAnnounceWatchlistError() {
  const { saveFailed } = useWatchlist();
  const message = useT()("watchlist.toast.error");
  useEffect(() => {
    if (saveFailed && Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
    }
  }, [saveFailed, message]);
}
