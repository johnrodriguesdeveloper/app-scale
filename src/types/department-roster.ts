import type { ServiceDay } from "./schedule"

export interface GridColumn {
  dateStr: string
  date: Date
  service: ServiceDay
}

export interface RosterGridMember {
  id: string
  user_id: string
  member_functions: { function_id: string }[]
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export interface RosterGridEntry {
  id: string
  function_id: string
  member_id: string | null
  service_day_id: string | null
  schedule_date: string
  member_name: string
}

export interface AvailabilityExceptionEntry {
  user_id: string
  service_day_id: string | null
  specific_date: string
  is_available: boolean | null
}

export interface RegularAvailabilityEntry {
  user_id: string
  service_day_id: string
  is_available: boolean | null
}

export interface BusyUserEntry {
  user_id: string | undefined
  service_day_id: string | null
  schedule_date: string
}
