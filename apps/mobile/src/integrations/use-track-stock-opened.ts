import { useTrack } from "@mini/core";
import { useEffect } from "react";

export function useTrackStockOpened(symbol: string): void {
  const track = useTrack();
  useEffect(() => {
    track({ name: "stock_opened", symbol });
  }, [track, symbol]);
}
