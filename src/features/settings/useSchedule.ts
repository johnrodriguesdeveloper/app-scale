"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { ServiceDay } from "@/types/schedule"

const queryKey = ["service-days"]

export function useSchedule() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: serviceDays = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_days")
        .select("*")
        .order("day_of_week", { ascending: true })
      if (error) throw error
      return data as ServiceDay[]
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const saveMutation = useMutation({
    mutationFn: async ({
      dayOfWeek,
      name,
      editingId,
    }: {
      dayOfWeek: number
      name: string
      editingId?: string
    }) => {
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
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_days").delete().eq("id", id)
      if (error) throw new Error("Não foi possível excluir o evento")
    },
    onSuccess: invalidate,
  })

  return {
    serviceDays,
    loading,
    saveServiceDay: (dayOfWeek: number, name: string, editingId?: string) =>
      saveMutation.mutateAsync({ dayOfWeek, name, editingId }),
    deleteServiceDay: (id: string) => deleteMutation.mutateAsync(id),
  }
}
