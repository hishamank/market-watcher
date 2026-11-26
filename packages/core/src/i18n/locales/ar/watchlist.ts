import type { watchlistStrings } from "../en/watchlist.ts";
import type { Translation } from "../en/index.ts";

export const arWatchlistStrings = {
  "star.label": "تمييز ⁨{{name}}⁩ بنجمة",
  "watchlist.empty.title": "قائمة المتابعة فارغة",
  "watchlist.empty.help": "اضغط النجمة بجانب أي سهم لإضافته هنا.",
  "watchlist.empty.action": "عرض كل الأسهم",
  "watchlist.suggestions.title": "ابدأ بواحد من هذه",
  "watchlist.count_zero": "لا توجد أسهم",
  "watchlist.count_one": "سهم واحد",
  "watchlist.count_two": "سهمان",
  "watchlist.count_few": "{{count}} أسهم",
  "watchlist.count_many": "{{count}} سهمًا",
  "watchlist.count_other": "{{count}} سهم",
  "watchlist.toast.error": "تعذّر تحديث قائمة المتابعة. حاول مرة أخرى.",
  "watchlist.toast.dismiss": "إغلاق",
} satisfies Translation<typeof watchlistStrings>;
