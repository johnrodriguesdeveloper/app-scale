"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ServiceDay } from "@/types/schedule"

interface ScheduleFormModalProps {
  visible: boolean
  editingDay: ServiceDay | null
  onClose: () => void
  onSave: (dayOfWeek: number, name: string, id?: string) => Promise<void>
}

const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function ScheduleFormModal({ visible, editingDay, onClose, onSave }: ScheduleFormModalProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [eventName, setEventName] = useState("")
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (visible) {
      setSelectedDay(editingDay ? editingDay.day_of_week : 0)
      setEventName(editingDay ? editingDay.name || "" : "")
      setErrorMsg("")
    }
  }, [visible, editingDay])

  const handleSave = async () => {
    setSaving(true)
    setErrorMsg("")
    try {
      await onSave(selectedDay, eventName, editingDay?.id)
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle>{editingDay ? "Editar Evento" : "Novo Evento"}</DialogTitle>

        {errorMsg ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm font-medium text-destructive">
            {errorMsg}
          </p>
        ) : null}

        <div>
          <Label className="mb-2">Dia da Semana</Label>
          <div className="mb-4 flex flex-wrap gap-2">
            {daysOfWeek.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={cn(
                  "rounded-full border px-3 py-2",
                  selectedDay === index ? "border-primary bg-primary" : "border-border bg-muted"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold",
                    selectedDay === index ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {day}
                </span>
              </button>
            ))}
          </div>

          <Label className="mb-2">Nome do Culto</Label>
          <Input
            placeholder="Ex: Culto de Ensino"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="size-4 animate-spin" /> : editingDay ? "Atualizar" : "Adicionar"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
