"use client"

import { use, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarClock, Loader2, Search, ShieldAlert } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { useDepartmentReport } from "@/features/departments/useDepartmentReport"

type SortMode = "name" | "scheduled" | "available"

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: "name", label: "Nome" },
  { mode: "scheduled", label: "Mais escalados" },
  { mode: "available", label: "Mais disponíveis" },
]

export default function DepartmentReportPage({ params }: { params: Promise<{ id: string }> }) {
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
    loading,
    isLeader,
    months,
    selectedMonthKey,
    setSelectedMonthKey,
    getRowsForMonth,
    getServicesCountForMonth,
  } = useDepartmentReport(departmentId)

  const selectedMonth = months.find((m) => m.key === selectedMonthKey) ?? null

  const [searchText, setSearchText] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("name")

  const displayedRows = useMemo(() => {
    if (!selectedMonth) return []
    const rows = getRowsForMonth(selectedMonth.key)
    const search = searchText.trim().toLowerCase()

    const filtered = search ? rows.filter((row) => row.fullName.toLowerCase().includes(search)) : rows

    const sorted = [...filtered]
    if (sortMode === "scheduled") {
      sorted.sort((a, b) => b.timesScheduled - a.timesScheduled || a.fullName.localeCompare(b.fullName))
    } else if (sortMode === "available") {
      sorted.sort((a, b) => b.timesAvailable - a.timesAvailable || a.fullName.localeCompare(b.fullName))
    } else {
      sorted.sort((a, b) => a.fullName.localeCompare(b.fullName))
    }

    return sorted
  }, [selectedMonth, searchText, sortMode, getRowsForMonth])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isLeader) {
    return (
      <div>
        <div className="flex items-center border-b border-border bg-card px-4 py-4">
          <button onClick={() => router.push(`/departments/${departmentId}`)} className="mr-4 rounded-lg bg-muted p-2">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold">Relatório</h1>
        </div>
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <p className="font-semibold">Acesso restrito</p>
          <p className="text-sm text-muted-foreground">
            Somente líderes do departamento podem ver este relatório.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center border-b border-border bg-card px-4 py-4">
        <button
          onClick={() =>
            selectedMonth ? setSelectedMonthKey(null) : router.push(`/departments/${departmentId}`)
          }
          className="mr-4 rounded-lg bg-muted p-2"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{departmentName}</h1>
          <p className="text-sm text-muted-foreground">
            {selectedMonth ? "Relatório mensal" : "Relatório · últimos 6 meses"}
          </p>
        </div>
      </div>

      <div className="p-4">
        {!selectedMonth ? (
          <div className="flex flex-col gap-3">
            {months.map((month) => (
              <button
                key={month.key}
                onClick={() => setSelectedMonthKey(month.key)}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <CalendarClock className="size-5 text-primary" />
                  </div>
                  <p className="font-semibold capitalize">{format(month.date, "MMMM yyyy", { locale: ptBR })}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getServicesCountForMonth(month.key)} culto(s)
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-muted-foreground">
              {getServicesCountForMonth(selectedMonth.key)} culto(s) em{" "}
              <span className="capitalize">{format(selectedMonth.date, "MMMM yyyy", { locale: ptBR })}</span>
            </p>

            <div className="mb-4 flex items-center gap-2 rounded-xl bg-muted p-3">
              <Search className="size-5 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar voluntário por nome..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="mb-4 flex gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setSortMode(option.mode)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    sortMode === option.mode
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {displayedRows.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
                <p className="text-muted-foreground">Nenhum voluntário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      <th className="p-3 font-semibold">Voluntário</th>
                      <th className="p-3 font-semibold">Departamento</th>
                      <th className="p-3 text-center font-semibold">Disponível</th>
                      <th className="p-3 text-center font-semibold">Escalado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedRows.map((row, index, arr) => (
                      <tr
                        key={row.memberId}
                        className={index !== arr.length - 1 ? "border-b border-border" : ""}
                      >
                        <td className="p-3 font-medium">{row.fullName}</td>
                        <td className="p-3 text-muted-foreground">{row.departmentName}</td>
                        <td className="p-3 text-center">
                          {row.timesAvailable}/{row.servicesInMonth}
                        </td>
                        <td className="p-3 text-center">
                          {row.timesScheduled}/{row.servicesInMonth}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
