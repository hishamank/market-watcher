const NEW_YORK = "America/New_York";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: NEW_YORK,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: NEW_YORK,
  timeZoneName: "longOffset",
});

export function newYorkDate(timeMs: number): string {
  return dateFormat.format(timeMs);
}

function offsetMs(timeMs: number): number {
  const name = offsetFormat.formatToParts(timeMs).find((part) => part.type === "timeZoneName");
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name?.value ?? "");
  if (match === null) {
    return 0;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "-" ? -1 : 1) * minutes * 60_000;
}

export function newYorkTime(date: string, clock: string): number | undefined {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clockMatch = /^(\d{2}):?(\d{2})$/.exec(clock);
  if (dateMatch === null || clockMatch === null) {
    return undefined;
  }
  const wall = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(clockMatch[1]),
    Number(clockMatch[2]),
  );
  return wall - offsetMs(wall - offsetMs(wall));
}
