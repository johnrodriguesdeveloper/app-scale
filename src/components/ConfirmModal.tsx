"use client"

import { AlertTriangle, Loader2, Shield } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConfirmModalProps } from "@/types/ui"

export function ConfirmModal({
  visible,
  title,
  message,
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AlertDialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div
            className={cn(
              "mb-3 flex h-12 w-12 items-center justify-center rounded-full",
              isDestructive
                ? "bg-destructive/10 dark:bg-destructive/20"
                : "bg-primary/10 dark:bg-primary/20"
            )}
          >
            {isDestructive ? (
              <AlertTriangle className="size-6 text-destructive" />
            ) : (
              <Shield className="size-6 text-primary" />
            )}
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </div>
        <AlertDialogFooter className="!grid grid-cols-2">
          <Button variant="outline" disabled={loading} onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isDestructive ? (
              "Excluir"
            ) : (
              "Confirmar"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
