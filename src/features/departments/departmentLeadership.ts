import { createClient } from "@/lib/supabase/client"

async function getParentId(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<string | null> {
  const { data } = await supabase.from("departments").select("parent_id").eq("id", departmentId).single()
  return data?.parent_id ?? null
}

async function getDepartmentAncestorIds(
  supabase: ReturnType<typeof createClient>,
  departmentId: string
): Promise<string[]> {
  const ids = [departmentId]
  let currentId = departmentId

  for (let depth = 0; depth < 20; depth++) {
    const parentId = await getParentId(supabase, currentId)
    if (!parentId) break
    ids.push(parentId)
    currentId = parentId
  }

  return ids
}

export async function getDepartmentSubtreeIds(
  supabase: ReturnType<typeof createClient>,
  rootId: string
): Promise<string[]> {
  const ids = [rootId]
  let frontier = [rootId]

  for (let depth = 0; depth < 20 && frontier.length > 0; depth++) {
    const { data } = await supabase.from("departments").select("id").in("parent_id", frontier)
    const children = (data ?? []).map((d) => d.id as string)
    if (children.length === 0) break
    ids.push(...children)
    frontier = children
  }

  return ids
}

export async function isLeaderOfDepartmentChain(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  departmentId: string
): Promise<boolean> {
  const ids = await getDepartmentAncestorIds(supabase, departmentId)

  const { data } = await supabase
    .from("department_leaders")
    .select("id")
    .eq("user_id", userId)
    .in("department_id", ids)
    .limit(1)

  return !!data && data.length > 0
}
