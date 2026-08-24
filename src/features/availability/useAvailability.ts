"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDate,
  getDay,
  isSameDay,
  parse,
  startOfMonth,
  subMonths,
} from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { getTargetMonthDate } from "@/utils/getTargetMonthDate"
import type { AvailabilityException, AvailabilityRoutine, ExpandedCalendarItem } from "@/types/availability"
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

export function useAvailability() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const minDate = getTargetMonthDate()

  const [currentMonth, setCurrentMonth] = useState(minDate)
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({})

  const routineKey = ["availability-routine"]
  const monthKey = ["availability-exceptions", format(currentMonth, "yyyy-MM")]

  const { data: routineData, isLoading: loading } = useQuery({
    queryKey: routineKey,
    queryFn: () => fetchRoutineData(supabase),
  })

  const { data: monthExceptions = [] } = useQuery({
    queryKey: monthKey,
    queryFn: () => fetchMonthExceptions(supabase, currentMonth),
    enabled: !!routineData && routineData.serviceDays.length > 0,
  })

  const serviceDays = routineData?.serviceDays ?? []
  const availability = routineData?.availability ?? []

  const expandedCalendar = useMemo<ExpandedCalendarItem[]>(() => {
    if (serviceDays.length === 0) return []

    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const daysInterval = eachDayOfInterval({ start, end })
    const calendarItems: ExpandedCalendarItem[] = []

    daysInterval.forEach((date) => {
      const dayOfWeek = getDay(date)
      const daysServices = serviceDays.filter((s) => s.day_of_week === dayOfWeek)

      daysServices.forEach((service) => {
        const routine = availability.find((r) => r.service_day_id === service.id)
        const isRoutineAvailable = routine ? routine.is_available !== false : true

        const dateStr = format(date, "yyyy-MM-dd")
        const exception = monthExceptions.find(
          (e) => e.specific_date === dateStr && (e.service_day_id === service.id || e.service_day_id === null)
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
  }, [availability, monthExceptions, currentMonth, serviceDays])

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
    isAtMinDate: isSameDay(startOfMonth(currentMonth), minDate),
    dayOfMonth: getDate(new Date()),
    handlePrevMonth,
    handleNextMonth,
    handleToggleException: (item: ExpandedCalendarItem, newValue: boolean) =>
      toggleExceptionMutation.mutate({ item, newValue }),
    handleToggleRoutine: (serviceDayId: string, value: boolean) =>
      toggleRoutineMutation.mutate({ serviceDayId, value }),
  }
}
