"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { DepartmentLeader, LeaderSearchResult } from "@/types/department-leaders"

interface LeadersData {
  leaders: DepartmentLeader[]
  currentOrgId: string | null
}

async function fetchLeadersData(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<LeadersData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profileRes, leadersRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("organization_id").eq("user_id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("department_leaders")
      .select("id, user_id, profiles:user_id(id, full_name, email, avatar_url)")
      .eq("department_id", departmentId)
      .order("created_at", { ascending: false }),
  ])

  return {
    leaders: (leadersRes.data as unknown as DepartmentLeader[]) || [],
    currentOrgId: profileRes.data?.organization_id ?? null,
  }
}

export function useDepartmentLeaders(departmentId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ["department-leaders", departmentId]

  const [searchText, setSearchText] = useState("")

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    targetId: "",
    loading: false,
  })

  const { data, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchLeadersData(supabase, departmentId!),
    enabled: !!departmentId,
  })

  const leaders = data?.leaders ?? []
  const currentOrgId = data?.currentOrgId ?? null

  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ["leader-search", currentOrgId, searchText],
    queryFn: async (): Promise<LeaderSearchResult[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("organization_id", currentOrgId!)
        .ilike("full_name", `%${searchText}%`)
        .neq("org_role", "master")
        .limit(10)

      if (error) throw error

      const leaderUserIds = leaders.map((leader) => leader.user_id)
      return ((data || []) as unknown as LeaderSearchResult[]).filter(
        (u) => !leaderUserIds.includes(u.id)
      )
    },
    enabled: searchText.length >= 3 && !!currentOrgId,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const addLeaderMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("department_leaders").insert({
        department_id: departmentId!,
        user_id: userId,
      })

      if (error) {
        if (error.code === "23505") throw new Error("Este usuário já é líder deste departamento.")
        throw error
      }
    },
    onSuccess: () => {
      setSearchText("")
      invalidate()
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Não foi possível adicionar o líder.")
    },
  })

  const removeLeaderMutation = useMutation({
    mutationFn: async (leaderId: string) => {
      const { error } = await supabase.from("department_leaders").delete().eq("id", leaderId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const requestRemoveLeader = (leaderId: string, userName: string) => {
    setConfirmConfig({
      title: "Remover Líder",
      message: `Tem certeza que deseja remover ${userName} como líder deste departamento?`,
      targetId: leaderId,
      loading: false,
    })
    setConfirmModalVisible(true)
  }

  const executeRemoveLeader = async () => {
    setConfirmConfig((prev) => ({ ...prev, loading: true }))
    try {
      await removeLeaderMutation.mutateAsync(confirmConfig.targetId)
      setConfirmModalVisible(false)
    } catch {
      window.alert("Não foi possível remover o líder.")
      setConfirmModalVisible(false)
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  return {
    leaders,
    searchResults,
    searchText,
    loading,
    searching,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    searchUsers: (text: string) => setSearchText(text),
    handleAddLeader: (userId: string) => addLeaderMutation.mutateAsync(userId),
    requestRemoveLeader,
    executeRemoveLeader,
  }
}
