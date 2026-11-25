import { RANGES, type Range } from "@mini/contracts";
import { useT } from "@mini/core";

export interface RangeTabsProps {
  range: Range;
  onSelect: (range: Range) => void;
}

export function RangeTabs({ range, onSelect }: RangeTabsProps) {
  const t = useT();
  return (
    <div
      role="tablist"
      aria-label={t("detail.rangeTabs")}
      className="flex gap-2 rounded-lg bg-fill p-4 md:w-[420px] md:max-w-full"
    >
      {RANGES.map((option) => {
        const selected = option === range;
        const style = selected
          ? "bg-raised font-semibold text-text shadow-1"
          : "font-medium text-text-secondary";
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`range-tab-${option}`}
            onClick={() => onSelect(option)}
            className={`grid min-h-[44px] flex-1 place-items-center rounded-sm px-8 text-label whitespace-nowrap ${style}`}
          >
            {t(`detail.tab.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
