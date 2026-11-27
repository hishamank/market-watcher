import { useT } from "@mini/core";
import type { TableColumn } from "../columns/table-columns-store.ts";
import { iconPressMotion } from "./button.tsx";
import { ColumnsIcon } from "./icons.tsx";

export interface ColumnOption {
  readonly id: TableColumn;
  readonly label: string;
  readonly checked: boolean;
  readonly locked: boolean;
}

export interface ColumnMenuProps {
  options: readonly ColumnOption[];
  canReset: boolean;
  onToggle: (column: TableColumn) => void;
  onReset: () => void;
}

const MENU_ID = "table-columns";

export function ColumnMenu({ options, canReset, onToggle, onReset }: ColumnMenuProps) {
  const t = useT();
  return (
    <div className="grid place-items-center">
      <button
        type="button"
        popoverTarget={MENU_ID}
        data-testid="columns-button"
        aria-label={t("list.columns.button")}
        title={t("list.columns.button")}
        className={`grid size-[36px] place-items-center rounded-md text-text-secondary hover:text-text ${iconPressMotion} [anchor-name:--table-columns]`}
      >
        <ColumnsIcon />
      </button>
      <div
        id={MENU_ID}
        popover="auto"
        data-testid="columns-menu"
        className="inset-auto m-0 mt-8 max-h-[calc(100%-16px)] w-[240px] overflow-y-auto rounded-lg border border-border bg-raised p-8 text-text shadow-2 [position-anchor:--table-columns] [position-area:block-end_span-inline-start] motion-safe:animate-dropdown-in motion-reduce:animate-fade-in"
      >
        <fieldset>
          <legend className="px-8 pt-4 pb-8 text-caption font-medium text-text-secondary">
            {t("list.columns.title")}
          </legend>
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-[40px] items-center gap-12 rounded-sm px-8 text-label ${option.locked ? "text-text-muted" : "cursor-pointer hover:bg-hover"}`}
            >
              <input
                type="checkbox"
                data-testid={`column-toggle-${option.id}`}
                checked={option.checked}
                disabled={option.locked}
                onChange={() => onToggle(option.id)}
                className="size-16 accent-current"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        {canReset ? (
          <button
            type="button"
            data-testid="columns-reset"
            onClick={onReset}
            className="mt-8 flex min-h-[40px] w-full items-center rounded-sm border-t border-border px-8 text-label font-semibold hover:bg-hover"
          >
            {t("list.columns.reset")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
