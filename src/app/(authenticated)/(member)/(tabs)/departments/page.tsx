"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Trash, Users } from "lucide-react"
import { useDepartments } from "@/features/departments/useDepartments"
import { ConfirmModal } from "@/components/ConfirmModal"

export default function DepartmentsPage() {
  const { departments, loading, isAdmin, isMaster, isLeader, deleteDepartment } = useDepartments()

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({
    title: "",
    message: "",
    targetId: "",
    loading: false,
  })

  const requestDeleteConfirmation = (departmentId: string, departmentName: string) => {
    setConfirmConfig({
      title: "Excluir Departamento",
      message: `Tem certeza que deseja excluir '${departmentName}'? Essa ação apagará todos os vínculos e escalas associados.`,
      targetId: departmentId,
      loading: false,
    })
    setConfirmModalVisible(true)
  }

  const executeDelete = async () => {
    setConfirmConfig((prev) => ({ ...prev, loading: true }))
    try {
      await deleteDepartment(confirmConfig.targetId)
      setConfirmModalVisible(false)
    } catch (error) {
      setConfirmModalVisible(false)
      window.alert(error instanceof Error ? error.message : "Erro ao excluir.")
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-card p-6">
        <h1 className="text-xl font-bold">Departamentos</h1>
        {isMaster && (
          <Link
            href="/create-department"
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm"
          >
            <Plus className="size-4" />
            Novo
          </Link>
        )}
      </div>

      <div className="py-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <Link href={`/departments/${dept.id}`} className="flex-1 pr-3">
                  <p className="text-lg font-semibold">{dept.name}</p>
                  {dept.description && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">{dept.description}</p>
                  )}
                  {isLeader[dept.id] && (
                    <div className="mt-2 inline-flex items-center gap-1 self-start rounded bg-primary/10 px-2 py-1">
                      <Users className="size-3 text-primary" />
                      <span className="text-xs font-medium text-primary">Líder</span>
                    </div>
                  )}
                </Link>

                {isMaster && (
                  <button
                    onClick={() => requestDeleteConfirmation(String(dept.id), String(dept.name))}
                    className="rounded-lg bg-destructive/10 p-3"
                  >
                    <Trash className="size-[18px] text-destructive" />
                  </button>
                )}
              </div>
            ))}

            {departments.length === 0 && (
              <div className="flex flex-col items-center py-10 opacity-60">
                <Users className="size-12 text-muted-foreground" />
                <p className="mt-4 text-center text-muted-foreground">
                  {isAdmin ? "Nenhum departamento encontrado." : "Você não participa de nenhum departamento."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

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
