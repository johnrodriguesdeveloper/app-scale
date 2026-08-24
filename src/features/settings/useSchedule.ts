"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { ServiceDay } from "@/types/schedule"

export function useSchedule() {
  const supabase = createClient()

  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadServiceDays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadServiceDays = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("service_days")
      .select("*")
      .order("day_of_week", { ascending: true })

    if (!error && data) {
      setServiceDays(data)
    }
    setLoading(false)
  }

  const saveServiceDay = async (dayOfWeek: number, name: string, editingId?: string) => {
    if (!name.trim()) throw new Error("Digite o nome do evento")

    if (editingId) {
      const { error } = await supabase
        .from("service_days")
        .update({ day_of_week: dayOfWeek, name: name.trim() })
        .eq("id", editingId)

      if (error) throw new Error("Não foi possível atualizar o evento")
    } else {
      const { error } = await supabase
        .from("service_days")
        .insert({ day_of_week: dayOfWeek, name: name.trim() })

      if (error) throw new Error("Não foi possível adicionar o evento")
    }

    await loadServiceDays()
  }

  const deleteServiceDay = async (id: string) => {
    const { error } = await supabase.from("service_days").delete().eq("id", id)

    if (error) throw new Error("Não foi possível excluir o evento")
    await loadServiceDays()
  }

  return {
    serviceDays,
    loading,
    saveServiceDay,
    deleteServiceDay,
  }
}
