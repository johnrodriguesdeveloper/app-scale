import type { createClient } from "@/lib/supabase/client"
import type { AvailabilityRoutine, AvailabilityRoutineHistoryEntry } from "@/types/availability"
import { getMonthEditDeadline } from "@/utils/getTargetMonthDate"

const HISTORY_COLUMNS = "id, user_id, service_day_id, is_available, is_deleted, valid_from"
// PostgREST silently caps responses (max-rows, 1000 by default); rows come
// oldest-first, so a truncated response would drop the NEWEST changes.
const PAGE_SIZE = 1000
// Keeps the `user_id=in.(...)` query string at a sane length.
const USER_CHUNK_SIZE = 100

/**
 * Fetches every `availability_routine_history` row for `userIds` (optionally
 * only rows with `valid_from < before`), paginating past the PostgREST row cap.
 */
export async function fetchRoutineHistory(
  supabase: ReturnType<typeof createClient>,
  userIds: string[],
  before?: Date
): Promise<AvailabilityRoutineHistoryEntry[]> {
  const rows: AvailabilityRoutineHistoryEntry[] = []
  for (let i = 0; i < userIds.length; i += USER_CHUNK_SIZE) {
    const chunk = userIds.slice(i, i + USER_CHUNK_SIZE)
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase.from("availability_routine_history").select(HISTORY_COLUMNS).in("user_id", chunk)
      if (before) query = query.lt("valid_from", before.toISOString())
      const { data, error } = await query
        .order("valid_from", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < PAGE_SIZE) break
    }
  }
  return rows
}

type HistoryRow = Pick<
  AvailabilityRoutineHistoryEntry,
  "id" | "user_id" | "service_day_id" | "is_available" | "is_deleted" | "valid_from"
>

/**
 * Parses `valid_from`. The backfilled baseline rows come back from PostgREST
 * as "-infinity" (not a valid JS date), meaning "in effect since forever".
 */
export function parseValidFrom(validFrom: string): number {
  if (validFrom === "-infinity") return Number.NEGATIVE_INFINITY
  if (validFrom === "infinity") return Number.POSITIVE_INFINITY
  const time = Date.parse(validFrom)
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time
}

/**
 * Reconstructs the weekly routine as it was at `asOf` from
 * `availability_routine_history` rows: for each (user, service day) the
 * latest row with `valid_from < asOf` wins (ties broken by insertion order,
 * i.e. `id`). Pairs whose latest row is a deletion — or that had no row yet —
 * are omitted, so `buildMonthAvailability` falls back to the default
 * (available), exactly as it does for a missing live routine row.
 *
 * Which `asOf` to use for a month is decided by the caller; the app uses
 * `getMonthEditDeadline(month)` (see `getRoutineForMonth`).
 */
export function getRoutineAsOf(history: HistoryRow[], asOf: Date): AvailabilityRoutine[] {
  const cutoff = asOf.getTime()
  const latest = new Map<string, { row: HistoryRow; time: number }>()

  history.forEach((row) => {
    const time = parseValidFrom(row.valid_from)
    // Strict: a change made exactly at the deadline was already made while
    // the month was locked (getTargetMonthDate moves on at 00:00 of day 21).
    if (time >= cutoff) return

    const key = `${row.user_id}|${row.service_day_id}`
    const current = latest.get(key)
    if (!current || time > current.time || (time === current.time && row.id > current.row.id)) {
      latest.set(key, { row, time })
    }
  })

  const routine: AvailabilityRoutine[] = []
  latest.forEach(({ row }) => {
    if (row.is_deleted) return
    routine.push({ user_id: row.user_id, service_day_id: row.service_day_id, is_available: row.is_available })
  })
  return routine
}

/**
 * Routine in effect for `month`: the state as of the moment the month stopped
 * being editable (`getMonthEditDeadline`, day 21 of the previous month). That
 * is the availability leaders built the month's schedule from, and routine
 * changes after it can no longer legitimately affect that month (members
 * can't edit locked months). For a month that is still editable the deadline
 * is in the future, so this is simply the latest (live) routine.
 */
export function getRoutineForMonth(history: HistoryRow[], month: Date): AvailabilityRoutine[] {
  return getRoutineAsOf(history, getMonthEditDeadline(month))
}
