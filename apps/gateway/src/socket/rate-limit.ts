export type RateVerdict = "allowed" | "limited" | "dropped";

export function createRateLimit(
  limit: number,
  windowMs: number,
  now: () => number,
): () => RateVerdict {
  const timestamps: number[] = [];
  let notifiedAt = Number.NEGATIVE_INFINITY;
  return () => {
    const time = now();
    while (timestamps[0] !== undefined && time - timestamps[0] >= windowMs) {
      timestamps.shift();
    }
    if (timestamps.length < limit) {
      timestamps.push(time);
      notifiedAt = Number.NEGATIVE_INFINITY;
      return "allowed";
    }
    if (time - notifiedAt >= windowMs) {
      notifiedAt = time;
      return "limited";
    }
    return "dropped";
  };
}
