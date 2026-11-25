export interface SkeletonProps {
  className: string;
  pill?: boolean;
}

export function Skeleton({ className, pill = false }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-fill motion-safe:animate-skeleton ${pill ? "rounded-pill" : "rounded-xs"} ${className}`}
    />
  );
}
