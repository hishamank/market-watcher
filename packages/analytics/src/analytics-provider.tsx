"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { AnalyticsEvent, Track } from "./events.ts";

const ignore: Track = () => {};

const TrackContext = createContext<Track>(ignore);

export function AnalyticsProvider({ track, children }: { track: Track; children: ReactNode }) {
  return <TrackContext value={track}>{children}</TrackContext>;
}

export function useTrack(): Track {
  return useContext(TrackContext);
}

export function useTrackOnce(event: AnalyticsEvent | null, key: string): void {
  const track = useTrack();
  const firedKey = useRef<string | null>(null);
  useEffect(() => {
    if (event === null || firedKey.current === key) return;
    firedKey.current = key;
    track(event);
  }, [event, key, track]);
}
