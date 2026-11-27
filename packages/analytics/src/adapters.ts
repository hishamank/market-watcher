import type { AnalyticsContext, AnalyticsEvent, AnalyticsPlatform } from "./events.ts";

export interface AnalyticsAdapter {
  track(event: AnalyticsEvent, context: AnalyticsContext): void;
}

export type AnalyticsLog = (label: string, payload: Readonly<Record<string, unknown>>) => void;

export interface ConsoleAnalyticsOptions {
  readonly platform: AnalyticsPlatform;
  readonly log: AnalyticsLog;
}

export function createNoopAnalytics(): AnalyticsAdapter {
  return { track() {} };
}

export function createConsoleAnalytics({
  platform,
  log,
}: ConsoleAnalyticsOptions): AnalyticsAdapter {
  return {
    track({ name, ...properties }, context) {
      log(`[analytics] ${name}`, { ...properties, platform, ...context });
    },
  };
}
