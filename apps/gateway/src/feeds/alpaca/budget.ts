import { BACKOFF_BASE_MS, BACKOFF_MAX_MS, BUDGET_WINDOW_MS, REQUEST_BUDGET } from "./config.ts";
import { type AlpacaHttp, AlpacaHttpError } from "./http.ts";

export class AlpacaBudgetError extends Error {}

export function backoffMs(err: unknown, failures: number): number {
  if (err instanceof AlpacaHttpError && err.status === 429) {
    return BACKOFF_MAX_MS;
  }
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (failures - 1));
}

export function withRequestBudget(http: AlpacaHttp, now: () => number): AlpacaHttp {
  const started: number[] = [];
  let pausedUntil = 0;
  let failures = 0;

  const admit = (): void => {
    const time = now();
    while (started[0] !== undefined && started[0] <= time - BUDGET_WINDOW_MS) {
      started.shift();
    }
    if (time < pausedUntil) {
      throw new AlpacaBudgetError(`Alpaca data requests pause for ${pausedUntil - time} ms`);
    }
    if (started.length >= REQUEST_BUDGET) {
      throw new AlpacaBudgetError(`Alpaca data requests reached ${REQUEST_BUDGET} a minute`);
    }
    started.push(time);
  };

  return {
    async get(api, path, params, signal) {
      if (api !== "data") {
        return http.get(api, path, params, signal);
      }
      admit();
      try {
        const body = await http.get(api, path, params, signal);
        failures = 0;
        return body;
      } catch (err: unknown) {
        if (signal?.aborted !== true) {
          failures += 1;
          pausedUntil = Math.max(pausedUntil, now() + backoffMs(err, failures));
        }
        throw err;
      }
    },
  };
}
