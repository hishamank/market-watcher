import { Skeleton } from "./skeleton.tsx";

export function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-8 px-16 pt-16 md:p-0">
      <Skeleton className="h-[22px] w-[56px]" pill />
      <Skeleton className="h-[16px] w-[140px]" />
      <Skeleton className="mt-8 h-[44px] w-[180px]" />
      <Skeleton className="h-[24px] w-[160px]" pill />
      <div className="pt-[36px]">
        <Skeleton className="h-[200px] rounded-lg md:h-[344px]" />
      </div>
    </div>
  );
}
