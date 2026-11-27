# Arabic with an in-place language switch

Amends ADR 0016 and ADR 0041. Adds the optional Arabic translation.

Arabic is the second locale. A text button in the header, reading "العربية" in English and "English" in Arabic, switches between them. The switch happens in place: strings, `lang` and `dir` change in the same frame, and the socket, the query cache and the quote store stay as they are. A reload would drop the socket and blank the page, which is the opposite of what a live price app should do.

- **Core owns the locale.** The i18n service is a small store. `useT()` subscribes to it and returns one stable translator per locale, so React Compiler recomputes anything built from it when the locale changes. `useLanguage()` returns the locale, its direction and `setLocale`. Each platform applies the change through an optional `switchLocale(next, apply)` on `CoreProvider`: it calls `apply` when the new strings should render, and does its own side effects around that.
- **Web keeps the choice in a `locale` cookie.** The root layout reads it, renders `<html lang dir>` and passes the locale to `CoreProvider`, so a reload in Arabic has no flash of English and no hydration mismatch (ADR 0023). On a switch, the web platform writes the cookie, then sets `lang` and `dir` and flushes the new strings inside `document.startViewTransition`, so the page cross-fades from one direction to the other. Reduced motion turns the animation off through the existing view-transition rule. A browser without view transitions switches at once.
- **Mobile flips in place too.** Expo's docs say Expo Go resets `I18nManager.forceRTL` when it opens a project, so a forced direction plus a reload cannot work there. Instead the root view sets the Yoga `direction` style, and Expo Router's `LocaleProvider` gets the same direction for navigation. Start and end styles, rows and the range tab indicator then mirror without a restart. The choice is saved in AsyncStorage and restored at launch. No new dependency is needed.
- **Values stay left to right.** Interpolated values in Arabic strings (times, prices, symbols, queries, names) are wrapped in Unicode isolates in the catalogue, so they never reorder the sentence around them. Arabic dates from the core formatters are wrapped in a right-to-left isolate, because they often sit inside a left-to-right container such as the chart or a value cell. Digits stay Latin, and the calendar is pinned to Gregorian. Company names get `dir="auto"` on web and a left-to-right isolate on mobile, so "Apple Inc." keeps its full stop at the end.
- **The catalogue is typed.** Each Arabic feature file `satisfies` a type derived from its English twin, with every plural key needing all six Arabic forms. A missing or extra key fails the type check, rather than falling back to English at runtime.

These additive core exports extend the frozen core API: `useLanguage`, `LanguageResult`, `parseLocale`, `localeDirection`, `Locale`, `TextDirection`, `LocaleSwitch`, and the optional `switchLocale` prop on `CoreProviderProps`. `useLocale()` keeps its signature and now follows the switch. `MessageKey` gains `language.switch`.

## Considered options

- **Reload on switch:** the simplest, but it drops the socket and the cache, and blanks the page.
- **Follow the browser or device language only:** no control to build, but hard to demo and impossible to override.
- **Locale in the URL (`/ar/...`):** shareable, but it doubles every route and conflicts with ADR 0050's shallow view changes. Language is a user preference, not page state.
- **`I18nManager.forceRTL` on mobile:** the standard React Native way, but Expo Go resets it, and it needs a restart.

The Arabic copy was written for this change, and it needs a native speaker's review before release.
