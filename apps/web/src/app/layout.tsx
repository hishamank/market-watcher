import type { Metadata } from "next";
import { allowIndexing, siteUrl } from "../metadata/site.ts";
import { readMetadataLocale } from "../metadata/page-metadata.ts";
import { Alexandria } from "next/font/google";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { localeDirection, parseLocale } from "@mini/core";
import type { ReactNode } from "react";
import { gatewayUrl, readShellMeta } from "../gateway/shell-meta.ts";
import { LOCALE_COOKIE } from "../platform/locale-cookie.ts";
import { NONCE_HEADER } from "../proxy.ts";
import { Providers } from "../providers/providers.tsx";
import { AppShell } from "../shell/app-shell.tsx";
import { PrePaintScript } from "../integrations/pre-paint-script.tsx";
import "./globals.css";

const alexandria = Alexandria({
  subsets: ["latin", "arabic"],
  variable: "--font-alexandria",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await readMetadataLocale();
  return {
    metadataBase: siteUrl,
    title: t("header.title"),
    description: t("seo.homeDescription"),
    robots: { index: allowIndexing, follow: true },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const meta = await readShellMeta();
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className={alexandria.variable}
      suppressHydrationWarning
    >
      <head>
        <PrePaintScript nonce={nonce} />
      </head>
      <body>
        <Providers gatewayUrl={gatewayUrl} initialFeedMode={meta.feedMode} locale={locale}>
          <AppShell meta={meta}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
