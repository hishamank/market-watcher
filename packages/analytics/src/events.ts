import type { FeedMode, Range } from "@mini/contracts";

export type AnalyticsPlatform = "web" | "ios" | "android";
export type ConnectionState = "connecting" | "connected" | "stale" | "offline";
export type ListViewName = "all" | "watchlist";
export type ThemeChoice = "system" | "light" | "dark";
export type ColumnAction = "show" | "hide" | "reset";

export type AnalyticsEvent =
  | { readonly name: "session_started" }
  | { readonly name: "stock_opened"; readonly symbol: string }
  | { readonly name: "range_changed"; readonly symbol: string; readonly range: Range }
  | {
      readonly name: "watchlist_toggled";
      readonly symbol: string;
      readonly starred: boolean;
      readonly watchlistSize: number;
    }
  | {
      readonly name: "search_performed";
      readonly queryLength: number;
      readonly resultCount: number;
    }
  | {
      readonly name: "search_result_selected";
      readonly queryLength: number;
      readonly resultCount: number;
      readonly position: number;
    }
  | { readonly name: "list_view_changed"; readonly view: ListViewName }
  | { readonly name: "language_changed"; readonly from: string; readonly to: string }
  | { readonly name: "theme_changed"; readonly to: ThemeChoice }
  | { readonly name: "columns_changed"; readonly action: ColumnAction; readonly column?: string }
  | { readonly name: "news_opened"; readonly symbol: string; readonly position: number }
  | { readonly name: "request_failed"; readonly resource: string; readonly code: string }
  | {
      readonly name: "connection_status_changed";
      readonly from: ConnectionState;
      readonly to: ConnectionState;
      readonly msInPrevious: number;
    };

export type AnalyticsEventName = AnalyticsEvent["name"];

export interface AnalyticsContext {
  readonly locale: string;
  readonly feedMode: FeedMode | null;
}

export type Track = (event: AnalyticsEvent) => void;
