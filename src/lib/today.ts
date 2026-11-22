// Server components run on Vercel in UTC, so `new Date()` there rolls over to the next day at 21:00 in Brazil.
// Anything server-side that means "today" for the church must use this instead.
const APP_TIME_ZONE = "America/Sao_Paulo"

/** Today's date in the app's time zone, as `yyyy-MM-dd`. */
export function getTodayDateStr(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value
  return `${get("year")}-${get("month")}-${get("day")}`
}
