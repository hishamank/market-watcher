import type { ReactNode } from "react";
import { useSegmentIndicator } from "../integrations/use-segment-indicator.ts";

export interface SegmentTrackProps {
  selected: number;
  className: string;
  role?: "tablist" | "radiogroup" | "group";
  label?: string;
  children: (ready: boolean) => ReactNode;
}

export function segmentStyle(selected: boolean, ready: boolean): string {
  const motion = "relative transition-colors duration-(--duration-fast) ease-standard";
  if (!selected) return `${motion} font-medium text-text-secondary hover:text-text`;
  return `${motion} font-semibold text-text ${ready ? "" : "bg-raised shadow-1"}`;
}

export function SegmentTrack({ selected, className, role, label, children }: SegmentTrackProps) {
  const { trackRef, indicatorRef, ready } = useSegmentIndicator(selected);
  return (
    <div
      ref={trackRef}
      role={role}
      aria-label={label}
      className={`relative rounded-lg bg-fill p-4 ${className}`}
    >
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className={`pointer-events-none absolute start-0 top-0 rounded-sm bg-raised shadow-1 motion-safe:transition-[transform,width,height] motion-safe:duration-(--duration-base) motion-safe:ease-standard ${ready ? "" : "invisible"}`}
      />
      {children(ready)}
    </div>
  );
}
