import type { MarketStatus, Session } from "@mini/contracts";
import type { MarketCalendar } from "../types.ts";
import { CALENDAR_FUTURE_DAYS, CALENDAR_PAST_DAYS, STATUS_CHECK_INTERVAL_MS } from "./config.ts";
import { epochMs, isFields, list, text } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";
import { newYorkDate, newYorkTime } from "./new-york.ts";
import type { TradingDay } from "./quotes.ts";
import type { MarketMoment } from "./snapshots.ts";

const DAY_MS = 86_400_000;
export const REFRESH_RETRY_MS = 60_000;

interface Clock {
  readonly isOpen: boolean;
  readonly nextOpen: number;
  readonly nextClose: number;
}

interface Schedule {
  readonly clock: Clock;
  readonly days: readonly TradingDay[];
}

export interface AlpacaCalendar extends MarketCalendar {
  moment(now: number): MarketMoment;
  days(): readonly TradingDay[];
  close(): void;
}

export function statusAt(clock: Clock, now: number): MarketStatus {
  if (clock.isOpen) {
    return now < clock.nextClose ? "open" : "closed";
  }
  return now >= clock.nextOpen && now < clock.nextClose ? "open" : "closed";
}

function parseClock(body: unknown): Clock {
  const fields = isFields(body) ? body : {};
  const nextOpen = epochMs(text(fields, "next_open"));
  const nextClose = epochMs(text(fields, "next_close"));
  if (typeof fields["is_open"] !== "boolean" || nextOpen === undefined || nextClose === undefined) {
    throw new Error("Alpaca clock answered in an unexpected shape");
  }
  return { isOpen: fields["is_open"], nextOpen, nextClose };
}

function parseDays(body: unknown): TradingDay[] {
  return list(body).flatMap((item) => {
    const date = isFields(item) ? text(item, "date") : undefined;
    const open = date && isFields(item) ? newYorkTime(date, text(item, "open") ?? "") : undefined;
    const close = date && isFields(item) ? newYorkTime(date, text(item, "close") ?? "") : undefined;
    return date && open !== undefined && close !== undefined && open < close
      ? [{ date, open, close }]
      : [];
  });
}

async function loadSchedule(http: AlpacaHttp, now: number): Promise<Schedule> {
  const [clock, days] = await Promise.all([
    http.get("trading", "/v2/clock").then(parseClock),
    http
      .get("trading", "/v2/calendar", {
        start: newYorkDate(now - CALENDAR_PAST_DAYS * DAY_MS),
        end: newYorkDate(now + CALENDAR_FUTURE_DAYS * DAY_MS),
      })
      .then(parseDays),
  ]);
  return { clock, days };
}

export function dayAt(days: readonly TradingDay[], now: number): TradingDay {
  const started = days.filter((day) => day.open <= now);
  const latest = started.at(-1) ?? days[0];
  if (latest !== undefined) {
    return latest;
  }
  const open = now - (now % DAY_MS);
  return { date: newYorkDate(now), open, close: open + DAY_MS };
}

export async function loadAlpacaCalendar(
  http: AlpacaHttp,
  now: () => number,
  warn: (detail: object, message: string) => void,
): Promise<AlpacaCalendar> {
  let schedule = await loadSchedule(http, now());
  let last = statusAt(schedule.clock, now());
  let lastRefresh = now();
  let failed = false;
  const listeners = new Set<(status: MarketStatus) => void>();

  const refresh = (): void => {
    lastRefresh = now();
    loadSchedule(http, now()).then(
      (next) => {
        schedule = next;
        failed = false;
      },
      (err: unknown) => {
        failed = true;
        warn({ err }, "Alpaca clock or calendar refresh failed, will retry");
      },
    );
  };

  const check = (): void => {
    const status = statusAt(schedule.clock, now());
    const outdated = failed || now() >= schedule.clock.nextClose;
    if (status !== last) {
      last = status;
      listeners.forEach((listener) => listener(status));
      refresh();
    } else if (outdated && now() - lastRefresh >= REFRESH_RETRY_MS) {
      refresh();
    }
  };
  const timer = setInterval(check, STATUS_CHECK_INTERVAL_MS);

  return {
    status: (time) => statusAt(schedule.clock, time),
    session: (time): Session => {
      const { open, close } = dayAt(schedule.days, time);
      return { open, close };
    },
    moment: (time) => ({
      day: dayAt(schedule.days, time),
      open: statusAt(schedule.clock, time) === "open",
    }),
    days: () => schedule.days,
    onStatusChange(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    close: () => clearInterval(timer),
  };
}
