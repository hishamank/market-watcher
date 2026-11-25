import { MAX_BAR_PAGES } from "./config.ts";
import { isFields, text } from "./fields.ts";
import type { AlpacaHttp, Params } from "./http.ts";

export async function fetchBarPages(
  http: AlpacaHttp,
  params: Params,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const bodies: unknown[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_BAR_PAGES; page += 1) {
    const body = await http.get(
      "data",
      "/v2/stocks/bars",
      { ...params, limit: "10000", page_token: pageToken },
      signal,
    );
    bodies.push(body);
    pageToken = isFields(body) ? text(body, "next_page_token") : undefined;
    if (pageToken === undefined || pageToken === "") {
      return bodies;
    }
  }
  throw new Error(`Alpaca bars still had more pages after ${MAX_BAR_PAGES}`);
}
