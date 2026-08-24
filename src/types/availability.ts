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
