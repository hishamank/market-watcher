import { isIPv6 } from "node:net";

const GROUPS = 8;
const PREFIX_GROUPS = 4;
const MAPPED_MARKER = 0xffff;

function groupsOf(address: string): number[] | undefined {
  try {
    const host = new URL(`http://[${address}]`).hostname.slice(1, -1);
    const [head = "", tail] = host.split("::");
    const left = head === "" ? [] : head.split(":");
    const right = tail === undefined || tail === "" ? [] : tail.split(":");
    const zeros = tail === undefined ? [] : Array<string>(GROUPS - left.length - right.length);
    const groups = [...left, ...zeros.fill("0"), ...right].map((group) =>
      Number.parseInt(group, 16),
    );
    return groups.length === GROUPS && groups.every(Number.isInteger) ? groups : undefined;
  } catch {
    return undefined;
  }
}

function mappedIPv4(groups: readonly number[]): string | undefined {
  const [high = 0, low = 0] = groups.slice(6);
  const mapped = groups.slice(0, 5).every((group) => group === 0) && groups[5] === MAPPED_MARKER;
  return mapped ? `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}` : undefined;
}

export function addressKey(ip: string): string {
  const address = ip.split("%")[0] ?? ip;
  const groups = isIPv6(address) ? groupsOf(address) : undefined;
  if (groups === undefined) return address;
  const prefix = groups.slice(0, PREFIX_GROUPS).map((group) => group.toString(16));
  return mappedIPv4(groups) ?? `${prefix.join(":")}::/64`;
}
