"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Department } from "@/types/department"

interface DepartmentsData {
  departments: Department[]
  isAdmin: boolean
  isMaster: boolean
  isLeader: Record<string, boolean>
}

async function fetchDepartments(supabase: ReturnType<typeof createClient>): Promise<DepartmentsData> {
  const empty: DepartmentsData = { departments: [], isAdmin: false, isMaster: false, isLeader: {} }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, org_role")
    .eq("user_id", user.id)
    .single()

  if (!profile) return empty

  const masterStatus = profile.org_role === "master"
  const adminStatus = profile.org_role === "admin" || masterStatus

  let deptsData: Department[] = []

  if (adminStatus) {
    const { data } = await supabase
      .from("departments")
      .select("id, name, description")
      .eq("organization_id", profile.organization_id!)
      .is("parent_id", null)
      .order("priority_order", { ascending: false })
    deptsData = data || []
  } else {
    const { data } = await supabase
      .from("departments")
      .select("id, name, description, department_members!inner(user_id)")
      .eq("department_members.user_id", user.id)
      .order("name")
    deptsData = data || []
  }

  const { data: deptMembers } = await supabase
    .from("department_members")
    .select("department_id")
    .eq("user_id", user.id)
    .eq("dept_role", "leader")

  const leaderMap: Record<string, boolean> = {}
  deptMembers?.forEach((dm) => {
    leaderMap[dm.department_id] = true
  })

  return { departments: deptsData, isAdmin: adminStatus, isMaster: masterStatus, isLeader: leaderMap }
}

export function useDepartments() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetchDepartments(supabase),
  })

  const deleteMutation = useMutation({
    mutationFn: async (departmentId: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", departmentId)
      if (error) throw new Error("Verifique se há membros ou escalas vinculadas antes de excluir.")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] })
    },
  })

  return {
    departments: data?.departments ?? [],
    loading,
    isAdmin: data?.isAdmin ?? false,
    isMaster: data?.isMaster ?? false,
    isLeader: data?.isLeader ?? {},
    deleteDepartment: (departmentId: string) => deleteMutation.mutateAsync(departmentId),
  }
}
