"use client"

import { useCallback, useEffect, useState } from "react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // matchMedia/navigator aren't available during SSR, so the real values can
  // only be known after mount; both start false to match the server render.
  const [{ isStandalone, isIOS }, setEnvironment] = useState({ isStandalone: false, isIOS: false })

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser APIs unavailable during SSR, not a sync-on-every-render call
    setEnvironment({
      isStandalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window),
    })

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
      setEnvironment((prev) => ({ ...prev, isStandalone: true }))
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  return {
    canInstall: deferredPrompt !== null,
    isIOS,
    isStandalone,
    promptInstall,
  }
}
