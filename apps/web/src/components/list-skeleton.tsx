import { Skeleton } from "./skeleton.tsx";

const SKELETON_ROWS = 8;

export interface ListSkeletonProps {
  testId: string;
  rows?: number;
}

export function ListSkeleton({ testId, rows = SKELETON_ROWS }: ListSkeletonProps) {
  return (
    <ul data-testid={testId} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="flex min-h-[68px] items-center gap-12 border-b border-border ps-16 pe-6 last:border-b-0"
        >
          <span className="flex flex-1 flex-col gap-6">
            <Skeleton className="h-[14px] w-[140px]" />
            <Skeleton className="h-[10px] w-[48px]" />
          </span>
          <span className="flex flex-col items-end gap-6">
            <Skeleton className="h-[14px] w-[64px]" />
            <Skeleton className="h-[20px] w-[104px]" pill />
          </span>
          <span className="size-[44px]" />
        </li>
      ))}
    </ul>
  );
}
