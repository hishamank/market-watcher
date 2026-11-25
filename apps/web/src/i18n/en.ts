export const en = {
  "header.title": "Markets",
  "feedMode.simulated": "Simulated",
  "feedMode.live": "Live",
  "marketStatus.closed": "Market closed",
  "connection.stale.title": "Reconnecting…",
  "connection.stale.help": "Prices may be out of date.",
  "connection.offline.title": "Offline",
  "connection.offline.help": "Check your connection. Prices may be out of date.",
  "connection.retry": "Retry",
  "star.label": "Star {{name}}",
} as const;

export type MessageKey = keyof typeof en;
