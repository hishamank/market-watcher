import { useEffect, useRef, useState, type RefObject } from "react";

export interface SegmentIndicator {
  readonly trackRef: RefObject<HTMLDivElement | null>;
  readonly indicatorRef: RefObject<HTMLSpanElement | null>;
  readonly ready: boolean;
}

function offsetX(track: HTMLElement, option: HTMLElement): number {
  const rtl = getComputedStyle(track).direction === "rtl";
  return rtl ? option.offsetLeft + option.offsetWidth - track.clientWidth : option.offsetLeft;
}

export function useSegmentIndicator(selected: number): SegmentIndicator {
  const trackRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    const indicator = indicatorRef.current;
    if (track === null || indicator === null) return undefined;
    const options = Array.from(track.querySelectorAll<HTMLElement>("[data-segment]"));
    const place = () => {
      const option = options[selected];
      if (option === undefined) return;
      if (!placed.current) indicator.style.transitionDuration = "0s";
      indicator.style.width = `${option.offsetWidth}px`;
      indicator.style.height = `${option.offsetHeight}px`;
      indicator.style.transform = `translate(${offsetX(track, option)}px, ${option.offsetTop}px)`;
      if (!placed.current) {
        indicator.getBoundingClientRect();
        indicator.style.transitionDuration = "";
        placed.current = true;
      }
      setReady(true);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(track);
    for (const option of options) observer.observe(option);
    return () => observer.disconnect();
  }, [selected]);

  return { trackRef, indicatorRef, ready };
}
