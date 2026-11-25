import type { HistoryRequest, HistorySeries, HistorySource } from "../feeds/types.ts";

export function attemptSource(
  source: HistorySource,
  request: HistoryRequest,
  timeoutMs: number,
  controllers: Set<AbortController>,
): Promise<HistorySeries> {
  const controller = new AbortController();
  controllers.add(controller);
  const timer = setTimeout(() => {
    controller.abort(new Error(`History source timed out after ${timeoutMs} ms`));
  }, timeoutMs);
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => reject(controller.signal.reason), {
      once: true,
    });
  });
  const work = new Promise<HistorySeries>((resolve) => {
    resolve(source.history({ ...request, signal: controller.signal }));
  });
  return Promise.race([work, aborted]).finally(() => {
    clearTimeout(timer);
    controllers.delete(controller);
  });
}
