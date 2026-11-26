import { parseLocale, useLanguage } from "@mini/core";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import { SAVED_LOCALE_KEY } from "../platform/locale-switch.ts";

export function useSavedLocale(): void {
  const { setLocale } = useLanguage();
  const restore = useRef(setLocale);
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(SAVED_LOCALE_KEY).then((saved) => {
      if (active && saved !== null) restore.current(parseLocale(saved));
    });
    return () => {
      active = false;
    };
  }, []);
}
