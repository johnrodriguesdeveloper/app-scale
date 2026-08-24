"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { FeedbackModalProps } from "@/types/ui"

interface CreateDepartmentContext {
  organizationId: string | null
  isMaster: boolean
}

async function fetchContext(supabase: ReturnType<typeof createClient>): Promise<CreateDepartmentContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { organizationId: null, isMaster: false }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, org_role")
    .eq("user_id", user.id)
    .single()

  return {
    organizationId: profile?.organization_id ?? null,
    isMaster: profile?.org_role === "master",
  }
}

export function useCreateDepartment() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState("")
  const [priority, setPriority] = useState("")
  const [deadlineDay, setDeadlineDay] = useState("")

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, "onClose">>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  })

  const { data: context } = useQuery({
    queryKey: ["create-department-context"],
    queryFn: () => fetchContext(supabase),
  })

  const organizationId = context?.organizationId ?? null
  const isMaster = context?.isMaster ?? false

  const showModal = (type: "success" | "error", title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message })
  }

  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }))
    if (modalConfig.type === "success") {
      router.replace("/departments")
      router.refresh()
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const priorityNum = parseInt(priority)
      const deadlineNum = parseInt(deadlineDay)

      const { error } = await supabase.from("departments").insert({
        organization_id: organizationId!,
        name: name.trim(),
        priority_order: priorityNum,
        availability_deadline_day: deadlineNum,
      })

      if (error) throw error
    },
    onSuccess: () => {
      showModal("success", "Sucesso!", "Departamento criado com sucesso.")
    },
    onError: (error) => {
      showModal(
        "error",
        "Erro ao Criar",
        error instanceof Error ? error.message : "Ocorreu um erro inesperado."
      )
    },
  })

  const handleSave = () => {
    if (!name.trim())
      return showModal("error", "Campo Obrigatório", "Por favor, preencha o nome do departamento.")

    const priorityNum = parseInt(priority)
    if (isNaN(priorityNum) || priorityNum < 1)
      return showModal("error", "Prioridade Inválida", "A prioridade deve ser um número (ex: 1, 2, 3).")

    const deadlineNum = parseInt(deadlineDay)
    if (isNaN(deadlineNum) || deadlineNum < 1 || deadlineNum > 31)
      return showModal("error", "Data Inválida", "O dia limite deve ser entre 1 e 31.")

    if (!organizationId) return showModal("error", "Erro", "Organização não encontrada.")
    if (!isMaster)
      return showModal("error", "Permissão Negada", "Apenas usuários Master podem criar departamentos.")

    saveMutation.mutate()
  }

  return {
    name,
    setName,
    priority,
    setPriority,
    deadlineDay,
    setDeadlineDay,
    loading: saveMutation.isPending,
    modalConfig,
    handleSave,
    handleCloseModal,
  }
}
