"use client"

import { useCallback, useEffect, useState } from "react"
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

export function useDepartmentRosterGrid(departmentId: string | undefined) {
  const supabase = createClient()

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const [loading, setLoading] = useState(true)

  const [allServiceDays, setAllServiceDays] = useState<ServiceDay[]>([])
  const [functions, setFunctions] = useState<DepartmentFunction[]>([])
  const [members, setMembers] = useState<RosterGridMember[]>([])

  const [gridColumns, setGridColumns] = useState<GridColumn[]>([])
  const [rosterEntries, setRosterEntries] = useState<RosterGridEntry[]>([])

  const [availabilityExceptions, setAvailabilityExceptions] = useState<AvailabilityExceptionEntry[]>([])
  const [regularAvailabilities, setRegularAvailabilities] = useState<RegularAvailabilityEntry[]>([])
  const [busyUsers, setBusyUsers] = useState<BusyUserEntry[]>([])

  const [showMemberSelect, setShowMemberSelect] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    functionId: string
    functionName: string
    serviceId: string
    date: Date
    currentRosterId?: string
  } | null>(null)
  const [saving, setSaving] = useState(false)

  const loadStructure = useCallback(async () => {
    if (!departmentId) return

    const [servicesRes, funcsRes, membersRes] = await Promise.all([
      supabase.from("service_days").select("*").order("day_of_week"),
      supabase.from("department_functions").select("*").eq("department_id", departmentId).order("name"),
      supabase
        .from("department_members")
        .select("id, user_id, member_functions(function_id), profiles:user_id(full_name, avatar_url)")
        .eq("department_id", departmentId),
    ])

    if (servicesRes.data) setAllServiceDays(servicesRes.data)
    if (funcsRes.data) setFunctions(funcsRes.data)

    if (membersRes.data) {
      setMembers(membersRes.data as unknown as RosterGridMember[])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  const loadMonthData = useCallback(async () => {
    if (!departmentId || allServiceDays.length === 0) return
    setLoading(true)

    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const startStr = format(start, "yyyy-MM-dd")
      const endStr = format(end, "yyyy-MM-dd")

      const days = eachDayOfInterval({ start, end })
      const cols: GridColumn[] = []
      days.forEach((day) => {
        const dayOfWeek = getDay(day)
        const servicesForDay = allServiceDays.filter((sd) => sd.day_of_week === dayOfWeek)
        servicesForDay.forEach((service) => {
          cols.push({ date: day, dateStr: format(day, "yyyy-MM-dd"), service })
        })
      })
      setGridColumns(cols)

      const { data: rosters } = await supabase
        .from("rosters")
        .select(
          "id, function_id, member_id, service_day_id, schedule_date, department_members:member_id(user_id, profiles:user_id(full_name))"
        )
        .eq("department_id", departmentId)
        .gte("schedule_date", startStr)
        .lte("schedule_date", endStr)

      if (rosters) {
        const formattedRosters: RosterGridEntry[] = rosters.map((r) => ({
          id: r.id,
          function_id: r.function_id,
          member_id: r.member_id,
          service_day_id: r.service_day_id,
          schedule_date: r.schedule_date,
          member_name: r.department_members?.profiles?.full_name || "Escalado",
        }))
        setRosterEntries(formattedRosters)
      }

      const { data: exceptions } = await supabase
        .from("availability_exceptions")
        .select("user_id, service_day_id, specific_date, is_available")
        .gte("specific_date", startStr)
        .lte("specific_date", endStr)

      if (exceptions) setAvailabilityExceptions(exceptions)

      const { data: availabilities } = await supabase
        .from("availability_routine")
        .select("user_id, service_day_id, is_available")

      if (availabilities) setRegularAvailabilities(availabilities)

      const { data: conflicts } = await supabase
        .from("rosters")
        .select("schedule_date, service_day_id, department_members!inner(user_id)")
        .gte("schedule_date", startStr)
        .lte("schedule_date", endStr)

      if (conflicts) {
        setBusyUsers(
          conflicts.map((c) => ({
            user_id: c.department_members?.user_id,
            service_day_id: c.service_day_id,
            schedule_date: c.schedule_date,
          }))
        )
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, currentMonth, allServiceDays])

  useEffect(() => {
    loadStructure()
  }, [loadStructure])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

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

  const handleAddMember = async (memberDbId: string) => {
    if (!selectedCell || !departmentId) return
    setSaving(true)
    try {
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
      setShowMemberSelect(false)
      await loadMonthData()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao escalar membro.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDirectly = async (rosterId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase.from("rosters").delete().eq("id", rosterId)
      if (error) throw error
      setShowMemberSelect(false)
      await loadMonthData()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Erro ao remover da escala.")
    } finally {
      setSaving(false)
    }
  }

  return {
    currentMonth,
    loading,
    gridColumns,
    functions,
    showMemberSelect,
    setShowMemberSelect,
    selectedCell,
    setSelectedCell,
    saving,
    prevMonth,
    nextMonth,
    getRosterInCell,
    getFilteredMembers,
    handleAddMember,
    handleRemoveDirectly,
  }
}
