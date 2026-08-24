"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronLeft, ChevronRight, Filter, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useDepartmentRosterGrid } from "@/features/roster/useDepartmentRosterGrid"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

export default function DepartmentRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: departmentId } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [departmentName, setDepartmentName] = useState("")

  useEffect(() => {
    supabase
      .from("departments")
      .select("name")
      .eq("id", departmentId)
      .single()
      .then(({ data }) => {
        if (data) setDepartmentName(data.name)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId])

  const {
    currentMonth,
    loading,
    gridColumns,
    functions,
    canEdit,
    showMemberSelect,
    setShowMemberSelect,
    selectedCell,
    saving,
    prevMonth,
    nextMonth,
    getRosterInCell,
    getFilteredMembers,
    handleAddMember,
    handleRemoveDirectly,
    setSelectedCell,
  } = useDepartmentRosterGrid(departmentId)

  const filteredMembers = getFilteredMembers()

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center">
          <button
            onClick={() => router.push(`/departments/${departmentId}`)}
            className="mr-4 rounded-xl bg-muted p-2"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{departmentName}</h1>
            <p className="text-sm text-muted-foreground">Escala Mensal</p>
          </div>
        </div>

        <div className="flex items-center rounded-xl bg-muted p-1">
          <button onClick={prevMonth} className="p-2">
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-[140px] px-4 text-center font-bold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={nextMonth} className="p-2">
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading && gridColumns.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mx-auto flex max-w-[1400px] flex-wrap justify-center gap-4">
            {gridColumns.map((col, index) => (
              <div
                key={index}
                className="mb-2 w-[320px] rounded-sm border-2 border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="bg-zinc-950 px-2 py-1 text-center">
                  <p className="text-xs font-bold uppercase text-white">
                    {format(col.date, "dd")} | {format(col.date, "EEEE", { locale: ptBR })} {col.service.name}
                  </p>
                </div>

                {functions.map((func, fIndex) => {
                  const cellData = getRosterInCell(func.id, col.dateStr, col.service.id)
                  const isLast = fIndex === functions.length - 1

                  return (
                    <div
                      key={func.id}
                      className={`flex ${!isLast ? "border-b-2 border-black" : ""}`}
                    >
                      <div className="w-[35%] justify-center border-r-2 border-black bg-white p-1.5 dark:bg-zinc-900">
                        <p className="text-[11px] font-bold text-black dark:text-zinc-100">
                          {func.name}
                        </p>
                      </div>

                      {canEdit ? (
                        <button
                          onClick={() => {
                            setSelectedCell({
                              functionId: func.id,
                              functionName: func.name,
                              serviceId: col.service.id,
                              date: col.date,
                              currentRosterId: cellData?.id,
                            })
                            setShowMemberSelect(true)
                          }}
                          className="flex w-[65%] items-center justify-center bg-white p-1.5 dark:bg-zinc-900"
                        >
                          {cellData ? (
                            <p className="text-center text-[11px] font-bold text-primary">
                              {cellData.member_name}
                            </p>
                          ) : (
                            <p className="text-center text-[11px] font-bold text-muted-foreground">--</p>
                          )}
                        </button>
                      ) : (
                        <div className="flex w-[65%] items-center justify-center bg-white p-1.5 dark:bg-zinc-900">
                          {cellData ? (
                            <p className="text-center text-[11px] font-bold text-primary">
                              {cellData.member_name}
                            </p>
                          ) : (
                            <p className="text-center text-[11px] font-bold text-muted-foreground">--</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showMemberSelect} onOpenChange={setShowMemberSelect}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <DialogTitle>{selectedCell?.functionName}</DialogTitle>
              {selectedCell && (
                <p className="mt-1 text-xs font-medium capitalize text-muted-foreground">
                  {format(selectedCell.date, "dd 'de' MMMM", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>

          {selectedCell?.currentRosterId && (
            <button
              onClick={() => handleRemoveDirectly(selectedCell.currentRosterId!)}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin text-destructive" />
              ) : (
                <>
                  <Trash2 className="size-4 text-destructive" />
                  <span className="text-sm font-bold text-destructive">Remover da Escala</span>
                </>
              )}
            </button>
          )}

          <p className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Disponíveis
          </p>

          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8">
              <Filter className="size-8 text-muted-foreground" />
              <p className="text-center text-sm font-bold text-muted-foreground">Ninguém disponível</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredMembers.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddMember(item.id)}
                  disabled={saving}
                  className="rounded-xl border border-border bg-card p-3 text-left"
                >
                  <p className="text-sm font-bold">{item.profiles?.full_name || "Sem nome"}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
