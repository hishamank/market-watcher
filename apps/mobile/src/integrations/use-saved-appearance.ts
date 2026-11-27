import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { restoreAppearance, SAVED_APPEARANCE_KEY } from "../platform/appearance.ts";

export function useSavedAppearance(): void {
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(SAVED_APPEARANCE_KEY).then((saved) => {
      if (active) restoreAppearance(saved);
    });
    return () => {
      active = false;
    };
  }, []);
}
