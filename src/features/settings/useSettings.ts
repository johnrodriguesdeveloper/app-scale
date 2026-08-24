"use client"

import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useSettings() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()

  const isDark = theme === "dark"

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  const openPortfolio = () => {
    window.open("https://johnrodrigues.xyz", "_blank")
  }

  const handleToggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return {
    isDark,
    handleToggleTheme,
    handleSignOut,
    openPortfolio,
  }
}
