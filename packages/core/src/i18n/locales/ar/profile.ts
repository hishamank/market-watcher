import type { profileStrings } from "../en/profile.ts";
import type { Translation } from "../en/index.ts";

export const arProfileStrings = {
  "profile.about": "عن الشركة",
  "profile.aboutFund": "عن الصندوق",
  "profile.sector": "القطاع",
  "profile.industry": "المجال",
  "profile.exchange": "البورصة",
  "profile.website": "الموقع الإلكتروني",
  "profile.more": "قراءة المزيد",
  "profile.less": "عرض أقل",
  "profile.sample": "معلومات تجريبية عن الشركة",
  "profile.source": "المصدر: Yahoo Finance",
  "profile.retrieved": "تم جلب البيانات في ⁦{{time}}⁩",
  "profile.noDescription": "لا يتوفر وصف لهذه الورقة المالية.",
  "profile.error": "تعذّر تحميل معلومات الشركة.",
  "profile.retry": "إعادة المحاولة",
  "profile.loading": "جارٍ تحميل معلومات الشركة",
  "profile.external": "⁦{{website}}⁩ (يفتح في علامة تبويب جديدة)",
} satisfies Translation<typeof profileStrings>;
