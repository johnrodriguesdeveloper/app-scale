import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns"
import type { ExpandedCalendarItem } from "@/types/availability"
import type { ServiceDay } from "@/types/schedule"

export interface MonthAvailabilityRoutine {
  service_day_id: string
  is_available: boolean | null
}

export interface MonthAvailabilityException {
  specific_date: string
  service_day_id?: string | null
  is_available: boolean | null
}

/**
 * Builds the day-by-day availability list for one user in one month, applying
 * the same rule everywhere it's needed: a specific-date exception overrides
 * the weekly routine, which overrides the default (available). Callers that
 * hold data for multiple users (e.g. a department-wide report) must filter
 * `routine`/`exceptions` down to one user_id before calling this.
 */
export function buildMonthAvailability(
  month: Date,
  serviceDays: ServiceDay[],
  routine: MonthAvailabilityRoutine[],
  exceptions: MonthAvailabilityException[]
): ExpandedCalendarItem[] {
  if (serviceDays.length === 0) return []

  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const daysInterval = eachDayOfInterval({ start, end })
  const calendarItems: ExpandedCalendarItem[] = []

  daysInterval.forEach((date) => {
    const dayOfWeek = getDay(date)
    const daysServices = serviceDays.filter((s) => s.day_of_week === dayOfWeek)

    daysServices.forEach((service) => {
      const routineForService = routine.find((r) => r.service_day_id === service.id)
      const isRoutineAvailable = routineForService ? routineForService.is_available !== false : true

      const dateStr = format(date, "yyyy-MM-dd")
      const exception = exceptions.find(
        (e) => e.specific_date === dateStr && (e.service_day_id === service.id || e.service_day_id == null)
      )

      const finalStatus = exception ? exception.is_available !== false : isRoutineAvailable

      calendarItems.push({
        date,
        dateStr,
        service,
        isAvailable: finalStatus,
        isException: !!exception,
        key: `${dateStr}-${service.id}`,
      })
    })
  })

  return calendarItems
}
