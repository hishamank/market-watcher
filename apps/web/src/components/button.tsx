import type { ReactNode } from "react";

export type ButtonVariant = "default" | "solid";

const variants: Record<ButtonVariant, string> = {
  default: "border-border-strong bg-transparent hover:border-text-secondary hover:bg-hover",
  solid: "border-text bg-text text-bg hover:bg-text/85",
};

export const pressMotion =
  "transition-[translate,scale,background-color,border-color,color] duration-(--duration-fast) ease-standard motion-safe:pointer-fine:hover:-translate-y-px motion-safe:active:translate-y-px motion-safe:active:scale-[.985]";

export const iconPressMotion =
  "transition-[scale,background-color,color] duration-(--duration-fast) ease-standard hover:bg-hover motion-safe:active:scale-90";

export function buttonClassName(variant: ButtonVariant = "default", compact = false): string {
  const padding = compact ? "px-12" : "px-16";
  return `inline-flex min-h-[44px] shrink-0 items-center justify-center gap-8 rounded-md border text-label font-semibold whitespace-nowrap ${padding} ${variants[variant]} ${pressMotion}`;
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
