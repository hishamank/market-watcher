import type { ReactNode } from "react";

export type ButtonVariant = "default" | "solid";

const variants: Record<ButtonVariant, string> = {
  default: "border-border-strong bg-transparent",
  solid: "border-text bg-text text-bg",
};

export function buttonClassName(variant: ButtonVariant = "default", compact = false): string {
  const padding = compact ? "px-12" : "px-16";
  return `inline-flex min-h-[44px] shrink-0 items-center justify-center gap-8 rounded-md border text-label font-semibold whitespace-nowrap ${padding} ${variants[variant]}`;
}

export interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  testId?: string;
}

export function Button({ children, onClick, variant, compact, testId }: ButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={buttonClassName(variant, compact)}
    >
      {children}
    </button>
  );
}
