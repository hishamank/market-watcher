import { arChaosStrings } from "./chaos.ts";
import { arDetailStrings } from "./detail.ts";
import { arListStrings } from "./list.ts";
import { arSearchStrings } from "./search.ts";
import { arShellStrings } from "./shell.ts";
import { arWatchlistStrings } from "./watchlist.ts";

export const ar = {
  ...arShellStrings,
  ...arListStrings,
  ...arWatchlistStrings,
  ...arDetailStrings,
  ...arSearchStrings,
  ...arChaosStrings,
};
