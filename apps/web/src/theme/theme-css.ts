import {
  chart,
  color,
  fontFamily,
  duration,
  easing,
  elevation,
  numeric,
  radius,
  space,
  type,
  type Theme,
  type TypeStyle,
} from "@mini/tokens";

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function declarations(entries: ReadonlyArray<readonly [string, string | number]>): string[] {
  return entries.map(([name, value]) => `  --${name}: ${value};`);
}

function themeColors(theme: Theme): Array<[string, string]> {
  return [
    ...Object.entries(color[theme]).map(([name, value]): [string, string] => [
      `color-${kebab(name)}`,
      value,
    ]),
    ...Object.entries(chart[theme]).map(([name, value]): [string, string] => [
      `color-chart-${kebab(name)}`,
      value,
    ]),
    ...Object.entries(elevation[theme]).map(([level, value]): [string, string] => [
      `shadow-${level}`,
      value,
    ]),
  ];
}

function textStyle(prefix: string, style: TypeStyle): Array<[string, string | number]> {
  return [
    [prefix, `${style.size}px`],
    [`${prefix}--line-height`, `${style.lineHeight}px`],
    [`${prefix}--font-weight`, style.weight],
    [`${prefix}--letter-spacing`, `${style.letterSpacingEm}em`],
  ];
}

function textStyles(): Array<[string, string | number]> {
  return [
    ...Object.entries(type).flatMap(([name, style]) => textStyle(`text-${kebab(name)}`, style)),
    ...Object.entries(numeric).flatMap(([name, style]) =>
      textStyle(`text-numeric-${kebab(name)}`, style),
    ),
  ];
}

function arabicTextStyles(): Array<[string, string | number]> {
  return Object.entries(type).flatMap(([name, style]): Array<[string, string | number]> => [
    [`text-${kebab(name)}--line-height`, `${style.arabicLineHeight}px`],
    [`text-${kebab(name)}--letter-spacing`, "0em"],
  ]);
}

function scales(): Array<[string, string]> {
  return [
    ...Object.entries(space).map(([step, value]): [string, string] => [
      `spacing-${step}`,
      `${value}px`,
    ]),
    ...Object.entries(radius).map(([name, value]): [string, string] => [
      `radius-${name}`,
      `${value}px`,
    ]),
    ...Object.entries(duration).map(([name, value]): [string, string] => [
      `duration-${name}`,
      `${value}ms`,
    ]),
    ...Object.entries(easing).map(([name, points]): [string, string] => [
      `ease-${name}`,
      `cubic-bezier(${points.join(", ")})`,
    ]),
  ];
}

const resets = ["color", "spacing", "radius", "shadow", "text", "ease"].map(
  (namespace) => `  --${namespace}-*: initial;`,
);

const darkSelectors = [
  "@media (prefers-color-scheme: dark) {",
  "  :root {",
  ...declarations(themeColors("dark")).map((line) => `  ${line}`),
  "  }",
  "}",
];

export function buildThemeCss(): string {
  return [
    "@theme {",
    ...resets,
    `  --font-sans: var(--font-alexandria), ${fontFamily.fallback.join(", ")};`,
    ...declarations(themeColors("light")),
    ...declarations(textStyles()),
    ...declarations(scales()),
    "}",
    "",
    ...darkSelectors,
    "",
    ":lang(ar) {",
    ...declarations(arabicTextStyles()),
    "}",
    "",
  ].join("\n");
}
