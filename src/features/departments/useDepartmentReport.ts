"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { getDepartmentSubtreeIds, isLeaderOfDepartmentChain } from "@/features/departments/departmentLeadership"
import type { ServiceDay } from "@/types/schedule"
import type { ReportMonth, VolunteerReportRow } from "@/types/department-report"

const MONTHS_BACK = 6

interface ReportMember {
  id: string
  user_id: string
  full_name: string
  department_name: string
}

interface RosterEntry {
  member_id: string | null
  schedule_date: string
}

interface AvailabilityExceptionEntry {
  user_id: string
  service_day_id: string | null
  specific_date: string
  is_available: boolean | null
}

interface RegularAvailabilityEntry {
  user_id: string
  service_day_id: string
  is_available: boolean | null
}

interface ReportData {
  isLeader: boolean
  serviceDays: ServiceDay[]
  members: ReportMember[]
  rosters: RosterEntry[]
  availabilityExceptions: AvailabilityExceptionEntry[]
  regularAvailabilities: RegularAvailabilityEntry[]
}

const EMPTY_REPORT_DATA: ReportData = {
  isLeader: false,
  serviceDays: [],
  members: [],
  rosters: [],
  availabilityExceptions: [],
  regularAvailabilities: [],
}

async function fetchIsLeader(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  departmentId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_role")
    .eq("user_id", userId)
    .single()

  const isGlobalAdmin = profile?.org_role === "admin" || profile?.org_role === "master"
  if (isGlobalAdmin) return true

  return isLeaderOfDepartmentChain(supabase, userId, departmentId)
}

async function fetchReportData(
  supabase: ReturnType<typeof createClient>,
  departmentId: string,
  months: ReportMonth[]
): Promise<ReportData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return EMPTY_REPORT_DATA

  const isLeader = await fetchIsLeader(supabase, user.id, departmentId)
  if (!isLeader) return EMPTY_REPORT_DATA

  const subtreeIds = await getDepartmentSubtreeIds(supabase, departmentId)

  const rangeStart = startOfMonth(months[months.length - 1].date)
  const rangeEnd = endOfMonth(months[0].date)
  const startStr = format(rangeStart, "yyyy-MM-dd")
  const endStr = format(rangeEnd, "yyyy-MM-dd")

  const [serviceDaysRes, departmentsRes, membersRes, rostersRes, exceptionsRes, routineRes] = await Promise.all([
    supabase.from("service_days").select("*").order("day_of_week"),
    supabase.from("departments").select("id, name").in("id", subtreeIds),
    supabase
      .from("department_members")
      .select("id, user_id, department_id, profiles:user_id(full_name)")
      .in("department_id", subtreeIds),
    supabase
      .from("rosters")
      .select("member_id, schedule_date")
      .in("department_id", subtreeIds)
      .gte("schedule_date", startStr)
      .lte("schedule_date", endStr),
    supabase
      .from("availability_exceptions")
      .select("user_id, service_day_id, specific_date, is_available")
      .gte("specific_date", startStr)
      .lte("specific_date", endStr),
    supabase.from("availability_routine").select("user_id, service_day_id, is_available"),
  ])

  const departmentNameById = new Map((departmentsRes.data ?? []).map((d) => [d.id as string, d.name as string]))

  const members = (
    (membersRes.data as unknown as {
      id: string
      user_id: string
      department_id: string
      profiles: { full_name: string | null } | null
    }[]) || []
  ).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    full_name: m.profiles?.full_name || "Sem nome",
    department_name: departmentNameById.get(m.department_id) || "",
  }))

  return {
    isLeader: true,
    serviceDays: serviceDaysRes.data || [],
    members,
    rosters: rostersRes.data || [],
    availabilityExceptions: exceptionsRes.data || [],
    regularAvailabilities: routineRes.data || [],
  }
}

function isAvailableForService(
  userId: string,
  dateStr: string,
  serviceId: string,
  exceptions: AvailabilityExceptionEntry[],
  routine: RegularAvailabilityEntry[]
): boolean {
  const exception = exceptions.find(
    (e) =>
      e.user_id === userId &&
      e.specific_date?.startsWith(dateStr) &&
      (!e.service_day_id || e.service_day_id === serviceId)
  )
  if (exception) return exception.is_available ?? false

  const regular = routine.find((r) => r.user_id === userId && r.service_day_id === serviceId)
  if (regular) return regular.is_available ?? false

  return true
}

export function useDepartmentReport(departmentId: string | undefined) {
  const supabase = createClient()

  const months = useMemo<ReportMonth[]>(() => {
    const current = startOfMonth(new Date())
    return Array.from({ length: MONTHS_BACK }, (_, n) => n).map((n) => {
      const date = subMonths(current, n)
      return { key: format(date, "yyyy-MM"), date }
    })
  }, [])

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null)

  const { data, isLoading: loading } = useQuery({
    queryKey: ["department-report", departmentId],
    queryFn: () => fetchReportData(supabase, departmentId!, months),
    enabled: !!departmentId,
  })

  const { rowsByMonth, servicesCountByMonth } = useMemo(() => {
    const rowsByMonth = new Map<string, VolunteerReportRow[]>()
    const servicesCountByMonth = new Map<string, number>()
    if (!data) return { rowsByMonth, servicesCountByMonth }

    months.forEach((month) => {
      const start = startOfMonth(month.date)
      const end = endOfMonth(month.date)
      const startStr = format(start, "yyyy-MM-dd")
      const endStr = format(end, "yyyy-MM-dd")
      const days = eachDayOfInterval({ start, end })

      const servicesInMonth: { dateStr: string; service: ServiceDay }[] = []
      days.forEach((day) => {
        const dayOfWeek = getDay(day)
        data.serviceDays
          .filter((sd) => sd.day_of_week === dayOfWeek)
          .forEach((service) => {
            servicesInMonth.push({ dateStr: format(day, "yyyy-MM-dd"), service })
          })
      })

      servicesCountByMonth.set(month.key, servicesInMonth.length)

      const rows: VolunteerReportRow[] = data.members.map((member) => {
        const timesAvailable = servicesInMonth.filter(({ dateStr, service }) =>
          isAvailableForService(
            member.user_id,
            dateStr,
            service.id,
            data.availabilityExceptions,
            data.regularAvailabilities
          )
        ).length

        const timesScheduled = data.rosters.filter(
          (r) => r.member_id === member.id && r.schedule_date >= startStr && r.schedule_date <= endStr
        ).length

        return {
          memberId: member.id,
          userId: member.user_id,
          fullName: member.full_name,
          departmentName: member.department_name,
          servicesInMonth: servicesInMonth.length,
          timesAvailable,
          timesScheduled,
        }
      })

      rowsByMonth.set(
        month.key,
        rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
      )
    })

    return { rowsByMonth, servicesCountByMonth }
  }, [data, months])

  return {
    loading,
    isLeader: data?.isLeader ?? false,
    months,
    selectedMonthKey,
    setSelectedMonthKey,
    getRowsForMonth: (key: string) => rowsByMonth.get(key) ?? [],
    getServicesCountForMonth: (key: string) => servicesCountByMonth.get(key) ?? 0,
  }
}
