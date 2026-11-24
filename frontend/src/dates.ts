export const zone = "America/Sao_Paulo";

const civilDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const civilTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const dateKey = (instant: Date | string = new Date()) =>
  civilDate.format(new Date(instant));
export const clock = (instant: Date | string) =>
  civilTime.format(new Date(instant));
export const atNoon = (key: string) => new Date(key + "T12:00:00Z");

export function labelDate(
  key: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) {
  return new Intl.DateTimeFormat("pt-BR", {
    ...options,
    timeZone: zone,
  }).format(atNoon(key));
}

export function shiftDate(key: string, days: number) {
  const result = atNoon(key);
  result.setUTCDate(result.getUTCDate() + days);
  return dateKey(result);
}

export function monthStart(key: string, delta: number) {
  const result = atNoon(key.slice(0, 7) + "-01");
  result.setUTCMonth(result.getUTCMonth() + delta);
  return dateKey(result);
}

export const localInput = (iso: string) => dateKey(iso) + "T" + clock(iso);

export function dateTimeISO(local: string) {
  // The input is a São Paulo wall time regardless of the device's own zone.
  const desired = Date.parse(local + "Z");
  let instant = desired;
  for (let i = 0; i < 3; i++) {
    const observed = Date.parse(
      localInput(new Date(instant).toISOString()) + "Z",
    );
    const offset = desired - observed;
    if (!offset) break;
    instant += offset;
  }
  const result = new Date(instant).toISOString();
  if (localInput(result) !== local) {
    throw new Error("Este horário não existe no fuso de São Paulo.");
  }
  return result;
}

export const onDay = (
  event: { starts_at: string; ends_at: string },
  key: string,
) =>
  dateKey(event.starts_at) <= key &&
  dateKey(new Date(Date.parse(event.ends_at) - 1)) >= key;
