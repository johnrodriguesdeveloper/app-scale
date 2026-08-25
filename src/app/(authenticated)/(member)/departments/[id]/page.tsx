"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Calendar,
  Folder,
  Loader2,
  Plus,
  Shield,
  Trash,
  Users,
} from "lucide-react"
import { useDepartmentDetails } from "@/features/departments/useDepartmentDetails"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PromptModal } from "@/components/PromptModal"

export default function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const {
    department,
    parentDepartment,
    subDepartments,
    members,
    functions,
    isAdmin,
    isMaster,
    isLeader,
    loading,
    handleBack,
    removeMember,
    deleteSubDepartment,
    deleteFunction,
    createFunction,
    createSubDepartment,
  } = useDepartmentDetails(id)

  const [showFunctionModal, setShowFunctionModal] = useState(false)
  const [newFunctionName, setNewFunctionName] = useState("")
  const [savingFunction, setSavingFunction] = useState(false)

  const [showSubDeptModal, setShowSubDeptModal] = useState(false)
  const [newSubDeptName, setNewSubDeptName] = useState("")
  const [savingSubDept, setSavingSubDept] = useState(false)

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
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Falha na ação.")
    } finally {
      setConfirmConfig((prev) => ({ ...prev, loading: false }))
    }
  }

  const handleCreateFunction = async () => {
    setSavingFunction(true)
    try {
      await createFunction(newFunctionName)
      setShowFunctionModal(false)
      setNewFunctionName("")
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao criar função.")
    } finally {
      setSavingFunction(false)
    }
  }

  const handleCreateSubDepartment = async () => {
    setSavingSubDept(true)
    try {
      await createSubDepartment(newSubDeptName)
      setShowSubDeptModal(false)
      setNewSubDeptName("")
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao criar sub-departamento.")
    } finally {
      setSavingSubDept(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!department) {
    return (
      <div className="flex min-h-screen items-center justify-center">Não encontrado</div>
    )
  }

  return (
    <div>
      <div className="flex items-center border-b border-border bg-card px-4 py-6">
        <button onClick={handleBack} className="mr-4 rounded-lg bg-muted p-2">
          <ArrowLeft className="size-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{department.name}</h1>
          {department.description && (
            <p className="mt-1 text-sm text-muted-foreground">{department.description}</p>
          )}
          {department.parent_id && parentDepartment?.name && (
            <Link
              href={`/departments/${parentDepartment.id}`}
              className="mt-1 block text-sm font-medium text-secondary"
            >
              ↳ {parentDepartment.name}
            </Link>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mb-6 flex gap-3">
          {(isAdmin || isMaster) && (
            <Link
              href={`/departments/${id}/leaders`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-warning px-4 py-3 font-bold text-white shadow-sm"
            >
              <Shield className="size-5" />
              Liderança
            </Link>
          )}
          <Link
            href={`/departments/${id}/roster`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-sm"
          >
            <Calendar className="size-5" />
            Escala
          </Link>
          {isLeader && (
            <Link
              href={`/departments/${id}/report`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 font-bold text-secondary-foreground shadow-sm"
            >
              <BarChart3 className="size-5" />
              Relatório
            </Link>
          )}
        </div>

        {(subDepartments.length > 0 || isAdmin) && (
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="size-5 text-secondary" />
                <h2 className="text-lg font-semibold">Sub-departamentos</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowSubDeptModal(true)}
                  className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                >
                  <Plus className="size-4" />
                  Criar
                </button>
              )}
            </div>
            {subDepartments.length > 0 ? (
              <div className="flex flex-col gap-3">
                {subDepartments.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center rounded-xl border border-secondary/30 bg-secondary/10 p-4"
                  >
                    <Link href={`/departments/${child.id}`} className="flex flex-1 items-center">
                      <div className="mr-3 flex size-10 items-center justify-center rounded-full bg-secondary/20">
                        <Folder className="size-5 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{child.name}</p>
                        {child.description && (
                          <p className="text-sm text-secondary">{child.description}</p>
                        )}
                      </div>
                    </Link>
                    {isMaster && (
                      <button
                        onClick={() =>
                          requestConfirmation(
                            "Excluir",
                            `Excluir '${child.name}'?`,
                            () => deleteSubDepartment(String(child.id)),
                            true
                          )
                        }
                        className="ml-2 p-2"
                      >
                        <Trash className="size-[18px] text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
                <Folder className="size-8 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Nenhum sub-departamento</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowSubDeptModal(true)}
                    className="mt-4 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
                  >
                    Criar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <Link
            href={`/departments/${id}/members`}
            className="mb-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Membros</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{members.length} membro(s)</span>
              <span className="text-primary">Ver membros→</span>
            </div>
          </Link>
          {members.length > 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              {members.slice(0, 5).map((member, index) => (
                <div
                  key={member.id}
                  className={index !== members.length - 1 ? "border-b border-border p-4" : "p-4"}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="font-semibold text-primary">
                          {member.profiles?.full_name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="mr-2 flex-1">
                        <p className="truncate font-medium">{member.profiles?.full_name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.dept_role === "leader" ? "Líder" : "Membro"}
                        </p>
                      </div>
                    </div>
                    {(isMaster || isAdmin) && (
                      <button
                        onClick={() =>
                          requestConfirmation(
                            "Remover",
                            `Remover '${member.profiles?.full_name}'?`,
                            () => removeMember(String(member.id)),
                            true
                          )
                        }
                        className="rounded-lg bg-destructive/10 p-2"
                      >
                        <Trash className="size-[18px] text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.length > 5 && (
                <Link
                  href={`/departments/${id}/members`}
                  className="block rounded-b-xl bg-muted/50 p-3 text-center text-sm font-medium text-primary"
                >
                  Ver todos os {members.length} membros
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
              <Users className="size-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Nenhum membro</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              <h2 className="text-lg font-semibold">Funções</h2>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowFunctionModal(true)}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="size-4" />
                Nova
              </button>
            )}
          </div>
          {functions.length > 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              {functions.map((func, index) => (
                <div
                  key={func.id}
                  className={index !== functions.length - 1 ? "border-b border-border p-4" : "p-4"}
                >
                  <div className="flex items-center justify-between">
                    <div className="mr-2 flex-1">
                      <p className="font-medium">{func.name}</p>
                      {func.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{func.description}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() =>
                          requestConfirmation(
                            "Excluir",
                            `Excluir '${func.name}'?`,
                            () => deleteFunction(String(func.id)),
                            true
                          )
                        }
                        className="rounded-lg bg-destructive/10 p-2"
                      >
                        <Trash className="size-[18px] text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6">
              <Briefcase className="size-8 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Nenhuma função</p>
              {isAdmin && (
                <button
                  onClick={() => setShowFunctionModal(true)}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Criar
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        loading={confirmConfig.loading}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModalVisible(false)}
      />

      <PromptModal
        visible={showSubDeptModal}
        title="Novo Sub-departamento"
        label="Nome"
        placeholder="Ex: Infantil, Louvor..."
        value={newSubDeptName}
        onChangeText={setNewSubDeptName}
        loading={savingSubDept}
        onConfirm={handleCreateSubDepartment}
        onCancel={() => {
          setShowSubDeptModal(false)
          setNewSubDeptName("")
        }}
        confirmButtonColor="bg-secondary"
      />

      <PromptModal
        visible={showFunctionModal}
        title="Nova Função"
        label="Nome da Função"
        placeholder="Ex: Guitarrista, Professor..."
        value={newFunctionName}
        onChangeText={setNewFunctionName}
        loading={savingFunction}
        onConfirm={handleCreateFunction}
        onCancel={() => {
          setShowFunctionModal(false)
          setNewFunctionName("")
        }}
      />
    </div>
  )
}
