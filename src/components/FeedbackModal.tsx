"use client"

import { AlertTriangle, CheckCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FeedbackModalProps } from "@/types/ui"

export function FeedbackModal({ visible, type, title, message, onClose }: FeedbackModalProps) {
  const isSuccess = type === "success"

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-4 flex h-14 w-14 items-center justify-center rounded-full",
              isSuccess
                ? "bg-success/10 dark:bg-success/20"
                : "bg-destructive/10 dark:bg-destructive/20"
            )}
          >
            {isSuccess ? (
              <CheckCircle className="size-8 text-success" />
            ) : (
              <AlertTriangle className="size-8 text-destructive" />
            )}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="px-2">{message}</DialogDescription>
        </div>
        <Button
          size="lg"
          onClick={onClose}
          className={cn("w-full", isSuccess ? "bg-success hover:bg-success/90" : "")}
          variant={isSuccess ? "default" : "destructive"}
        >
          {isSuccess ? "Continuar" : "Tentar Novamente"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
