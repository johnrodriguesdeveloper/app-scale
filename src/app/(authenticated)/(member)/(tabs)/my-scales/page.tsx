"use client"

import { Calendar, Loader2, MapPin, MessageCircle, Users } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useMyScales } from "@/features/my-scales/useMyScales"
import type { Scale } from "@/types/my-scales"

export default function MyScalesPage() {
  const {
    scales,
    loading,
    modalVisible,
    setModalVisible,
    selectedScale,
    teamMembers,
    loadingTeam,
    handleOpenScaleDetails,
    handleOpenWhatsApp,
  } = useMyScales()

  if (loading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-2">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border bg-card px-6 py-7">
        <h1 className="text-xl font-bold">Minhas Escalas</h1>
      </div>

      <div className="p-4">
        {scales.length > 0 ? (
          <>
            <p className="mb-4 font-medium text-muted-foreground">
              {scales.length} escala{scales.length > 1 ? "s" : ""} agendada
              {scales.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-col gap-3">
              {scales.map((scale) => (
                <ScaleCard key={scale.id} scale={scale} onClick={() => handleOpenScaleDetails(scale)} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-muted">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
            <p className="mb-2 text-lg font-bold">Nenhuma escala agendada</p>
            <p className="text-sm text-muted-foreground">
              Você não tem escalas agendadas para os próximos dias.
            </p>
          </div>
        )}
      </div>

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <div>
            <DialogTitle>Equipe Escalada</DialogTitle>
            {selectedScale && (
              <p className="mt-1 text-sm font-medium capitalize text-muted-foreground">
                {format(parseISO(selectedScale.schedule_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {loadingTeam ? (
              <div className="flex flex-col items-center py-10 gap-2">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Buscando equipe...</p>
              </div>
            ) : teamMembers.length > 0 ? (
              teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-4"
                >
                  <div className="flex-1">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                      {member.function_name}
                    </p>
                    <p className="text-base font-semibold">{member.member_name}</p>
                  </div>

                  {member.member_phone ? (
                    <button
                      onClick={() => handleOpenWhatsApp(member.member_phone, member.member_name)}
                      className="rounded-full bg-success/10 p-3"
                    >
                      <MessageCircle className="size-5 text-success" />
                    </button>
                  ) : (
                    <span className="px-2 text-xs italic text-muted-foreground">S/ Número</span>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <Users className="size-10 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">Ninguém mais escalado.</p>
              </div>
            )}
          </div>

          <Button variant="secondary" onClick={() => setModalVisible(false)}>
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ScaleCard({ scale, onClick }: { scale: Scale; onClick: () => void }) {
  const date = parseISO(scale.schedule_date)
  const day = format(date, "d")
  const month = format(date, "MMM", { locale: ptBR }).toUpperCase()
  const weekday = format(date, "EEEE", { locale: ptBR })
  const serviceName = scale.service_days?.name

  return (
    <button
      onClick={onClick}
      className="flex items-center rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="mr-4 min-w-[60px] rounded-lg bg-primary/10 p-3 text-center">
        <p className="text-2xl font-bold text-primary">{day}</p>
        <p className="text-xs font-semibold text-primary/80">{month}</p>
      </div>

      <div className="flex-1">
        <p className="mb-1 text-lg font-bold">
          {scale.department_functions?.name || "Função não definida"}
        </p>
        <div className="mb-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {scale.departments?.name || "Departamento"}
        </div>
        <p className="text-xs capitalize text-muted-foreground">
          {weekday} {serviceName ? `• ${serviceName}` : ""}
        </p>
      </div>
    </button>
  )
}
