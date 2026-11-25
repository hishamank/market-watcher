import type { Catalogue } from "../feeds/types.ts";

export interface SubscribePlan {
  accepted: string[];
  added: string[];
  unknown: string[];
  overLimit: string[];
}

export function planSubscribe(
  held: ReadonlySet<string>,
  requested: readonly string[],
  catalogue: Catalogue,
  maxSubscriptions: number,
): SubscribePlan {
  const plan: SubscribePlan = { accepted: [], added: [], unknown: [], overLimit: [] };
  for (const symbol of new Set(requested)) {
    if (held.has(symbol)) {
      plan.accepted.push(symbol);
    } else if (catalogue.get(symbol) === undefined) {
      plan.unknown.push(symbol);
    } else if (held.size + plan.added.length >= maxSubscriptions) {
      plan.overLimit.push(symbol);
    } else {
      plan.accepted.push(symbol);
      plan.added.push(symbol);
    }
  }
  return plan;
}
