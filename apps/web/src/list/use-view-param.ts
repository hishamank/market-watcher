import { useTrack } from "@mini/analytics";
import { useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";
import type { ListView } from "../components/view-toggle.tsx";

export interface ViewParam {
  readonly view: ListView;
  readonly selectView: (view: ListView, event: MouseEvent) => void;
}

export function viewHref(view: ListView): string {
  return view === "watchlist" ? "/?view=watchlist" : "/";
}

function isPlainClick(event: MouseEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function useViewParam(): ViewParam {
  const view = useSearchParams().get("view") === "watchlist" ? "watchlist" : "all";
  const track = useTrack();
  return {
    view,
    selectView: (next, event) => {
      if (!isPlainClick(event)) return;
      event.preventDefault();
      if (next === view) return;
      track({ name: "list_view_changed", view: next });
      window.history.pushState(null, "", viewHref(next));
    },
  };
}
