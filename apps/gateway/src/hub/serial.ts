export type Serial = (task: () => Promise<void>) => Promise<void>;

export function createSerial(): Serial {
  let tail: Promise<void> = Promise.resolve();
  return (task) => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}
