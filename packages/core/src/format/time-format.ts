import { parseLocale } from "../i18n/locale.ts";
import { DEFAULT_LOCALE, MARKET_TIME_ZONE, MARKET_TIME_ZONE_LABEL } from "./constants.ts";

export interface MarketTimeOptions {
  readonly locale?: string | undefined;
  readonly label?: boolean | undefined;
}

export interface MarketDateOptions {
  readonly locale?: string | undefined;
  readonly includeYear?: boolean | undefined;
}

const RIGHT_TO_LEFT_ISOLATE = "\u2067";
const POP_DIRECTIONAL_ISOLATE = "\u2069";

function isolateDate(formatted: string, locale: string): string {
  return parseLocale(locale) === "ar"
    ? `${RIGHT_TO_LEFT_ISOLATE}${formatted}${POP_DIRECTIONAL_ISOLATE}`
    : formatted;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormat(
  cacheKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const existing = formatterCache.get(cacheKey);
  if (existing !== undefined) {
    return existing;
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: MARKET_TIME_ZONE,
    numberingSystem: "latn",
    calendar: "gregory",
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function formatMarketTime(epochMs: number, options: MarketTimeOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const formatter = getDateTimeFormat(`time:${locale}`, locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const formatted = formatter.format(new Date(epochMs));
  return options.label === false ? formatted : `${formatted} ${MARKET_TIME_ZONE_LABEL}`;
}

export function formatMarketDate(epochMs: number, options: MarketDateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const includeYear = options.includeYear === true;
  const formatter = getDateTimeFormat(
    `date:${locale}:${includeYear ? "y" : "n"}`,
    locale,
    includeYear
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" },
  );
  return isolateDate(formatter.format(new Date(epochMs)), locale);
}

export function formatMarketDateTime(epochMs: number, options: MarketTimeOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const formatter = getDateTimeFormat(`datetime:${locale}`, locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const formatted = formatter.format(new Date(epochMs));
  return isolateDate(
    options.label === false ? formatted : `${formatted} ${MARKET_TIME_ZONE_LABEL}`,
    locale,
  );
}
