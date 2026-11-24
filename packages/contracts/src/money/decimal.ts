export const DECIMAL_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;
export const UNSIGNED_DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;

export type ExactDecimal = { readonly digits: bigint; readonly scale: number };

export function parseExact(decimal: string): ExactDecimal {
  if (!DECIMAL_PATTERN.test(decimal)) {
    throw new RangeError(`Not a decimal string: "${decimal}"`);
  }
  const negative = decimal.startsWith("-");
  const unsigned = negative ? decimal.slice(1) : decimal;
  const point = unsigned.indexOf(".");
  const whole = point === -1 ? unsigned : unsigned.slice(0, point);
  const fraction = point === -1 ? "" : unsigned.slice(point + 1);
  const magnitude = BigInt(whole + fraction);
  return { digits: negative ? -magnitude : magnitude, scale: fraction.length };
}

export function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) {
    throw new RangeError("Division by zero");
  }
  const negative = numerator < 0n !== denominator < 0n;
  const top = numerator < 0n ? -numerator : numerator;
  const bottom = denominator < 0n ? -denominator : denominator;
  const quotient = (top * 2n + bottom) / (bottom * 2n);
  return negative ? -quotient : quotient;
}

function powerOfTen(exponent: number): bigint {
  return BigInt(`1${"0".repeat(exponent)}`);
}

export function rescale(value: ExactDecimal, scale: number): bigint {
  if (value.scale <= scale) {
    return value.digits * powerOfTen(scale - value.scale);
  }
  return divideRounded(value.digits, powerOfTen(value.scale - scale));
}

export function toPlain(digits: bigint, scale: number): string {
  const negative = digits < 0n;
  const padded = (negative ? -digits : digits).toString().padStart(scale + 1, "0");
  const whole = padded.slice(0, padded.length - scale);
  const body = scale === 0 ? whole : `${whole}.${padded.slice(padded.length - scale)}`;
  return negative ? `-${body}` : body;
}
