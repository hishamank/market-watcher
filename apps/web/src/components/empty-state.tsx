import type { ReactNode } from "react";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  help: string;
  action: ReactNode;
  testId: string;
  starMotion?: boolean;
}

export function EmptyState(props: EmptyStateProps) {
  const { icon, title, help, action, testId, starMotion } = props;
  return (
    <section
      data-testid={testId}
      data-star-hero={starMotion ? "" : undefined}
      className="flex flex-col items-center gap-6 px-20 py-24 text-center"
    >
      <span
        data-star-hero-icon={starMotion ? "" : undefined}
        className="mb-6 grid size-[56px] place-items-center rounded-full bg-fill text-text-secondary"
      >
        {icon}
      </span>
      <h2 className="text-heading-md">{title}</h2>
      <p className="max-w-[280px] text-label font-normal text-text-secondary">{help}</p>
      <div className="mt-10">{action}</div>
    </section>
  );
}
