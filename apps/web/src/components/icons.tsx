export interface IconProps {
  className?: string | undefined;
}

const strokeIcon =
  "shrink-0 stroke-current stroke-[1.7] [stroke-linecap:round] [stroke-linejoin:round]";

interface StrokeIconProps extends IconProps {
  path: string;
  size?: string;
  fill?: string;
}

function StrokeIcon(props: StrokeIconProps) {
  const { path, className = "", size = "size-[20px]", fill = "fill-none" } = props;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`${strokeIcon} ${size} ${fill} ${className}`}
    >
      <path d={path} />
    </svg>
  );
}

export function StarIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <StrokeIcon
      className={className}
      fill={filled ? "fill-current" : "fill-none"}
      path="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z"
    />
  );
}

export function ReconnectIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      path="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15M4.5 19.5V15H9"
    />
  );
}

export function OfflineIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      path="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5.5 13a9 9 0 0 1 4-2.3M18.5 13a9 9 0 0 0-3.2-2M2.5 9.5a13.5 13.5 0 0 1 4.2-2.7M21.5 9.5A13.5 13.5 0 0 0 11 6.1M12 20h.01"
    />
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      size="size-[16px]"
      path="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
    />
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      path="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V13M12 16.5h.01"
    />
  );
}

export function BoltIcon({ className }: IconProps) {
  return <StrokeIcon className={className} path="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2z" />;
}

export function ClockIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      size="size-[14px]"
      path="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2"
    />
  );
}

const directionPaths = {
  up: "M5 1 9.5 9h-9z",
  down: "M5 9 .5 1h9z",
  flat: "M1 4h8v2H1z",
} as const;

export function DirectionIcon({ direction }: { direction: keyof typeof directionPaths }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" className="size-[9px] shrink-0 fill-current">
      <path d={directionPaths[direction]} />
    </svg>
  );
}

export function ChevronStartIcon({ className = "" }: IconProps) {
  return <StrokeIcon className={`rtl:-scale-x-100 ${className}`} path="M15 5l-7 7 7 7" />;
}

export function SearchIcon({
  className,
  size = "size-[24px]",
}: IconProps & { size?: string | undefined }) {
  return (
    <StrokeIcon
      className={className}
      size={size}
      path="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4"
    />
  );
}

export function CloseIcon({ className }: IconProps) {
  return <StrokeIcon className={className} path="M6 6l12 12M18 6l-12 12" />;
}

export function ColumnsIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      path="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5zM9.5 4.5v15M14.5 4.5v15"
    />
  );
}

export function SpinnerIcon({ className }: IconProps) {
  return <StrokeIcon className={className} path="M12 3a9 9 0 1 0 9 9" />;
}

export function BrandMark({ className = "" }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-[28px] shrink-0 place-items-center rounded-sm bg-text text-bg ${className}`}
    >
      <svg viewBox="0 0 24 24" className={`${strokeIcon} size-[18px] fill-none stroke-[2.4]`}>
        <path d="M4 16.5l4.5-4.5 3.5 3 7.5-8M15 7h4.5v4.5" />
      </svg>
    </span>
  );
}
