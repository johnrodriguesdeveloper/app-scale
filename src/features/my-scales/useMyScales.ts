"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format, startOfDay } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import type { Scale, TeamMember } from "@/types/my-scales"

async function fetchMyScales(supabase: ReturnType<typeof createClient>): Promise<Scale[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: memberData } = await supabase
    .from("department_members")
    .select("id")
    .eq("user_id", user.id)

  if (!memberData || memberData.length === 0) return []

  const memberIds = memberData.map((m) => m.id).filter((id): id is string => !!id)
  const today = format(startOfDay(new Date()), "yyyy-MM-dd")

  const { data: scaleData } = await supabase
    .from("rosters")
    .select(
      "id, schedule_date, department_id, service_day_id, department_functions(name), departments(name), service_days(name)"
    )
    .in("member_id", memberIds)
    .gte("schedule_date", today)
    .order("schedule_date", { ascending: true })

  return (scaleData as unknown as Scale[]) || []
}

async function fetchScaleTeam(
  supabase: ReturnType<typeof createClient>,
  scale: Scale
): Promise<TeamMember[]> {
  const { data } = await supabase
    .from("rosters")
    .select("id, department_functions(name), department_members(profiles(full_name, phone))")
    .eq("department_id", scale.department_id)
    .eq("schedule_date", scale.schedule_date)
    .eq("service_day_id", scale.service_day_id ?? "")

  if (!data) return []

  const team: TeamMember[] = data.map((item) => ({
    id: item.id,
    function_name: item.department_functions?.name || "Sem função",
    member_name: item.department_members?.profiles?.full_name || "Usuário",
    member_phone: item.department_members?.profiles?.phone || null,
  }))

  team.sort((a, b) => a.function_name.localeCompare(b.function_name))
  return team
}

export function useMyScales() {
  const supabase = createClient()

  const [modalVisible, setModalVisible] = useState(false)
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null)

  const { data: scales = [], isLoading: loading } = useQuery({
    queryKey: ["my-scales"],
    queryFn: () => fetchMyScales(supabase),
  })

  const { data: teamMembers = [], isFetching: loadingTeam } = useQuery({
    queryKey: [
      "scale-team",
      selectedScale?.department_id,
      selectedScale?.schedule_date,
      selectedScale?.service_day_id,
    ],
    queryFn: () => fetchScaleTeam(supabase, selectedScale!),
    enabled: modalVisible && !!selectedScale,
  })

  const handleOpenScaleDetails = (scale: Scale) => {
    setSelectedScale(scale)
    setModalVisible(true)
  }

  const handleOpenWhatsApp = (phone: string | null, name: string) => {
    if (!phone) return
    const cleanNumber = phone.replace(/\D/g, "")
    const message = `Olá ${name}, vi que estamos escalados juntos!`
    window.open(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`, "_blank")
  }

  return {
    scales,
    loading,
    modalVisible,
    setModalVisible,
    selectedScale,
    teamMembers,
    loadingTeam,
    handleOpenScaleDetails,
    handleOpenWhatsApp,
  }
}
