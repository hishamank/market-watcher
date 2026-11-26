import type { LocaleSwitch } from "@mini/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SAVED_LOCALE_KEY = "locale";

let switched = false;

export function hasSwitchedLocale(): boolean {
  return switched;
}

export const switchNativeLocale: LocaleSwitch = (next, apply) => {
  switched = true;
  void AsyncStorage.setItem(SAVED_LOCALE_KEY, next);
  apply();
};
