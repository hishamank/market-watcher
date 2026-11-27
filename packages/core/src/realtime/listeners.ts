export const notifyAll = (listeners: ReadonlySet<() => void>): void =>
  Array.from(listeners).forEach((listener) => listener());

export const addListener = (listeners: Set<() => void>, listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
