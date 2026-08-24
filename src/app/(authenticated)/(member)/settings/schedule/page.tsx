"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, Edit2, Loader2, Plus, Trash2 } from "lucide-react"
import { useSchedule } from "@/features/settings/useSchedule"
import { ScheduleFormModal } from "@/features/settings/ScheduleFormModal"
import { ConfirmModal } from "@/components/ConfirmModal"
import type { ServiceDay } from "@/types/schedule"

const weekDaysLabel = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function SchedulePage() {
  const router = useRouter()
  const { serviceDays, loading, saveServiceDay, deleteServiceDay } = useSchedule()

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingDay, setEditingDay] = useState<ServiceDay | null>(null)

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    targetId: "",
    loading: false,
  })

  const handleOpenAdd = () => {
    setEditingDay(null)
    setShowFormModal(true)
  }

  const handleOpenEdit = (day: ServiceDay) => {
    setEditingDay(day)
    setShowFormModal(true)
  }

  const confirmDelete = (day: ServiceDay) => {
    setConfirmConfig({
      title: "Excluir Evento",
      message: `Tem certeza que deseja excluir "${day.name}" da agenda?`,
      targetId: day.id,
      loading: false,
    })
    setConfirmModalVisible(true)
  }

  const executeDelete = async () => {
    setConfirmConfig((prev) => ({ ...prev, loading: true }))
    try {
      await deleteServiceDay(confirmConfig.targetId)
      setConfirmModalVisible(false)
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <div className="flex items-center border-b border-border bg-card px-4 py-6">
        <button onClick={() => router.back()} className="mr-4 rounded-lg bg-muted p-2">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">Agenda da Igreja</h1>
      </div>

      <div className="p-4">
        {serviceDays.length > 0 ? (
          <div className="flex flex-col gap-3">
            {serviceDays.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {weekDaysLabel[item.day_of_week] || "Inválido"}
                      </span>
                    </div>
                    <p className="text-lg font-semibold">{item.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="rounded-lg bg-primary/10 p-2"
                    >
                      <Edit2 className="size-4 text-primary" />
                    </button>
                    <button
                      onClick={() => confirmDelete(item)}
                      className="rounded-lg bg-destructive/10 p-2"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarDays className="size-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold text-muted-foreground">Agenda vazia</p>
            <p className="mt-2 px-6 text-sm text-muted-foreground">
              Toque no botão flutuante para adicionar seus cultos e eventos semanais.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleOpenAdd}
        className="fixed bottom-6 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
      >
        <Plus className="size-6" />
      </button>

      <ScheduleFormModal
        visible={showFormModal}
        editingDay={editingDay}
        onClose={() => setShowFormModal(false)}
        onSave={saveServiceDay}
      />

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive
        loading={confirmConfig.loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </div>
  )
}
