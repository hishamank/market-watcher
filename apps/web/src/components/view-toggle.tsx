import { useT } from "@mini/core";
import Link from "next/link";

export type ListView = "all" | "watchlist";

export interface ViewToggleProps {
  view: ListView;
}

const options: ReadonlyArray<{ view: ListView; href: string }> = [
  { view: "all", href: "/" },
  { view: "watchlist", href: "/?view=watchlist" },
];

export function ViewToggle({ view }: ViewToggleProps) {
  const t = useT();
  return (
    <nav
      aria-label={t("list.view.label")}
      className="flex gap-2 rounded-lg bg-fill p-4 md:w-[320px]"
    >
      {options.map((option) => {
        const selected = option.view === view;
        const style = selected
          ? "bg-raised font-semibold text-text shadow-1"
          : "font-medium text-text-secondary";
        return (
          <Link
            key={option.view}
            href={option.href}
            data-testid={`view-toggle-${option.view}`}
            aria-current={selected ? "page" : undefined}
            className={`grid min-h-[44px] flex-1 place-items-center rounded-sm text-label ${style}`}
          >
            {t(option.view === "all" ? "list.view.all" : "list.view.watchlist")}
          </Link>
        );
      })}
    </nav>
  );
}
