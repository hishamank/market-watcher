import type { settingsStrings } from "../en/settings.ts";
import type { Translation } from "../en/index.ts";

export const arSettingsStrings = {
  "settings.title": "الإعدادات",
  "settings.open": "فتح الإعدادات",
  "settings.appearance": "المظهر",
  "settings.appearance.system": "النظام",
  "settings.appearance.light": "فاتح",
  "settings.appearance.dark": "داكن",
  "settings.debug": "تصحيح الأخطاء",
  "settings.debug.chaosHelp": "يضيف زرًا يفتح أدوات الفوضى. في وضع المحاكاة فقط.",
} satisfies Translation<typeof settingsStrings>;
