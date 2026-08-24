"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { DepartmentFunction } from "@/types/department"
import type { DepartmentMemberSetting } from "@/types/department-settings"

interface DepartmentSettingsData {
  functions: DepartmentFunction[]
  members: DepartmentMemberSetting[]
}

async function fetchDepartmentSettingsData(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<DepartmentSettingsData> {
  const [functionsRes, membersRes] = await Promise.all([
    supabase.from("department_functions").select("id, name").eq("department_id", departmentId).order("name"),
    supabase
      .from("department_members")
      .select(
        "id, user_id, profiles!inner(id, full_name, email), member_functions(function_id, department_functions(id, name))"
      )
      .eq("department_id", departmentId),
  ])

  const members = (membersRes.data || []).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    profiles: m.profiles,
    member_functions: m.member_functions || [],
  }))

  return {
    functions: functionsRes.data || [],
    members: members as unknown as DepartmentMemberSetting[],
  }
}

export function useDepartmentSettings(departmentId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ["department-settings", departmentId]

  const { data } = useQuery({
    queryKey,
    queryFn: () => fetchDepartmentSettingsData(supabase, departmentId!),
    enabled: !!departmentId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const [newFunctionName, setNewFunctionName] = useState("")

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    targetId: "",
    loading: false,
  })

  const addFunctionMutation = useMutation({
    mutationFn: async () => {
      if (!newFunctionName.trim() || !departmentId) return
      const { error } = await supabase
        .from("department_functions")
        .insert({ department_id: departmentId, name: newFunctionName.trim() })
      if (error) throw error
    },
    onSuccess: () => {
      setNewFunctionName("")
      invalidate()
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Erro ao adicionar função")
    },
  })

  const deleteFunctionMutation = useMutation({
    mutationFn: async (functionId: string) => {
      const { error } = await supabase.from("department_functions").delete().eq("id", functionId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const toggleMemberFunctionMutation = useMutation({
    mutationFn: async ({
      memberId,
      functionId,
      hasFunction,
    }: {
      memberId: string
      functionId: string
      hasFunction: boolean
    }) => {
      if (hasFunction) {
        const { error } = await supabase
          .from("member_functions")
          .delete()
          .eq("member_id", memberId)
          .eq("function_id", functionId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("member_functions")
          .insert({ member_id: memberId, function_id: functionId })
        if (error) throw error
      }
    },
    onSuccess: invalidate,
  })

  const requestDeleteFunction = (functionId: string, functionName: string) => {
    setConfirmConfig({
      title: "Remover Função",
      message: `Tem certeza que deseja remover a função "${functionName}"? Isso não afetará as escalas já criadas.`,
      targetId: functionId,
      loading: false,
    })
    setConfirmModalVisible(true)
  }

  const executeDeleteFunction = async () => {
    setConfirmConfig((prev) => ({ ...prev, loading: true }))
    try {
      await deleteFunctionMutation.mutateAsync(confirmConfig.targetId)
      setConfirmModalVisible(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Erro ao remover função")
      setConfirmModalVisible(false)
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  return {
    functions: data?.functions ?? [],
    members: data?.members ?? [],
    newFunctionName,
    setNewFunctionName,
    loading: addFunctionMutation.isPending,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    addFunction: () => addFunctionMutation.mutateAsync(),
    requestDeleteFunction,
    executeDeleteFunction,
    toggleMemberFunction: (memberId: string, functionId: string, hasFunction: boolean) =>
      toggleMemberFunctionMutation.mutateAsync({ memberId, functionId, hasFunction }),
  }
}
