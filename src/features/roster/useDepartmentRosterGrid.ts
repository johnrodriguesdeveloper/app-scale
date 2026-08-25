"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { isLeaderOfDepartmentChain } from "@/features/departments/departmentLeadership"
import type { DepartmentFunction } from "@/types/department"
import type { ServiceDay } from "@/types/schedule"
import type {
  AvailabilityExceptionEntry,
  BusyUserEntry,
  GridColumn,
  RegularAvailabilityEntry,
  RosterGridEntry,
  RosterGridMember,
} from "@/types/department-roster"

interface RosterStructure {
  allServiceDays: ServiceDay[]
  functions: DepartmentFunction[]
  members: RosterGridMember[]
}

interface RosterMonthData {
  gridColumns: GridColumn[]
  rosterEntries: RosterGridEntry[]
  availabilityExceptions: AvailabilityExceptionEntry[]
  regularAvailabilities: RegularAvailabilityEntry[]
  busyUsers: BusyUserEntry[]
}

async function fetchRosterStructure(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<RosterStructure> {
  const [servicesRes, funcsRes, membersRes] = await Promise.all([
    supabase.from("service_days").select("*").order("day_of_week"),
    supabase.from("department_functions").select("*").eq("department_id", departmentId).order("name"),
    supabase
      .from("department_members")
      .select("id, user_id, member_functions(function_id), profiles:user_id(full_name, avatar_url)")
      .eq("department_id", departmentId),
  ])

  return {
    allServiceDays: servicesRes.data || [],
    functions: funcsRes.data || [],
    members: (membersRes.data as unknown as RosterGridMember[]) || [],
  }
}

async function fetchRosterCanEdit(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_role")
    .eq("user_id", user.id)
    .single()

  const isGlobalAdmin = profile?.org_role === "admin" || profile?.org_role === "master"
  if (isGlobalAdmin) return true

  return isLeaderOfDepartmentChain(supabase, user.id, departmentId)
}

async function fetchRosterMonthData(
  supabase: ReturnType<typeof createClient>,
  departmentId: string,
  currentMonth: Date,
  allServiceDays: ServiceDay[]
): Promise<RosterMonthData> {
  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const startStr = format(start, "yyyy-MM-dd")
  const endStr = format(end, "yyyy-MM-dd")

  const days = eachDayOfInterval({ start, end })
  const gridColumns: GridColumn[] = []
  days.forEach((day) => {
    const dayOfWeek = getDay(day)
    const servicesForDay = allServiceDays.filter((sd) => sd.day_of_week === dayOfWeek)
    servicesForDay.forEach((service) => {
      gridColumns.push({ date: day, dateStr: format(day, "yyyy-MM-dd"), service })
    })
  })

  const [rostersRes, exceptionsRes, availabilitiesRes, conflictsRes] = await Promise.all([
    supabase
      .from("rosters")
      .select(
        "id, function_id, member_id, service_day_id, schedule_date, department_members:member_id(user_id, profiles:user_id(full_name))"
      )
      .eq("department_id", departmentId)
      .gte("schedule_date", startStr)
      .lte("schedule_date", endStr),
    supabase
      .from("availability_exceptions")
      .select("user_id, service_day_id, specific_date, is_available")
      .gte("specific_date", startStr)
      .lte("specific_date", endStr),
    supabase.from("availability_routine").select("user_id, service_day_id, is_available"),
    supabase
      .from("rosters")
      .select("schedule_date, service_day_id, department_members!inner(user_id)")
      .gte("schedule_date", startStr)
      .lte("schedule_date", endStr),
  ])

  const rosterEntries: RosterGridEntry[] = (rostersRes.data || []).map((r) => ({
    id: r.id,
    function_id: r.function_id,
    member_id: r.member_id,
    service_day_id: r.service_day_id,
    schedule_date: r.schedule_date,
    member_name: r.department_members?.profiles?.full_name || "Escalado",
  }))

  const busyUsers: BusyUserEntry[] = (conflictsRes.data || []).map((c) => ({
    user_id: c.department_members?.user_id,
    service_day_id: c.service_day_id,
    schedule_date: c.schedule_date,
  }))

  return {
    gridColumns,
    rosterEntries,
    availabilityExceptions: exceptionsRes.data || [],
    regularAvailabilities: availabilitiesRes.data || [],
    busyUsers,
  }
}

export function useDepartmentRosterGrid(departmentId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const monthKey = format(currentMonth, "yyyy-MM")

  const [showMemberSelect, setShowMemberSelect] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    functionId: string
    functionName: string
    serviceId: string
    date: Date
    currentRosterId?: string
  } | null>(null)

  const { data: structure } = useQuery({
    queryKey: ["roster-structure", departmentId],
    queryFn: () => fetchRosterStructure(supabase, departmentId!),
    enabled: !!departmentId,
  })

  const { data: canEdit = false } = useQuery({
    queryKey: ["roster-can-edit", departmentId],
    queryFn: () => fetchRosterCanEdit(supabase, departmentId!),
    enabled: !!departmentId,
  })

  const monthQueryKey = ["roster-month", departmentId, monthKey]

  const { data: monthData, isLoading: loading } = useQuery({
    queryKey: monthQueryKey,
    queryFn: () => fetchRosterMonthData(supabase, departmentId!, currentMonth, structure!.allServiceDays),
    enabled: !!departmentId && !!structure,
  })

  const functions = structure?.functions ?? []
  const members = structure?.members ?? []
  const gridColumns = monthData?.gridColumns ?? []
  const rosterEntries = monthData?.rosterEntries ?? []
  const availabilityExceptions = monthData?.availabilityExceptions ?? []
  const regularAvailabilities = monthData?.regularAvailabilities ?? []
  const busyUsers = monthData?.busyUsers ?? []

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const getRosterInCell = (functionId: string, dateStr: string, serviceId: string) => {
    return rosterEntries.find(
      (e) => e.function_id === functionId && e.schedule_date === dateStr && e.service_day_id === serviceId
    )
  }

  const getFilteredMembers = () => {
    if (!selectedCell) return []
    const dateStr = format(selectedCell.date, "yyyy-MM-dd")

    return members.filter((member) => {
      const hasFunction = member.member_functions?.some(
        (mf) => mf.function_id === selectedCell.functionId
      )

      const isUnavailable = (() => {
        const exception = availabilityExceptions.find(
          (e) =>
            e.user_id === member.user_id &&
            e.specific_date?.startsWith(dateStr) &&
            (!e.service_day_id || e.service_day_id === selectedCell.serviceId)
        )

        if (exception) return !exception.is_available

        const regular = regularAvailabilities.find(
          (a) => a.user_id === member.user_id && a.service_day_id === selectedCell.serviceId
        )

        if (regular) return !regular.is_available

        return false
      })()

      const isBusy = busyUsers.some(
        (b) =>
          b.user_id === member.user_id &&
          b.schedule_date?.startsWith(dateStr) &&
          b.service_day_id === selectedCell.serviceId
      )

      return hasFunction && !isUnavailable && !isBusy
    })
  }

  const invalidateMonth = () => queryClient.invalidateQueries({ queryKey: monthQueryKey })

  const addMemberMutation = useMutation({
    mutationFn: async (memberDbId: string) => {
      if (!selectedCell || !departmentId || !canEdit) return

      if (selectedCell.currentRosterId) {
        await supabase.from("rosters").delete().eq("id", selectedCell.currentRosterId)
      }

      const { error } = await supabase.from("rosters").insert({
        department_id: departmentId,
        function_id: selectedCell.functionId,
        member_id: memberDbId,
        service_day_id: selectedCell.serviceId,
        schedule_date: format(selectedCell.date, "yyyy-MM-dd"),
      })

      if (error) throw error
    },
    onSuccess: () => {
      setShowMemberSelect(false)
      invalidateMonth()
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : "Erro ao escalar membro.")
    },
  })

  const removeDirectlyMutation = useMutation({
    mutationFn: async (rosterId: string) => {
      if (!canEdit) return
      const { error } = await supabase.from("rosters").delete().eq("id", rosterId)
      if (error) throw error
    },
    onSuccess: () => {
      setShowMemberSelect(false)
      invalidateMonth()
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : "Erro ao remover da escala.")
    },
  })

  return {
    currentMonth,
    loading,
    gridColumns,
    functions,
    canEdit,
    showMemberSelect,
    setShowMemberSelect,
    selectedCell,
    setSelectedCell,
    saving: addMemberMutation.isPending || removeDirectlyMutation.isPending,
    prevMonth,
    nextMonth,
    getRosterInCell,
    getFilteredMembers,
    handleAddMember: (memberDbId: string) => addMemberMutation.mutateAsync(memberDbId),
    handleRemoveDirectly: (rosterId: string) => removeDirectlyMutation.mutateAsync(rosterId),
  }
}
