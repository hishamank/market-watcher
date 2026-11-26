import { ClockIcon } from "./icons.tsx";

export function QuoteAsOf({ label, help }: { label: string; help: string }) {
  return (
    <div data-testid="detail-price-as-of" className="mt-6 text-caption">
      <span className="inline-flex items-center gap-6 rounded-pill bg-stale-tint px-10 py-[3px] text-text">
        <ClockIcon className="text-stale" />
        {label}
      </span>
      <p className="mt-2 text-text-secondary">{help}</p>
    </div>
  );
}
