import { PrefetchBoundary } from "../query/prefetch-boundary.tsx";

export default function HomePage() {
  return (
    <PrefetchBoundary>
      <main className="flex flex-1 flex-col px-16 md:px-24" />
    </PrefetchBoundary>
  );
}
