import { createI18n, parseLocale } from "@mini/core";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE } from "../platform/locale-cookie.ts";

export const readMetadataLocale = cache(async () => {
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, t: createI18n(locale).translator(locale) };
});

export async function pageMetadata(
  title: string,
  description: string,
  path: string,
): Promise<Metadata> {
  const { locale, t } = await readMetadataLocale();
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: t("header.title"),
      title,
      description,
      url: path,
      locale: locale === "ar" ? "ar" : "en_US",
    },
    twitter: { card: "summary", title, description },
  };
}
