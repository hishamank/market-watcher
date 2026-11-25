const LEFT_TO_RIGHT_ISOLATE = "⁦";
const POP_DIRECTIONAL_ISOLATE = "⁩";

export function ltr(value: string): string {
  return `${LEFT_TO_RIGHT_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
}
