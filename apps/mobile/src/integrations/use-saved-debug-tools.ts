import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect } from "react";
import { restoreDebugTools, SAVED_DEBUG_TOOLS_KEY } from "../platform/debug-tools.ts";

export function useSavedDebugTools(): void {
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(SAVED_DEBUG_TOOLS_KEY).then((saved) => {
      if (active) restoreDebugTools(saved);
    });
    return () => {
      active = false;
    };
  }, []);
}
