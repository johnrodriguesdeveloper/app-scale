"use client"

import Link from "next/link"
import { ChevronRight, LogOut, Moon, Sun, User } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { useSettings } from "@/features/settings/useSettings"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { isDark, handleToggleTheme, handleSignOut, openPortfolio } = useSettings()

  return (
    <div>
      <div className="border-b border-border bg-card px-6 py-7">
        <h1 className="text-xl font-bold">Configurações</h1>
      </div>

      <div className="p-4">
        <p className="mb-3 mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Aparência
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  isDark ? "bg-secondary/10" : "bg-warning/10"
                )}
              >
                {isDark ? (
                  <Moon className="size-5 text-secondary" />
                ) : (
                  <Sun className="size-5 text-warning" />
                )}
              </div>
              <div>
                <p className="text-lg font-semibold">Modo Escuro</p>
                <p className="text-xs text-muted-foreground">{isDark ? "Default" : "Light"}</p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={handleToggleTheme} />
          </div>
        </div>

        <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Conta
        </p>
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <Link
            href="/profile"
            className="flex items-center justify-between border-b border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                <User className="size-[18px] text-primary" />
              </div>
              <span className="font-medium">Editar Perfil</span>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>

          <button onClick={handleSignOut} className="flex w-full items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
                <LogOut className="size-[18px] text-destructive" />
              </div>
              <span className="font-medium text-destructive">Sair do App</span>
            </div>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-end px-6 pb-8">
        <p className="mb-1 text-xs text-muted-foreground">Versão 1.0.0</p>
        <button onClick={openPortfolio}>
          <span className="text-xs text-muted-foreground">
            Developed by <span className="font-bold text-primary">John Rodrigues</span>
          </span>
        </button>
      </div>
    </div>
  )
}
