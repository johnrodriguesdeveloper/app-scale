"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { FeedbackModalProps } from "@/types/ui"

export function useForgotPassword() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, "onClose">>({
    visible: false,
    type: "success",
    title: "",
    message: "",
  })

  const showModal = (type: "success" | "error", title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message })
  }

  const handleCloseModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }))
    if (modalConfig.type === "success") {
      router.replace("/login")
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      showModal("error", "Atenção", "Por favor, digite seu email.")
      return
    }

    setLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/update-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      showModal(
        "success",
        "Email Enviado!",
        "Verifique sua caixa de entrada (e o spam) para redefinir sua senha."
      )
    } catch (error) {
      showModal(
        "error",
        "Erro",
        error instanceof Error ? error.message : "Não foi possível enviar o email."
      )
    } finally {
      setLoading(false)
    }
  }

  return {
    email,
    setEmail,
    loading,
    modalConfig,
    handleResetPassword,
    handleCloseModal,
  }
}
