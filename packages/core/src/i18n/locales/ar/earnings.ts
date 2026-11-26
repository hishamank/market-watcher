import type { earningsStrings } from "../en/earnings.ts";
import type { Translation } from "../en/index.ts";

export const arEarningsStrings = {
  "earnings.title": "الأرباح",
  "earnings.next": "التقرير القادم",
  "earnings.latest": "آخر ربحية سهم مُعلنة",
  "earnings.actual": "الفعلي",
  "earnings.estimate": "التقديري",
  "earnings.estimateShort": "تقدير",
  "earnings.history": "ربحية السهم",
  "earnings.quarter": "ر{{quarter}} {{year}}",
  "earnings.scheduled": "مجدول",
  "earnings.estimated": "متوقع",
  "earnings.unknown": "أساس المحاسبة غير متوفر · USD · أرباع السنة المالية",
  "earnings.dateUnknown": "التاريخ غير مؤكد",
  "earnings.gaap": "GAAP · USD · أرباع السنة المالية",
  "earnings.nongaap": "Non-GAAP · USD · أرباع السنة المالية",
  "earnings.sample": "أرباح تجريبية · بيانات خيالية",
  "earnings.loading": "جارٍ تحميل الأرباح",
  "earnings.error": "تعذّر تحميل الأرباح.",
} satisfies Translation<typeof earningsStrings>;
