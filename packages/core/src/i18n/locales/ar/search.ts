import type { searchStrings } from "../en/search.ts";
import type { Translation } from "../en/index.ts";

export const arSearchStrings = {
  "search.open": "بحث",
  "search.dialogLabel": "البحث عن الأسهم",
  "search.placeholder": "ابحث بالرمز أو اسم الشركة",
  "search.clear": "مسح",
  "search.idle.title": "ابحث عن سهم",
  "search.idle.help": "ابحث بالرمز أو اسم الشركة.",
  "search.noResults.title": "لا نتائج لـ «⁨{{query}}⁩»",
  "search.noResults.help": "تحقّق من الإملاء، أو ابحث بالرمز أو اسم الشركة.",
  "search.error.title": "البحث غير متاح",
  "search.error.help": "حدث خطأ ما. حاول مرة أخرى.",
  "search.error.retry": "إعادة المحاولة",
  "search.resultsCount_zero": "لا نتائج",
  "search.resultsCount_one": "نتيجة واحدة",
  "search.resultsCount_two": "نتيجتان",
  "search.resultsCount_few": "{{count}} نتائج",
  "search.resultsCount_many": "{{count}} نتيجة",
  "search.resultsCount_other": "{{count}} نتيجة",
} satisfies Translation<typeof searchStrings>;
