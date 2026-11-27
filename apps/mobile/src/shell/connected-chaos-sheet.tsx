import { useChaosControls, useConnectionHealth, useFeedMode, useLanguage } from "@mini/core";
import { Redirect, useRouter } from "expo-router";
import { ChaosSheetView } from "../components/chaos-sheet-view.tsx";
import { useDebugTools, useDebugToolsRestored } from "../platform/debug-tools.ts";

function ChaosSheet() {
  const chaos = useChaosControls();
  const health = useConnectionHealth();
  const { direction } = useLanguage();
  const router = useRouter();
  return (
    <ChaosSheetView
      tickSpike={chaos.tickSpike}
      historyLatency={chaos.historyLatency}
      historyFailureRate={chaos.historyFailureRate}
      forceClosed={chaos.forceClosed}
      health={health}
      direction={direction}
      onClose={() => (router.canGoBack() ? router.back() : router.replace("/"))}
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
  const debugTools = useDebugTools();
  const restored = useDebugToolsRestored();
  if (feedMode === null || !restored) return null;
  if (feedMode !== "simulated" || !debugTools) return <Redirect href="/" />;
  return <ChaosSheet />;
}
