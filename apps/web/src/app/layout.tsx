import type { Metadata } from "next";
import { Alexandria } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { gatewayUrl, readShellMeta } from "../gateway/shell-meta.ts";
import { Providers } from "../providers/providers.tsx";
import { AppShell } from "../shell/app-shell.tsx";
import "./globals.css";

const alexandria = Alexandria({
  subsets: ["latin", "arabic"],
  variable: "--font-alexandria",
  display: "swap",
});

export const metadata: Metadata = { title: "Markets" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const meta = await readShellMeta();
  return (
    <html lang="en" dir="ltr" className={alexandria.variable}>
      <body>
        <Providers gatewayUrl={gatewayUrl}>
          <AppShell meta={meta}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
