import { en, type MessageKey } from "./en.ts";

export type Translate = (key: MessageKey, values?: Readonly<Record<string, string>>) => string;

const translate: Translate = (key, values) =>
  en[key].replace(/\{\{(\w+)\}\}/g, (_match, name: string) => values?.[name] ?? "");

export function useT(): Translate {
  return translate;
}
