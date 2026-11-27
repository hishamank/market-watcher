import { useChaosControls, useConnectionHealth, useFeedMode } from "@mini/core";
import { useRouter } from "expo-router";
import { ChaosSheetView } from "../components/chaos-sheet-view.tsx";

function ChaosSheet() {
  const chaos = useChaosControls();
  const health = useConnectionHealth();
  const router = useRouter();
  return (
    <ChaosSheetView
      tickSpike={chaos.tickSpike}
      historyLatency={chaos.historyLatency}
      historyFailureRate={chaos.historyFailureRate}
      forceClosed={chaos.forceClosed}
      health={health}
      onClose={() => router.back()}
      onDrop={chaos.dropConnection}
      onFreeze={chaos.freezeFeed}
      onTickSpikeChange={chaos.setTickSpike}
      onHistoryLatencyChange={chaos.setHistoryLatency}
      onHistoryFailureRateChange={chaos.setHistoryFailureRate}
      onForceClosedChange={chaos.setForceClosed}
    />
  );
}

export function ConnectedChaosSheet() {
  const feedMode = useFeedMode();
  if (feedMode !== "simulated") return null;
  return <ChaosSheet />;
}
