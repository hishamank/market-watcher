import type { LocaleSwitch } from "@mini/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SAVED_LOCALE_KEY = "locale";

export const switchNativeLocale: LocaleSwitch = (next, apply) => {
  void AsyncStorage.setItem(SAVED_LOCALE_KEY, next);
  apply();
};
