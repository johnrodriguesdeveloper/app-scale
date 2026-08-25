"use client"

import { Bell, ChevronRight } from "lucide-react"
import { usePushSubscription } from "@/features/pwa/usePushSubscription"

export function NotificationShortcut() {
  const { isSupported, isSubscribed, loading, subscribe } = usePushSubscription()

  if (!isSupported || isSubscribed) return null

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="flex items-center rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
    >
      <div className="mr-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
        <Bell className="size-6 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xl font-bold">Ativar Notificações</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Receba lembretes de escala e disponibilidade
        </p>
      </div>
      <ChevronRight className="size-5 text-muted-foreground" />
    </button>
  )
}
