"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { colorSchemeScript } from "../platform/color-scheme.ts";

export function ThemeScript() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: colorSchemeScript }} />;
  });
  return null;
}
