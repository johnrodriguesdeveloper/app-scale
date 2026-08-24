"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Settings, Trash2, Users, X } from "lucide-react"
import { useDepartmentSettings } from "@/features/departments/useDepartmentSettings"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function DepartmentSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const {
    functions,
    members,
    newFunctionName,
    setNewFunctionName,
    loading,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    addFunction,
    requestDeleteFunction,
    executeDeleteFunction,
    toggleMemberFunction,
  } = useDepartmentSettings(id)

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <Settings className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Configurações</h1>
        </div>
        <button onClick={() => router.back()} className="rounded-full bg-muted p-2">
          <X className="size-5" />
        </button>
      </div>

      <div className="p-4">
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Gerenciar Funções</h2>

          <div className="mb-6 flex items-center gap-3">
            <Input
              value={newFunctionName}
              onChange={(e) => setNewFunctionName(e.target.value)}
              placeholder="Ex: Baixo, Violino..."
              className="flex-1"
            />
            <button
              onClick={addFunction}
              disabled={loading || !newFunctionName.trim()}
              className={cn(
                "flex items-center justify-center rounded-xl bg-primary p-3 text-primary-foreground",
                (loading || !newFunctionName.trim()) && "opacity-50"
              )}
            >
              {loading ? <Loader2 className="size-6 animate-spin" /> : <Plus className="size-6" />}
            </button>
          </div>

          {functions.length > 0 ? (
            functions.map((func, index) => (
              <div
                key={func.id}
                className={cn(
                  "flex items-center justify-between py-3",
                  index !== functions.length - 1 && "border-b border-border"
                )}
              >
                <p className="flex-1 text-base font-semibold">{func.name}</p>
                <button
                  onClick={() => requestDeleteFunction(func.id, func.name)}
                  className="ml-3 rounded-lg bg-destructive/10 p-2"
                >
                  <Trash2 className="size-[18px] text-destructive" />
                </button>
              </div>
            ))
          ) : (
            <p className="py-4 text-center italic text-muted-foreground">Nenhuma função cadastrada.</p>
          )}
        </div>

        <div className="mb-10 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="text-lg font-bold">Atribuir Funções</h2>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            Selecione o que cada membro está habilitado a fazer na escala.
          </p>

          {members.length > 0 ? (
            members.map((member, index) => (
              <div
                key={member.id}
                className={cn("py-4", index !== members.length - 1 && "border-b border-border")}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-lg font-bold text-primary">
                      {member.profiles.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold">{member.profiles.full_name}</p>
                    {member.profiles.email && (
                      <p className="text-xs text-muted-foreground">{member.profiles.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pl-[52px]">
                  {functions.map((func) => {
                    const hasFunction = member.member_functions.some(
                      (mf) => mf.function_id === func.id
                    )
                    return (
                      <button
                        key={func.id}
                        onClick={() => toggleMemberFunction(member.id, func.id, hasFunction)}
                        className={cn(
                          "rounded-xl border px-4 py-2",
                          hasFunction
                            ? "border-primary bg-primary"
                            : "border-border bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            hasFunction ? "text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          {func.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center italic text-muted-foreground">
              Nenhum membro no departamento.
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive
        loading={confirmConfig.loading}
        onConfirm={executeDeleteFunction}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </div>
  )
}
