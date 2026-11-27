export function updatingFade(updating: boolean): string {
  return `transition-opacity duration-(--duration-base) motion-reduce:duration-0 ${updating ? "opacity-40 delay-150" : ""}`;
}
