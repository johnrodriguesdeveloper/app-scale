export interface AvailabilityRoutine {
  user_id: string
  service_day_id: string
  is_available: boolean | null
}

export interface AvailabilityException {
  user_id: string
  specific_date: string
  service_day_id?: string | null
  is_available: boolean | null
}

export interface ExpandedCalendarItem {
  date: Date
  dateStr: string
  service: { id: string; name: string | null; day_of_week: number }
  isAvailable: boolean
  isException: boolean
  key: string
}

/** One row of `availability_routine_history` (append-only log of routine changes). */
export interface AvailabilityRoutineHistoryEntry {
  id: number
  user_id: string
  service_day_id: string
  is_available: boolean | null
  /** The routine row was deleted from `valid_from` on (back to the default). */
  is_deleted: boolean
  /** ISO timestamp; the backfilled baseline rows use "-infinity". */
  valid_from: string
}
