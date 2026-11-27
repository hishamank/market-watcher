# Mobile Settings behind a gear, with an appearance override

Amends ADR 0051, ADR 0052 and ADR 0060 on mobile. Feature M6.

The mobile tab header now holds one gear button at the end, in place of the "العربية" text button. The gear pushes a Settings stack screen. Settings is not a third tab, because it is visited rarely and the tab bar stays about prices. The screen has two grouped sections on `color.surface`, each row at least 44 px tall:

- **Appearance:** a segmented control with System, Light and Dark. It copies the range tabs' sliding indicator, which jumps with reduced motion.
- **Language:** two rows, "English" and "العربية", with a check on the current one. They call the same in-place switch as before (ADR 0051), so the socket stays connected and the saved locale is unchanged.

**The override uses React Native's `Appearance.setColorScheme`.** It lives in `platform/appearance.ts`. The choice is saved in AsyncStorage as `color-scheme:v1`, the key web uses (ADR 0052), and restored at launch from `integrations/`. `theme/palette.ts` is unchanged: `useColorScheme()` already follows the override, so every screen, the chart and the status bar change together. System passes `'auto'`, which removes the override and follows the OS again. Core is unchanged, because core's `ColorSchemeStore` only knows light and dark, and System is a mobile choice.

The issue asked for a check in Expo Go before relying on this. It ran on iOS Expo Go (SDK 58, React Native 0.88.1) in the simulator:

- With the OS light, `'dark'` turned the header, list, tab bar and status bar dark.
- `'auto'` returned the app to light, with no relaunch.
- Still on `'auto'`, switching the OS to dark turned the app dark live.
- `'light'` with the OS dark held when the OS was toggled.
- The override does not survive a process relaunch, so the saved choice must be applied at launch. It may arrive one frame late, which is accepted.

Android was not checked.

The back button in the stack header now shows the chevron only. On Settings, the back title read "(tabs)", the hidden tab group's name. The option is set on the root stack, so the detail screen gets it too. Without the title, the chevron mirrors in Arabic.

`language.switch` stays in core's catalogue, but mobile no longer uses it.

## Considered options

- **A single Dark mode switch through `CoreProviderProps.colorScheme`:** the fallback in the issue. It reuses web's core store, but it can't express System, and every palette read would move to core's hook.
- **Keep the header language button and add a theme button beside it:** no new screen, but it crowds a header that also gets search (N13).
- **A third Settings tab:** always one tap away, but it treats a rare action like a main view.
