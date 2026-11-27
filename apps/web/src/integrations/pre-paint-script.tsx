"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { colorSchemeScript } from "../platform/color-scheme.ts";
import { storedWatchlistScript } from "../platform/stored-watchlist.ts";

const prePaintScript = colorSchemeScript + ";" + storedWatchlistScript;

export function PrePaintScript({ nonce }: { nonce?: string | undefined }) {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: prePaintScript }} />;
  });
  return null;
}
