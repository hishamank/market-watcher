import type { ColorScheme, ColorSchemeStore } from "@mini/core";

const storageKey = "color-scheme:v1";

function readPreference(): ColorScheme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function createColorSchemeStore(): ColorSchemeStore {
  let preference: ColorScheme | null = null;
  const listeners = new Set<() => void>();
  const resolve = (): ColorScheme =>
    preference ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const publish = () => {
    document.documentElement.dataset.theme = resolve();
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    subscribe(listener) {
      if (listeners.size === 0) {
        preference = readPreference();
        publish();
      }
      listeners.add(listener);
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onStorage = (event: StorageEvent) => {
        if (event.key !== storageKey && event.key !== null) return;
        preference = readPreference();
        publish();
      };
      media.addEventListener("change", publish);
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        media.removeEventListener("change", publish);
        window.removeEventListener("storage", onStorage);
      };
    },
    set(scheme) {
      preference = scheme;
      try {
        localStorage.setItem(storageKey, scheme);
      } catch {}
      publish();
    },
  };
}

export const colorSchemeScript = `try{var t=localStorage.getItem("${storageKey}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}`;
