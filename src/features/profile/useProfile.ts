"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { FeedbackModalProps } from "@/types/ui"
import type { UserProfile } from "@/types/profile"

const queryKey = ["profile"]

async function fetchProfile(supabase: ReturnType<typeof createClient>): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone, birth_date")
    .eq("user_id", user.id)
    .single()

  if (error) throw error
  return data
}

export function useProfile() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: profile, isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchProfile(supabase),
  })

  const [editingName, setEditingName] = useState("")
  const [editingPhone, setEditingPhone] = useState("")
  const [editingBirthDate, setEditingBirthDate] = useState("")
  const initialized = useRef(false)

  useEffect(() => {
    if (!profile || initialized.current) return
    initialized.current = true

    setEditingName(profile.full_name || "")
    setEditingPhone(profile.phone || "")

    if (profile.birth_date) {
      const [year, month, day] = profile.birth_date.split("-")
      setEditingBirthDate(`${day}/${month}/${year}`)
    }
  }, [profile])

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, "onClose">>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  })

  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "")
    if (cleaned.length >= 8) cleaned = cleaned.substring(0, 8)
    let formatted = cleaned
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
    if (cleaned.length > 4)
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`
    setEditingBirthDate(formatted)
  }

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "")
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11)
    let formatted = cleaned
    if (cleaned.length > 2) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    if (cleaned.length > 7)
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    setEditingPhone(formatted)
  }

  const showModal = (type: "success" | "error", title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message })
  }

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      let isoDate: string | null = null
      if (editingBirthDate.length === 10) {
        const [day, month, year] = editingBirthDate.split("/")
        isoDate = `${year}-${month}-${day}`
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editingName.trim(),
          phone: editingPhone.trim(),
          birth_date: isoDate,
        })
        .eq("user_id", user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      showModal("success", "Sucesso!", "Seus dados foram atualizados com sucesso.")
    },
    onError: (error) => {
      showModal(
        "error",
        "Erro",
        error instanceof Error ? error.message : "Falha ao salvar as alterações."
      )
    },
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return {
    profile,
    loading,
    saving: saveMutation.isPending,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile: () => saveMutation.mutateAsync(),
    handleLogout,
    getInitials,
    closeModal,
  }
}
