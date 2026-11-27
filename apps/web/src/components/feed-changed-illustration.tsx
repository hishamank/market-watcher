const line = "fill-none stroke-2 [stroke-linecap:round] [stroke-linejoin:round]";
const gridRows = [34, 64, 94];

function EndedSource() {
  return (
    <g className="stroke-border-strong">
      <path className={line} d="M16 80l16-12 16 6 18-20 16 6 16-18" />
      <circle className="fill-border-strong stroke-none" cx="98" cy="42" r="3.5" />
    </g>
  );
}

function StartedSource() {
  return (
    <g className="stroke-accent">
      <path className={line} d="M140 94l16-12 16 8 18-18 16 6 16-16" />
      <circle className="fill-surface stroke-2" cx="140" cy="94" r="3.5" />
      <circle
        className="origin-center fill-accent stroke-none opacity-0 [transform-box:fill-box] motion-safe:animate-halo"
        cx="222"
        cy="62"
        r="4"
      />
      <circle className="fill-accent stroke-none" cx="222" cy="62" r="4" />
    </g>
  );
}

function SwapBadge() {
  return (
    <g>
      <circle className="fill-surface stroke-border-strong" cx="120" cy="64" r="17" />
      <path
        className="fill-none stroke-text stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]"
        d="M113 60h14l-3.5-3.5M127 68h-14l3.5 3.5"
      />
    </g>
  );
}

export function FeedChangedIllustration() {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 128" className="h-auto w-full max-w-[240px]">
      <rect
        className="fill-surface stroke-border"
        x="0.5"
        y="0.5"
        width="239"
        height="127"
        rx="14"
      />
      {gridRows.map((y) => (
        <path key={y} className="stroke-chart-grid" d={`M14 ${y}h212`} />
      ))}
      <path className="stroke-border-strong [stroke-dasharray:3_5]" d="M120 12v104" />
      <EndedSource />
      <StartedSource />
      <SwapBadge />
    </svg>
  );
}
