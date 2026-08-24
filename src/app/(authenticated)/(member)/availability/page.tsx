"use client"

import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { fullDayNames, useAvailability } from "@/features/availability/useAvailability"

export default function AvailabilityPage() {
  const router = useRouter()

  const {
    currentMonth,
    serviceDays,
    availability,
    expandedCalendar,
    loading,
    saving,
    isAtMinDate,
    dayOfMonth,
    handlePrevMonth,
    handleNextMonth,
    handleToggleException,
    handleToggleRoutine,
  } = useAvailability()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center border-b border-border bg-card px-4 py-6">
        <button onClick={() => router.back()} className="mr-4">
          <ArrowLeft className="size-6 text-primary" />
        </button>
        <h1 className="text-xl font-bold">Minha Disponibilidade</h1>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        {dayOfMonth > 20 && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <Info className="mt-0.5 size-[18px] shrink-0 text-primary" />
            <div className="flex-1">
              <p className="mb-1 text-xs font-bold text-primary">Período de escala fechado</p>
              <p className="text-xs text-primary">
                Como hoje é dia {dayOfMonth} (passou do dia 20), a escala do próximo mês já está
                sendo fechada. Você está definindo a disponibilidade para o mês subsequente.
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3">
          <AlertCircle className="size-4 text-warning" />
          <p className="text-xs font-medium text-warning">
            Ajustes abaixo sobrepõem a rotina padrão.
          </p>
        </div>

        <h2 className="mb-3 text-lg font-bold">Rotina Semanal (Padrão)</h2>
        <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {serviceDays.map((day, index) => {
            const routine = availability.find((r) => r.service_day_id === day.id)
            const isOn = routine ? routine.is_available !== false : true
            return (
              <div
                key={day.id}
                className={cn(
                  "flex items-center justify-between p-4",
                  index < serviceDays.length - 1 && "border-b border-border"
                )}
              >
                <div>
                  <p className="text-base font-bold">{fullDayNames[day.day_of_week]}</p>
                  <p className="text-sm text-muted-foreground">{day.name}</p>
                </div>
                <Switch checked={isOn} onCheckedChange={(val) => handleToggleRoutine(day.id, val)} />
              </div>
            )
          })}
        </div>

        <div className="mb-4 mt-2 flex items-center justify-between">
          <button
            disabled={isAtMinDate}
            onClick={handlePrevMonth}
            className={cn("rounded-full bg-muted p-2", isAtMinDate && "opacity-30")}
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="text-lg font-bold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </p>
          <button onClick={handleNextMonth} className="rounded-full bg-muted p-2">
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="pb-10">
          {expandedCalendar.map((item) => (
            <div
              key={item.key}
              className={cn(
                "mb-3 flex items-center rounded-xl border bg-card p-3 shadow-sm",
                item.isAvailable ? "border-border" : "border-destructive/30 bg-destructive/10"
              )}
            >
              <div
                className={cn(
                  "mr-4 flex size-14 flex-col items-center justify-center rounded-lg",
                  item.isAvailable ? "bg-muted" : "bg-destructive/10"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold uppercase",
                    item.isAvailable ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {format(item.date, "EEE", { locale: ptBR })}
                </p>
                <p className={cn("text-xl font-bold", !item.isAvailable && "text-destructive")}>
                  {format(item.date, "dd")}
                </p>
              </div>

              <div className="mr-2 flex-1">
                <p className="text-base font-semibold">{item.service.name}</p>
                <p
                  className={cn(
                    "text-xs font-medium",
                    item.isAvailable ? "text-success" : "text-destructive"
                  )}
                >
                  {item.isAvailable ? "Disponível" : "Indisponível"}
                </p>
              </div>

              {saving[item.key] ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={(val) => handleToggleException(item, val)}
                />
              )}
            </div>
          ))}

          {expandedCalendar.length === 0 && (
            <p className="mt-4 text-center text-muted-foreground">Nenhum evento neste mês.</p>
          )}
        </div>
      </div>
    </div>
  )
}
