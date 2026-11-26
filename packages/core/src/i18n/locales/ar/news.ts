import type { newsStrings } from "../en/news.ts";
import type { Translation } from "../en/index.ts";

export const arNewsStrings = {
  "news.title": "أخبار الشركة",
  "news.more": "عرض المزيد",
  "news.less": "عرض أقل",
  "news.source": "الأخبار عبر Yahoo Finance",
  "news.sample": "أخبار تجريبية · عناوين خيالية لهذا العرض",
  "news.sampleStory": "خبر تجريبي",
  "news.loading": "جارٍ تحميل أخبار الشركة",
  "news.empty": "لا تتوفر أخبار حديثة لهذه الورقة المالية.",
  "news.error": "تعذّر تحميل الأخبار.",
  "news.external": "{{title}} (يفتح في علامة تبويب جديدة)",
} satisfies Translation<typeof newsStrings>;
