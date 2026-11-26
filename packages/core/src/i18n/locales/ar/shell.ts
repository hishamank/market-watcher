import type { shellStrings } from "../en/shell.ts";
import type { Translation } from "../en/index.ts";

export const arShellStrings = {
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
} satisfies Translation<typeof shellStrings>;
