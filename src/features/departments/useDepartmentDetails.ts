"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Department, DepartmentFunction, DepartmentMember } from "@/types/department"

interface DepartmentDetailsData {
  department: Department | null
  parentDepartment: Department | null
  subDepartments: Department[]
  members: DepartmentMember[]
  functions: DepartmentFunction[]
  isAdmin: boolean
  isMaster: boolean
  isLeader: boolean
}

async function fetchDepartmentDetails(
  supabase: ReturnType<typeof createClient>,
  id: string
): Promise<DepartmentDetailsData> {
  const empty: DepartmentDetailsData = {
    department: null,
    parentDepartment: null,
    subDepartments: [],
    members: [],
    functions: [],
    isAdmin: false,
    isMaster: false,
    isLeader: false,
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return empty

  const [profileRes, leaderRes, deptRes, membersRes, subDeptsRes, functionsRes] = await Promise.all([
    supabase.from("profiles").select("org_role").eq("user_id", user.id).single(),
    supabase
      .from("department_leaders")
      .select("id")
      .eq("department_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("departments")
      .select("id, name, description, priority_order, availability_deadline_day, parent_id, organization_id")
      .eq("id", id)
      .single(),
    supabase
      .from("department_members")
      .select(
        "id, user_id, dept_role, profiles:user_id(full_name, email, avatar_url), member_functions(department_functions(id, name))"
      )
      .eq("department_id", id),
    supabase
      .from("departments")
      .select("id, name, description, parent_id")
      .eq("parent_id", id)
      .order("name"),
    supabase
      .from("department_functions")
      .select("id, name, description")
      .eq("department_id", id)
      .order("name"),
  ])

  const masterStatus = profileRes.data?.org_role === "master"
  const isAdmin = profileRes.data?.org_role === "admin" || masterStatus

  let parentDepartment: Department | null = null
  if (deptRes.data?.parent_id) {
    const { data } = await supabase
      .from("departments")
      .select("id, name")
      .eq("id", deptRes.data.parent_id)
      .single()
    parentDepartment = data
  }

  return {
    department: deptRes.data,
    parentDepartment,
    subDepartments: subDeptsRes.data || [],
    members: (membersRes.data as unknown as DepartmentMember[]) || [],
    functions: functionsRes.data || [],
    isAdmin,
    isMaster: masterStatus,
    isLeader: !!leaderRes.data,
  }
}

export function useDepartmentDetails(id: string | undefined) {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const queryKey = ["department-details", id]

  const { data, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchDepartmentDetails(supabase, id!),
    enabled: !!id,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await supabase.from("rosters").delete().eq("member_id", memberId)
      await supabase.from("department_members").delete().eq("id", memberId)
    },
    onSuccess: invalidate,
  })

  const deleteSubDepartmentMutation = useMutation({
    mutationFn: async (subDeptId: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", subDeptId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteFunctionMutation = useMutation({
    mutationFn: async (funcId: string) => {
      const { error } = await supabase.from("department_functions").delete().eq("id", funcId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const createFunctionMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim() || !id) throw new Error("Nome inválido")
      const { error } = await supabase
        .from("department_functions")
        .insert({ department_id: id, name: name.trim() })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const createSubDepartmentMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!name.trim() || !id || !data?.department) throw new Error("Nome inválido")
      const { error } = await supabase.from("departments").insert({
        name: name.trim(),
        parent_id: id,
        organization_id: data.department.organization_id!,
        availability_deadline_day: data.department.availability_deadline_day || 20,
        priority_order: 99,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const handleBack = () => {
    if (data?.department?.parent_id) {
      router.push(`/departments/${data.department.parent_id}`)
    } else {
      router.push("/departments")
    }
  }

  return {
    department: data?.department ?? null,
    parentDepartment: data?.parentDepartment ?? null,
    subDepartments: data?.subDepartments ?? [],
    members: data?.members ?? [],
    functions: data?.functions ?? [],
    isAdmin: data?.isAdmin ?? false,
    isMaster: data?.isMaster ?? false,
    isLeader: data?.isLeader ?? false,
    loading,
    handleBack,
    removeMember: (memberId: string) => removeMemberMutation.mutateAsync(memberId),
    deleteSubDepartment: (subDeptId: string) => deleteSubDepartmentMutation.mutateAsync(subDeptId),
    deleteFunction: (funcId: string) => deleteFunctionMutation.mutateAsync(funcId),
    createFunction: (name: string) => createFunctionMutation.mutateAsync(name),
    createSubDepartment: (name: string) => createSubDepartmentMutation.mutateAsync(name),
  }
}
