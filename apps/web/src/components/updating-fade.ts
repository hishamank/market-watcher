export function updatingFade(updating: boolean): string {
  return `transition-opacity duration-(--duration-base) ${updating ? "opacity-40 delay-150" : ""}`;
}
