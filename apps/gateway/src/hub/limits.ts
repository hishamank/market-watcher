export const FLUSH_INTERVAL_MS = 250;
export const HEARTBEAT_INTERVAL_MS = 5_000;
export const PING_INTERVAL_MS = 15_000;
export const MAX_BUFFERED_BYTES = 64 * 1024;
export const STUCK_CLOSE_MS = 10_000;
export const CLOSE_TIMEOUT_MS = 1_000;
export const UPSTREAM_RETRY_MS = 1_000;
export const REPLY_DEADLINE_MS = 5_000;
export const MAX_SUBSCRIPTIONS = 100;
export const MAX_MESSAGE_BYTES = 16 * 1024;
export const MESSAGES_PER_SECOND = 20;
export const CONNECTIONS_PER_IP = 10;
export const MAX_CONNECTIONS = 2_000;
export const MAX_PENDING_OPERATIONS = 256;
export const MAX_OVER_LIMIT_MESSAGES = 300;
export const OVER_LIMIT_WINDOW_MS = 10_000;
export const ABUSE_COOLDOWN_MS = 30_000;
export const MAX_COOLDOWN_ENTRIES = 10_000;

export const CLOSE_UNSUPPORTED_VERSION = 1002;
export const CLOSE_POLICY_VIOLATION = 1008;
export const CLOSE_INTERNAL_ERROR = 1011;
export const CLOSE_SLOW_CONSUMER = 1013;
export const CLOSE_CHAOS_DROP = 1000;

export const CHAOS_REVERT_MS = 60_000;
export const CHAOS_TICK_SPIKE_MULTIPLIER = 20;
export const CHAOS_HISTORY_LATENCY_MS = 2_000;
