import { WATCHLIST_STORAGE_KEY } from "@mini/core";

export const storedWatchlistScript = `try{var w=JSON.parse(localStorage.getItem(${JSON.stringify(WATCHLIST_STORAGE_KEY)})||"[]");if(!Array.isArray(w)||w.length===0)document.documentElement.dataset.storedWatchlist="empty"}catch{document.documentElement.dataset.storedWatchlist="empty"}`;
