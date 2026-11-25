import { type RefObject, useEffect } from "react";

export function useScrollActiveOption(
  containerRef: RefObject<HTMLElement | null>,
  activeOptionId: string | undefined,
): void {
  useEffect(() => {
    if (activeOptionId === undefined) return;
    const container = containerRef.current;
    if (container === null) return;
    const option = container.ownerDocument.getElementById(activeOptionId);
    if (option !== null && container.contains(option)) {
      option.scrollIntoView({ block: "nearest" });
    }
  }, [containerRef, activeOptionId]);
}
