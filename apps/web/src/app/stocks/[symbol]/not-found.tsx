"use client";

import { useT } from "@mini/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buttonClassName } from "../../../components/button.tsx";
import { EmptyState } from "../../../components/empty-state.tsx";
import { SearchIcon } from "../../../components/icons.tsx";

export default function StockNotFound() {
  const t = useT();
  const params = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(params.symbol ?? "").toUpperCase();
  return (
    <main className="flex flex-1 flex-col pt-48">
      <EmptyState
        testId="not-found"
        icon={<SearchIcon />}
        title={t("detail.notFound.title")}
        help={t("detail.notFound.help", { symbol })}
        action={
          <Link href="/" className={buttonClassName("solid")}>
            {t("detail.notFound.action")}
          </Link>
        }
      />
    </main>
  );
}
