"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { DepartmentFunction } from "@/types/department"
import type { DepartmentMemberSetting } from "@/types/department-settings"

export function useDepartmentSettings(departmentId: string | undefined) {
  const supabase = createClient()

  const [functions, setFunctions] = useState<DepartmentFunction[]>([])
  const [members, setMembers] = useState<DepartmentMemberSetting[]>([])
  const [newFunctionName, setNewFunctionName] = useState("")
  const [loading, setLoading] = useState(false)

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    targetId: "",
    loading: false,
  })

  const loadFunctions = useCallback(async () => {
    if (!departmentId) return
    const { data } = await supabase
      .from("department_functions")
      .select("id, name")
      .eq("department_id", departmentId)
      .order("name")

    if (data) setFunctions(data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  const loadMembers = useCallback(async () => {
    if (!departmentId) return
    const { data } = await supabase
      .from("department_members")
      .select(
        "id, user_id, profiles!inner(id, full_name, email), member_functions(function_id, department_functions(id, name))"
      )
      .eq("department_id", departmentId)

    if (data) {
      const formattedMembers = data.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        profiles: m.profiles,
        member_functions: m.member_functions || [],
      }))
      setMembers(formattedMembers as unknown as DepartmentMemberSetting[])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  useEffect(() => {
    loadFunctions()
    loadMembers()
  }, [loadFunctions, loadMembers])

  const addFunction = async () => {
    if (!newFunctionName.trim() || !departmentId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("department_functions")
        .insert({ department_id: departmentId, name: newFunctionName.trim() })
        .select()
        .single()

      if (error) throw error
      setFunctions((prev) => [...prev, data])
      setNewFunctionName("")
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Erro ao adicionar função")
    } finally {
      setLoading(false)
    }
  }

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
      const { error } = await supabase
        .from("department_functions")
        .delete()
        .eq("id", confirmConfig.targetId)

      if (error) throw error
      setFunctions((prev) => prev.filter((f) => f.id !== confirmConfig.targetId))
      await loadMembers()
      setConfirmModalVisible(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Erro ao remover função")
      setConfirmModalVisible(false)
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  // memberId here refers to the department_members.id (the FK member_functions.member_id expects) -
  // callers must pass member.id, not member.user_id.
  const toggleMemberFunction = async (memberId: string, functionId: string, hasFunction: boolean) => {
    try {
      if (hasFunction) {
        const { error } = await supabase
          .from("member_functions")
          .delete()
          .eq("member_id", memberId)
          .eq("function_id", functionId)
        if (!error) await loadMembers()
      } else {
        const { error } = await supabase
          .from("member_functions")
          .insert({ member_id: memberId, function_id: functionId })
        if (!error) await loadMembers()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return {
    functions,
    members,
    newFunctionName,
    setNewFunctionName,
    loading,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    addFunction,
    requestDeleteFunction,
    executeDeleteFunction,
    toggleMemberFunction,
  }
}
