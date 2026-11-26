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
  "statistics.marketCapHelp":
    "القيمة السوقية الإجمالية لأسهم الشركة القائمة. K = ألف، M = مليون، B = مليار، T = تريليون. لا ينطبق على الصناديق.",
  "statistics.trailingPEHelp":
    "سعر السهم مقسومًا على ربحية السهم خلال الاثني عشر شهرًا الماضية (TTM). تشير الشرطة إلى قيمة غير متوفرة أو غير ذات معنى لهذه الورقة المالية.",
  "statistics.trailingEpsHelp":
    "ربحية السهم خلال الاثني عشر شهرًا الماضية (TTM). تشير القيمة السالبة إلى خسارة. القيم النقدية بالدولار الأمريكي.",
  "statistics.dividendYieldHelp":
    "التوزيعات السنوية المتوقعة وفق Yahoo كنسبة من سعر السهم. تشير الشرطة إلى عدم توفر قيمة، وليس إلى عائد صفري.",
  "statistics.averageVolumeHelp":
    "متوسط عدد الأسهم المتداولة يوميًا خلال الأشهر الثلاثة الماضية. K = ألف، M = مليون.",
  "statistics.yearRangeHelp":
    "أدنى وأعلى سعر أبلغت عنه Yahoo خلال آخر 52 أسبوعًا. يستخدم المؤشر آخر سعر متاح معروض في هذه الصفحة، ويبقى عند أقرب طرف إذا تجاوز السعر النطاق. قد تختلف أوقات تحديث المصدرين.",
  "statistics.lastPrice": "آخر سعر ⁦{{price}}⁩",
  "statistics.sample": "إحصاءات تجريبية · USD",
  "statistics.note": "USD · القيم غير المتوفرة تظهر كشرطة —",
  "statistics.loading": "جارٍ تحميل الإحصاءات الرئيسية",
  "statistics.empty": "الإحصاءات غير متوفرة لهذه الورقة المالية بعد.",
  "statistics.error": "تعذّر تحميل الإحصاءات.",
} satisfies Translation<typeof statisticsStrings>;
