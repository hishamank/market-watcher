import { ViewTransition, type ReactNode } from "react";

export interface MorphProps {
  name: string;
  enabled?: boolean | undefined;
  children: ReactNode;
}

export function Morph({ name, enabled = true, children }: MorphProps) {
  if (!enabled) return children;
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
