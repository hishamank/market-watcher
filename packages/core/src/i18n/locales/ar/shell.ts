import type { shellStrings } from "../en/shell.ts";
import type { Translation } from "../en/index.ts";

export const arShellStrings = {
  "feedChanged.title": "تغيّر مصدر بيانات السوق",
  "feedChanged.help":
    "تم إخفاء الأسعار لتجنّب خلط البيانات المباشرة والمحاكاة. أعد تحميل الصفحة لبدء جلسة جديدة.",
  "feedChanged.reload": "إعادة التحميل",
  "feedChanged.mobileHelp":
    "تم إخفاء الأسعار لتجنّب خلط البيانات المباشرة والمحاكاة. أغلق التطبيق وافتحه مجددًا لبدء جلسة جديدة.",

  "theme.darkMode": "الوضع الداكن",
  "header.title": "الأسواق",
  "feedMode.simulated": "محاكاة",
  "feedMode.live": "مباشر",
  "marketStatus.closed": "السوق مغلق",
  "marketStatus.lastClose": "آخر إغلاق ⁦{{time}}⁩",
  "connection.stale.title": "جارٍ إعادة الاتصال…",
  "connection.stale.help": "قد لا تكون الأسعار محدّثة.",
  "connection.offline.title": "غير متصل",
  "connection.offline.help": "تحقّق من اتصالك. قد لا تكون الأسعار محدّثة.",
  "connection.retry": "إعادة المحاولة",
  "language.switch": "English",
  "language.label": "اللغة",
  "language.english": "English",
  "language.englishShort": "EN",
  "language.arabic": "العربية",
  "language.arabicShort": "ع",
} satisfies Translation<typeof shellStrings>;
