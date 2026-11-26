import type { statisticsStrings } from "../en/statistics.ts";
import type { Translation } from "../en/index.ts";

export const arStatisticsStrings = {
  "statistics.title": "إحصاءات رئيسية",
  "statistics.marketCap": "القيمة السوقية",
  "statistics.trailingPE": "مضاعف الربحية (TTM)",
  "statistics.trailingEps": "ربحية السهم (TTM)",
  "statistics.dividendYield": "عائد التوزيعات",
  "statistics.averageVolume": "متوسط التداول (3 أشهر)",
  "statistics.yearRange": "نطاق 52 أسبوعًا",
  "statistics.lastPrice": "آخر سعر ⁦{{price}}⁩",
  "statistics.sample": "إحصاءات تجريبية · USD",
  "statistics.note": "USD · القيم غير المتوفرة تظهر كشرطة —",
  "statistics.loading": "جارٍ تحميل الإحصاءات الرئيسية",
  "statistics.error": "تعذّر تحميل الإحصاءات.",
} satisfies Translation<typeof statisticsStrings>;
