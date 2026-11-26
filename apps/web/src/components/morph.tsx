import { ViewTransition, type ReactNode } from "react";

export const OPEN_STOCK = "open-stock";

const shareOnOpen = { [OPEN_STOCK]: "morph", default: "none" };

export interface MorphProps {
  name: string;
  enabled?: boolean | undefined;
  children: ReactNode;
}

export function Morph({ name, enabled = true, children }: MorphProps) {
  if (!enabled) return children;
  return (
    <ViewTransition name={name} share={shareOnOpen} default="none">
      {children}
    </ViewTransition>
  );
}
