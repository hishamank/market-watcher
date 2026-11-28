"use client";

import { useTrack } from "@mini/analytics";
import { useT } from "@mini/core";
import { useTableColumns } from "../columns/use-table-columns.ts";
import { ColumnMenu } from "../components/column-menu.tsx";
import { useMediaQuery } from "../integrations/use-media-query.ts";
import { defaultColumns } from "./table-layout.ts";

export function ConnectedColumnMenu() {
  const t = useT();
  const track = useTrack();
  const columns = useTableColumns();
  const table = useMediaQuery("(width >= 80rem)");
  const wide = useMediaQuery("(width >= 90rem)");
  const shown = columns.chosen ?? defaultColumns(table, wide);
  return (
    <ColumnMenu
      options={columns.all.map((id) => ({
        id,
        label: t(`list.column.${id}`),
        checked: shown.includes(id),
        locked: columns.isLocked(id),
      }))}
      canReset={columns.chosen !== undefined}
      onToggle={(column) => {
        const action = shown.includes(column) ? "hide" : "show";
        track({ name: "columns_changed", action, column });
        columns.toggle(column, shown);
      }}
      onReset={() => {
        track({ name: "columns_changed", action: "reset" });
        columns.reset();
      }}
    />
  );
}
