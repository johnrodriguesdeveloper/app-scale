import { addDays, format, getDate, setDate } from "date-fns"

export const AVAILABILITY_DEADLINE_DAY = 20

export function getTomorrowDateStr(today: Date): string {
  return format(addDays(today, 1), "yyyy-MM-dd")
}

export function isThreeDaysBeforeDeadline(today: Date): boolean {
  return getDate(today) === AVAILABILITY_DEADLINE_DAY - 3
}

export function isDeadlineDay(today: Date): boolean {
  return getDate(today) === AVAILABILITY_DEADLINE_DAY
}

export function getDeadlineDateStr(today: Date): string {
  return format(setDate(today, AVAILABILITY_DEADLINE_DAY), "yyyy-MM-dd")
}
