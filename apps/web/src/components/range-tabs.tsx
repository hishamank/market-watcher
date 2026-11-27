import { RANGES, type Range } from "@mini/contracts";
import { useT } from "@mini/core";
import { SegmentTrack, segmentStyle } from "./segment-track.tsx";

export interface RangeTabsProps {
  range: Range;
  onSelect: (range: Range) => void;
}

export function RangeTabs({ range, onSelect }: RangeTabsProps) {
  const t = useT();
  return (
    <SegmentTrack
      selected={RANGES.indexOf(range)}
      role="group"
      label={t("detail.rangeTabs")}
      className="grid grid-cols-3 gap-2 min-[360px]:flex md:w-[420px] md:max-w-full"
    >
      {(ready) =>
        RANGES.map((option) => {
          const selected = option === range;
          return (
            <button
              key={option}
              type="button"
              data-segment
              aria-pressed={selected}
              data-testid={`range-tab-${option}`}
              onClick={() => onSelect(option)}
              className={`grid min-h-[44px] flex-1 place-items-center rounded-sm px-8 text-label whitespace-nowrap ${segmentStyle(selected, ready)}`}
            >
              {t(`detail.tab.${option}`)}
            </button>
          );
        })
      }
    </SegmentTrack>
  );
}
