import { cancelTimeout, scheduleTimeout, type TimerHandle } from "./timers.ts";

export const MAX_MESSAGES_PER_WINDOW = 10;
export const BUDGET_WINDOW_MS = 1_000;

export interface SendBudget<T> {
  size(): number;
  enqueue(item: T): void;
  clear(): void;
}

export function createSendBudget<T>(write: (item: T) => void): SendBudget<T> {
  const queue: T[] = [];
  let sentAt: number[] = [];
  let timer: TimerHandle | null = null;
  let draining = false;

  function writeAllowed(): void {
    const now = Date.now();
    sentAt = sentAt.filter((time) => time > now - BUDGET_WINDOW_MS);
    while (queue.length > 0 && sentAt.length < MAX_MESSAGES_PER_WINDOW) {
      write(queue.shift() as T);
      sentAt.push(Date.now());
    }
  }

  function drain(): void {
    if (draining || timer !== null) return;
    draining = true;
    try {
      writeAllowed();
    } finally {
      draining = false;
    }
    if (queue.length === 0) return;
    timer = scheduleTimeout(
      () => {
        timer = null;
        drain();
      },
      (sentAt[0] ?? Date.now()) + BUDGET_WINDOW_MS - Date.now(),
    );
  }

  return {
    size: () => queue.length,
    enqueue(item) {
      queue.push(item);
      drain();
    },
    clear() {
      queue.length = 0;
      sentAt = [];
      if (timer !== null) cancelTimeout(timer);
      timer = null;
    },
  };
}
