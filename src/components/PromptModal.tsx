"use client"

import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { PromptModalProps } from "@/types/ui"

export function PromptModal({
  visible,
  title,
  label,
  placeholder,
  value,
  onChangeText,
  loading = false,
  onConfirm,
  onCancel,
  confirmButtonColor,
}: PromptModalProps) {
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <div>
          <Label htmlFor="prompt-modal-input" className="mb-2">
            {label}
          </Label>
          <Input
            id="prompt-modal-input"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChangeText(e.target.value)}
            autoFocus
          />
        </div>
        <Button
          disabled={loading}
          onClick={onConfirm}
          className={cn("w-full", confirmButtonColor)}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Criar"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
