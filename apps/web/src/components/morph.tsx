import { ViewTransition, type ReactNode } from "react";
import { useIsStockOpening } from "../integrations/opening-stock.ts";

export interface MorphProps {
  name: string;
  symbol: string;
  enabled?: boolean | undefined;
  children: ReactNode;
}

export function Morph({ name, symbol, enabled = true, children }: MorphProps) {
  const opening = useIsStockOpening(symbol);
  if (!enabled) return children;
  return (
    <ViewTransition name={name} share={opening ? "morph" : "none"} default="none">
      {children}
    </ViewTransition>
  );
}
