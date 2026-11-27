"use client";

import { useChaosControls, useConnectionHealth } from "@mini/core";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOfflineControl } from "../platform/offline-context.tsx";
import { ChaosPanelView } from "./chaos-panel-view.tsx";

function ConnectedChaosPanel({ onClose }: { onClose: () => void }) {
  const chaos = useChaosControls();
  const health = useConnectionHealth();
  const { offline, setOffline } = useOfflineControl();
  return (
    <ChaosPanelView
      sharedControls={chaos.sharedControls}
      offline={offline}
      tickSpike={chaos.tickSpike}
      historyLatency={chaos.historyLatency}
      historyFailureRate={chaos.historyFailureRate}
      forceClosed={chaos.forceClosed}
      health={health}
      onClose={onClose}
      onDrop={chaos.dropConnection}
      onFreeze={chaos.freezeFeed}
      onOfflineChange={setOffline}
      onTickSpikeChange={chaos.setTickSpike}
      onHistoryLatencyChange={chaos.setHistoryLatency}
      onHistoryFailureRateChange={chaos.setHistoryFailureRate}
      onForceClosedChange={chaos.setForceClosed}
    />
  );
}

export function ChaosPanel() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  if (searchParams.get("debug") !== "1") {
    return null;
  }

  const handleClose = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("debug");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return <ConnectedChaosPanel onClose={handleClose} />;
}
