import { arSeoStrings } from "./seo.ts";
import { arEarningsStrings } from "./earnings.ts";
import { arNewsStrings } from "./news.ts";
import { arStatisticsStrings } from "./statistics.ts";
import { arProfileStrings } from "./profile.ts";
import { arChaosStrings } from "./chaos.ts";
import { arDetailStrings } from "./detail.ts";
import { arListStrings } from "./list.ts";
import { arSearchStrings } from "./search.ts";
import { arShellStrings } from "./shell.ts";
import { arWatchlistStrings } from "./watchlist.ts";

export const ar = {
  ...arSeoStrings,
  ...arEarningsStrings,
  ...arNewsStrings,
  ...arStatisticsStrings,
  ...arProfileStrings,
  ...arShellStrings,
  ...arListStrings,
  ...arWatchlistStrings,
  ...arDetailStrings,
  ...arSearchStrings,
  ...arChaosStrings,
};
