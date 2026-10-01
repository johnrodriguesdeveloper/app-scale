"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addMonths,
  endOfMonth,
  format,
  getDate,
  getDay,
  isBefore,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { buildMonthAvailability } from "@/features/availability/buildMonthAvailability"
import { fetchRoutineHistory, getRoutineForMonth } from "@/features/availability/routineHistory"
import { getTargetMonthDate } from "@/utils/getTargetMonthDate"
import type {
  AvailabilityException,
  AvailabilityRoutine,
  AvailabilityRoutineHistoryEntry,
  ExpandedCalendarItem,
} from "@/types/availability"
import type { ServiceDay } from "@/types/schedule"

export const fullDayNames = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
]

interface RoutineData {
  serviceDays: ServiceDay[]
  availability: AvailabilityRoutine[]
}

async function fetchRoutineData(supabase: ReturnType<typeof createClient>): Promise<RoutineData> {
  const { data: serviceData } = await supabase
    .from("service_days")
    .select("*")
    .order("day_of_week", { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { serviceDays: serviceData || [], availability: [] }

  const { data: routineData } = await supabase
    .from("availability_routine")
    .select("*")
    .eq("user_id", user.id)

  return { serviceDays: serviceData || [], availability: routineData || [] }
}

async function fetchMonthExceptions(
  supabase: ReturnType<typeof createClient>,
  currentMonth: Date
): Promise<AvailabilityException[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)

  const { data } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("user_id", user.id)
    .gte("specific_date", start.toISOString())
    .lte("specific_date", end.toISOString())

  return (data as AvailabilityException[]) || []
}

async function fetchOwnRoutineHistory(
  supabase: ReturnType<typeof createClient>
): Promise<AvailabilityRoutineHistoryEntry[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  return fetchRoutineHistory(supabase, [user.id])
}

export function useAvailability() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const minDate = getTargetMonthDate()

  const [currentMonth, setCurrentMonth] = useState(minDate)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})

  const routineKey = ["availability-routine"]
  const historyKey = ["availability-routine-history"]
  const monthKey = ["availability-exceptions", format(currentMonth, "yyyy-MM")]

  const isEditableMonth = !isBefore(startOfMonth(currentMonth), startOfMonth(minDate))

  const { data: routineData, isLoading: routineLoading } = useQuery({
    queryKey: routineKey,
    queryFn: () => fetchRoutineData(supabase),
  })

  // Locked (past) months must show the routine the member had back then, not
  // today's — only fetched once the member navigates to one.
  const { data: routineHistory, isLoading: historyLoading } = useQuery({
    queryKey: historyKey,
    queryFn: () => fetchOwnRoutineHistory(supabase),
    enabled: !isEditableMonth,
  })

  const loading = routineLoading || (!isEditableMonth && historyLoading)

  const { data: monthExceptions = [] } = useQuery({
    queryKey: monthKey,
    queryFn: () => fetchMonthExceptions(supabase, currentMonth),
    enabled: !!routineData && routineData.serviceDays.length > 0,
  })

  const serviceDays = routineData?.serviceDays ?? []
  const liveAvailability = routineData?.availability
  const availability = useMemo<AvailabilityRoutine[]>(
    () =>
      isEditableMonth
        ? (liveAvailability ?? [])
        : getRoutineForMonth(routineHistory ?? [], currentMonth),
    [isEditableMonth, liveAvailability, routineHistory, currentMonth]
  )

  const expandedCalendar = useMemo<ExpandedCalendarItem[]>(
    () => buildMonthAvailability(currentMonth, serviceDays, availability, monthExceptions),
    [availability, monthExceptions, currentMonth, serviceDays]
  )

  const toggleRoutineMutation = useMutation({
    mutationFn: async ({ serviceDayId, value }: { serviceDayId: string; value: boolean }) => {
      const targetService = serviceDays.find((sd) => sd.id === serviceDayId)
      if (!targetService) return

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error: routineError } = await supabase
        .from("availability_routine")
        .upsert(
          { user_id: user.id, service_day_id: serviceDayId, is_available: value },
          { onConflict: "user_id,service_day_id" }
        )
      if (routineError) throw routineError

      const todayStr = format(new Date(), "yyyy-MM-dd")
      const { data: futureExceptions } = await supabase
        .from("availability_exceptions")
        .select("specific_date")
        .eq("user_id", user.id)
        .gte("specific_date", todayStr)

      const datesToDelete = (futureExceptions || [])
        .filter((e) => getDay(parse(e.specific_date, "yyyy-MM-dd", new Date())) === targetService.day_of_week)
        .map((e) => e.specific_date)

      if (datesToDelete.length > 0) {
        await supabase
          .from("availability_exceptions")
          .delete()
          .eq("user_id", user.id)
          .in("specific_date", datesToDelete)
      }
    },
    onMutate: async ({ serviceDayId, value }) => {
      setSaving((prev) => ({ ...prev, [serviceDayId]: true }))

      const targetService = serviceDays.find((sd) => sd.id === serviceDayId)

      queryClient.setQueryData(routineKey, (old?: RoutineData) => {
        if (!old) return old
        const filtered = old.availability.filter((a) => a.service_day_id !== serviceDayId)
        return {
          ...old,
          availability: [...filtered, { user_id: "temp", service_day_id: serviceDayId, is_available: value }],
        }
      })

      if (targetService) {
        queryClient.setQueryData(monthKey, (old?: AvailabilityException[]) =>
          (old || []).filter(
            (e) => getDay(parse(e.specific_date, "yyyy-MM-dd", new Date())) !== targetService.day_of_week
          )
        )
      }
    },
    onError: () => {
      window.alert("Não foi possível sincronizar a rotina.")
      queryClient.invalidateQueries({ queryKey: routineKey })
    },
    onSettled: (_data, _error, { serviceDayId }) => {
      queryClient.invalidateQueries({ queryKey: routineKey })
      queryClient.invalidateQueries({ queryKey: historyKey })
      queryClient.invalidateQueries({ queryKey: ["availability-exceptions"] })
      setSaving((prev) => ({ ...prev, [serviceDayId]: false }))
    },
  })

  const toggleExceptionMutation = useMutation({
    mutationFn: async ({ item, newValue }: { item: ExpandedCalendarItem; newValue: boolean }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const optimisticException: AvailabilityException = {
        user_id: user.id,
        specific_date: item.dateStr,
        service_day_id: item.service.id,
        is_available: newValue,
      }

      const { error } = await supabase.from("availability_exceptions").upsert(optimisticException, {
        onConflict: "user_id,specific_date,service_day_id",
      })

      if (error) throw error
    },
    onMutate: async ({ item, newValue }) => {
      setSaving((prev) => ({ ...prev, [item.key]: true }))

      queryClient.setQueryData(monthKey, (old?: AvailabilityException[]) => {
        const filtered = (old || []).filter(
          (e) => !(e.specific_date === item.dateStr && e.service_day_id === item.service.id)
        )
        return [
          ...filtered,
          {
            user_id: "temp",
            specific_date: item.dateStr,
            service_day_id: item.service.id,
            is_available: newValue,
          },
        ]
      })
    },
    onError: () => {
      window.alert("Não foi possível salvar.")
      queryClient.invalidateQueries({ queryKey: monthKey })
    },
    onSettled: (_data, _error, { item }) => {
      setSaving((prev) => ({ ...prev, [item.key]: false }))
    },
  })

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return {
    currentMonth,
    serviceDays,
    availability,
    expandedCalendar,
    loading,
    saving,
    isEditableMonth,
    dayOfMonth: getDate(new Date()),
    handlePrevMonth,
    handleNextMonth,
    handleToggleException: (item: ExpandedCalendarItem, newValue: boolean) =>
      toggleExceptionMutation.mutate({ item, newValue }),
    handleToggleRoutine: (serviceDayId: string, value: boolean) =>
      toggleRoutineMutation.mutate({ serviceDayId, value }),
  }
}
