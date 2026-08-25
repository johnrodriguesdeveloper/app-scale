"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { isLeaderOfDepartmentChain } from "@/features/departments/departmentLeadership"
import type { DepartmentFunction, DepartmentMember, Profile } from "@/types/department"

interface MemberListData {
  members: DepartmentMember[]
  departmentLeaders: string[]
  availableFunctions: DepartmentFunction[]
  canEdit: boolean
}

async function fetchMemberListData(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<MemberListData> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profileRes, leadersRes, membersRes, functionsRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("org_role").eq("user_id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("department_leaders").select("user_id").eq("department_id", departmentId),
    supabase
      .from("department_members")
      .select(
        "id, user_id, dept_role, profiles(full_name, avatar_url, email), member_functions(department_functions(id, name))"
      )
      .eq("department_id", departmentId),
    supabase.from("department_functions").select("id, name").eq("department_id", departmentId).order("name"),
  ])

  const isGlobalAdmin = profileRes.data?.org_role === "admin" || profileRes.data?.org_role === "master"
  const isLeader = user && !isGlobalAdmin ? await isLeaderOfDepartmentChain(supabase, user.id, departmentId) : false
  const leaderIds = leadersRes.data?.map((l) => l.user_id) || []

  const members = ((membersRes.data as unknown as DepartmentMember[]) || []).sort((a, b) => {
    const aIsLeader = leaderIds.includes(a.user_id)
    const bIsLeader = leaderIds.includes(b.user_id)
    if (aIsLeader && !bIsLeader) return -1
    if (!aIsLeader && bIsLeader) return 1
    return (a.profiles?.full_name || "").localeCompare(b.profiles?.full_name || "")
  })

  return {
    members,
    departmentLeaders: leaderIds,
    availableFunctions: functionsRes.data || [],
    canEdit: isGlobalAdmin || isLeader,
  }
}

async function fetchAvailableProfiles(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<Profile[]> {
  const { data: allProfiles } = await supabase.from("profiles").select("id, full_name, email").order("full_name")
  const { data: existing } = await supabase
    .from("department_members")
    .select("user_id")
    .eq("department_id", departmentId)
  const existingIds = existing?.map((m) => m.user_id) || []
  return (allProfiles || []).filter((p) => !existingIds.includes(p.id)) as Profile[]
}

export function useMemberList(departmentId: string | undefined) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ["member-list", departmentId]

  const { data, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchMemberListData(supabase, departmentId!),
    enabled: !!departmentId,
  })

  const { data: availableProfiles = [], refetch: refetchAvailableProfiles } = useQuery({
    queryKey: ["available-profiles", departmentId],
    queryFn: () => fetchAvailableProfiles(supabase, departmentId!),
    enabled: false,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, functionIds }: { userId: string; functionIds: string[] }) => {
      const { data: newMember, error: memError } = await supabase
        .from("department_members")
        .insert({ department_id: departmentId!, user_id: userId, dept_role: "member" })
        .select()
        .single()

      if (memError) throw new Error(memError.message)

      if (functionIds.length > 0) {
        const functionsToInsert = functionIds.map((funcId) => ({
          member_id: newMember.id as string,
          function_id: funcId,
        }))

        const { error: funcError } = await supabase.from("member_functions").insert(functionsToInsert)
        if (funcError) throw new Error(funcError.message)
      }
    },
    onSuccess: invalidate,
  })

  const addFunctionsToMemberMutation = useMutation({
    mutationFn: async ({ memberId, functionIds }: { memberId: string; functionIds: string[] }) => {
      if (functionIds.length === 0) return

      const functionsToInsert = functionIds.map((funcId) => ({
        member_id: memberId,
        function_id: funcId,
      }))

      const { error } = await supabase.from("member_functions").insert(functionsToInsert)

      if (error) {
        if (error.code === "23505") throw new Error("O membro já possui uma das funções selecionadas.")
        throw new Error(error.message)
      }
    },
    onSuccess: invalidate,
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await supabase.from("rosters").delete().eq("member_id", memberId)
      await supabase.from("member_functions").delete().eq("member_id", memberId)
      await supabase.from("department_members").delete().eq("id", memberId)
    },
    onSuccess: invalidate,
  })

  const removeFunctionFromMemberMutation = useMutation({
    mutationFn: async ({ memberId, functionId }: { memberId: string; functionId: string }) => {
      await supabase
        .from("member_functions")
        .delete()
        .eq("member_id", memberId)
        .eq("function_id", functionId)
    },
    onSuccess: invalidate,
  })

  return {
    members: data?.members ?? [],
    departmentLeaders: data?.departmentLeaders ?? [],
    loading,
    canEdit: data?.canEdit ?? false,
    availableProfiles,
    availableFunctions: data?.availableFunctions ?? [],
    loadAvailableProfiles: () => refetchAvailableProfiles(),
    addMember: (userId: string, functionIds: string[]) =>
      addMemberMutation.mutateAsync({ userId, functionIds }),
    addFunctionsToMember: (memberId: string, functionIds: string[]) =>
      addFunctionsToMemberMutation.mutateAsync({ memberId, functionIds }),
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    removeFunctionFromMember: (memberId: string, functionId: string) =>
      removeFunctionFromMemberMutation.mutateAsync({ memberId, functionId }),
  }
}
