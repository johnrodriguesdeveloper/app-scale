"use client"

import { useState } from "react"
import { Download, Share, SquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { useInstallPrompt } from "@/features/pwa/useInstallPrompt"

export function InstallAppButton({ className }: { className?: string }) {
  const { canInstall, isIOS, isStandalone, promptInstall } = useInstallPrompt()
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  if (isStandalone || (!canInstall && !isIOS)) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={canInstall ? promptInstall : () => setShowIOSInstructions(true)}
      >
        <Download />
        Instalar app
      </Button>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Instalar o Escala Verbo</DialogTitle>
          <DialogDescription asChild>
            <ol className="flex flex-col gap-3 pt-2 text-left text-sm text-foreground">
              <li className="flex items-center gap-3">
                <Share className="size-5 shrink-0 text-primary" />
                Toque em <strong>Compartilhar</strong> na barra do Safari.
              </li>
              <li className="flex items-center gap-3">
                <SquarePlus className="size-5 shrink-0 text-primary" />
                Selecione <strong>Adicionar à Tela de Início</strong>.
              </li>
            </ol>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}
