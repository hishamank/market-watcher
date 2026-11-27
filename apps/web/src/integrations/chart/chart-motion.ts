import { duration, easing } from "@mini/tokens";

const REVEAL_MS = 450;

const reveal: Keyframe[] = [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }];
const fadeIn: Keyframe[] = [{ opacity: 0.4 }, { opacity: 1 }];

export function animateDraw(element: HTMLElement | null, first: boolean): void {
  if (element === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  element.animate(first ? reveal : fadeIn, {
    duration: first ? REVEAL_MS : duration.base,
    easing: `cubic-bezier(${easing.standard.join(", ")})`,
  });
}
