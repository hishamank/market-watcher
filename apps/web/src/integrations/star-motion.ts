import { duration, easing } from "@mini/tokens";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

const ease = `cubic-bezier(${easing.standard.join(", ")})`;
const FLIGHT_STEPS = 12;
const FLIGHT_END_SCALE = 0.6;
const TARGET_BUMP_SCALE = 1.3;

let current: ViewTransition | undefined;
const NO_FLIGHTS: readonly string[] = [];
const flights = new Map<string, Animation>();
let flying = NO_FLIGHTS;
const flightListeners = new Set<() => void>();

function publishFlights(): void {
  flying = [...flights.keys()];
  for (const listener of flightListeners) listener();
}

function land(symbol: string, flight: Animation): void {
  if (flights.get(symbol) !== flight) return;
  flights.delete(symbol);
  publishFlights();
}

function subscribeFlights(listener: () => void): () => void {
  flightListeners.add(listener);
  return () => flightListeners.delete(listener);
}

export function useStarsInFlight(): readonly string[] {
  return useSyncExternalStore(
    subscribeFlights,
    () => flying,
    () => NO_FLIGHTS,
  );
}

export function cancelStarFlight(symbol: string): void {
  const flight = flights.get(symbol);
  if (flight === undefined) return;
  land(symbol, flight);
  flight.cancel();
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function starRowName(symbol: string): string {
  return `star-row-${symbol.replace(/[^A-Za-z0-9]/g, "-")}`;
}

export function startStarTransition(starring: boolean, update: () => void): void {
  if (reducedMotion() || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.starMotion = starring ? "star" : "unstar";
  const transition = document.startViewTransition(() => flushSync(update));
  current = transition;
  void transition.finished.finally(() => {
    if (current === transition) delete root.dataset.starMotion;
  });
}

export function useStarTransition(
  symbols: readonly string[],
  toggle: (symbol: string) => void,
): (symbol: string) => void {
  const latest = useRef(symbols);
  useLayoutEffect(() => {
    latest.current = symbols;
  });
  return (symbol) => {
    const starring = !symbols.includes(symbol);
    startStarTransition(starring, () => {
      if (latest.current.includes(symbol) !== starring) toggle(symbol);
    });
  };
}

function flightKeyframes(dx: number, dy: number): Keyframe[] {
  return Array.from({ length: FLIGHT_STEPS + 1 }, (_, step) => {
    const t = step / FLIGHT_STEPS;
    const x = dx * t * t;
    const y = dy * (1 - (1 - t) * (1 - t));
    const scale = 1 + (FLIGHT_END_SCALE - 1) * t;
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale})`,
      opacity: t < 0.8 ? 1 : (1 - t) * 5,
    };
  });
}

function visibleTarget(): HTMLElement | undefined {
  const target = document.querySelector<HTMLElement>("[data-star-target]");
  if (target === null || target.closest('[aria-current="page"]') !== null) return undefined;
  const rect = target.getBoundingClientRect();
  const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return hit !== null && target.contains(hit) ? target : undefined;
}

export function flyStarToWatchlist(source: HTMLElement, symbol: string): void {
  const icon = source.querySelector("svg");
  const target = visibleTarget();
  if (icon === null || target === undefined || reducedMotion()) return;
  const from = icon.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const star = icon.cloneNode(true) as SVGElement;
  Object.assign(star.style, {
    position: "fixed",
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    fill: "currentColor",
    color: "var(--color-accent-fill)",
    pointerEvents: "none",
    zIndex: "60",
  });
  document.body.append(star);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const flight = star.animate(flightKeyframes(dx, dy), { duration: duration.flash, easing: ease });
  flights.get(symbol)?.cancel();
  flights.set(symbol, flight);
  publishFlights();
  flight.oncancel = () => {
    star.remove();
    land(symbol, flight);
  };
  flight.onfinish = () => {
    star.remove();
    land(symbol, flight);
    target.animate(
      [
        { transform: "scale(1)" },
        { transform: `scale(${TARGET_BUMP_SCALE})` },
        { transform: "scale(1)" },
      ],
      { duration: duration.slow, easing: ease },
    );
  };
}
