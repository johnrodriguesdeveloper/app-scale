"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, ShieldCheck, Trash } from "lucide-react"
import { useMemberList } from "@/features/departments/useMemberList"
import { ConfirmModal } from "@/components/ConfirmModal"
import { AddMemberModal } from "@/features/departments/AddMemberModal"
import type { DepartmentMember } from "@/types/department"

export default function MemberListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const {
    members,
    departmentLeaders,
    loading,
    canEdit,
    availableProfiles,
    availableFunctions,
    loadAvailableProfiles,
    addMember,
    addFunctionsToMember,
    removeMember,
    removeFunctionFromMember,
  } = useMemberList(id)

  const [showAddModal, setShowAddModal] = useState(false)
  const [modalMode, setModalMode] = useState<"add_member" | "add_function">("add_member")
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string
    message: string
    onConfirm: () => Promise<void>
    isDestructive: boolean
    loading: boolean
  }>({
    title: "",
    message: "",
    onConfirm: async () => {},
    isDestructive: false,
    loading: false,
  })

  const requestConfirmation = (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    isDestructive = false
  ) => {
    setConfirmConfig({ title, message, onConfirm, isDestructive, loading: false })
    setConfirmModalVisible(true)
  }

  const handleConfirmAction = async () => {
    setConfirmConfig((prev) => ({ ...prev, loading: true }))
    try {
      await confirmConfig.onConfirm()
      setConfirmModalVisible(false)
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleOpenAddMember = async () => {
    setModalMode("add_member")
    await loadAvailableProfiles()
    setShowAddModal(true)
  }

  const handleOpenAddFunction = (memberId: string) => {
    setModalMode("add_function")
    setSelectedMemberId(memberId)
    setShowAddModal(true)
  }

  const handleDeleteMember = (memberId: string) => {
    requestConfirmation(
      "Remover Membro",
      "Tem certeza que deseja remover este membro? Todas as escalas futuras dele serão apagadas.",
      async () => await removeMember(memberId),
      true
    )
  }

  const handleRemoveFunction = (memberId: string, functionId: string) => {
    requestConfirmation(
      "Remover Função",
      "Deseja remover esta função do membro?",
      async () => await removeFunctionFromMember(memberId, functionId),
      true
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen pb-24">
      <div className="flex items-center border-b border-border bg-card px-4 py-6">
        <button
          onClick={() => router.push(`/departments/${id}`)}
          className="mr-3 rounded-lg bg-muted p-2"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">Todos os Membros</h1>
      </div>

      <div className="flex flex-col gap-3 py-4">
        {members.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">Nenhum membro.</p>
        )}
        {members.map((member: DepartmentMember) => {
          const functionsList = member.member_functions?.map((mf) => mf.department_functions) || []
          const hasMoreFunctions = functionsList.length < availableFunctions.length
          const isLeader = departmentLeaders.includes(member.user_id)

          return (
            <div
              key={member.id}
              className="mx-4 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="font-bold text-primary">
                      {member.profiles.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold">{member.profiles?.full_name}</p>
                    {isLeader && (
                      <div className="mt-0.5 inline-flex items-center gap-1 self-start rounded-md bg-warning/10 px-2 py-0.5">
                        <ShieldCheck className="size-2.5 text-warning" />
                        <span className="text-[10px] font-bold text-warning">LÍDER</span>
                      </div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="rounded-full bg-muted p-2"
                  >
                    <Trash className="size-4 text-destructive" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {functionsList.map((func) => (
                  <button
                    key={func.id}
                    disabled={!canEdit}
                    onClick={() => handleRemoveFunction(member.id, func.id)}
                    className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5"
                  >
                    <span className="text-xs font-semibold text-primary">{func.name}</span>
                    {canEdit && <span className="text-xs text-primary/70">×</span>}
                  </button>
                ))}
                {canEdit && hasMoreFunctions && (
                  <button
                    onClick={() => handleOpenAddFunction(member.id)}
                    className="rounded-lg border border-dashed border-border bg-muted px-3 py-1.5"
                  >
                    <span className="text-xs font-semibold text-muted-foreground">+ Add</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {canEdit && (
        <button
          onClick={handleOpenAddMember}
          className="fixed bottom-24 right-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:bottom-6"
        >
          <Plus className="size-6" />
        </button>
      )}

      <AddMemberModal
        visible={showAddModal}
        mode={modalMode}
        availableProfiles={availableProfiles}
        availableFunctions={
          modalMode === "add_function" && selectedMemberId
            ? availableFunctions.filter(
                (f) =>
                  !members
                    .find((m) => m.id === selectedMemberId)
                    ?.member_functions?.some((mf) => mf.department_functions.id === f.id)
              )
            : availableFunctions
        }
        onClose={() => setShowAddModal(false)}
        onSaveMember={addMember}
        onSaveFunctions={(functions) => addFunctionsToMember(selectedMemberId!, functions)}
      />

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        loading={confirmConfig.loading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </div>
  )
}
