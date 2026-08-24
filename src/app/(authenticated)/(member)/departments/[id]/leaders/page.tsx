"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react"
import { useDepartmentLeaders } from "@/features/departments/useDepartmentLeaders"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Input } from "@/components/ui/input"

export default function DepartmentLeadersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const {
    leaders,
    searchResults,
    searchText,
    loading,
    searching,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmConfig,
    searchUsers,
    handleAddLeader,
    requestRemoveLeader,
    executeRemoveLeader,
  } = useDepartmentLeaders(id)

  return (
    <div>
      <div className="flex items-center border-b border-border bg-card px-4 py-4">
        <button onClick={() => router.back()} className="mr-4 rounded-lg bg-muted p-2">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Gestão de Líderes</h1>
        </div>
      </div>

      <div className="border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
          <Search className="size-5 text-muted-foreground" />
          <Input
            placeholder="Buscar membro para adicionar como líder..."
            value={searchText}
            onChange={(e) => searchUsers(e.target.value)}
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {searching && (
          <div className="mt-3 flex flex-col items-center gap-1">
            <Loader2 className="size-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Buscando...</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              Resultados da busca ({searchResults.length})
            </p>
            <div className="flex flex-col gap-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAddLeader(user.id)}
                  className="flex items-center gap-3 rounded-lg bg-muted p-3 text-left"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                    <span className="font-bold text-primary-foreground">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name}</p>
                    {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                  </div>
                  <UserPlus className="size-5 text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Líderes Atuais ({leaders.length})</h2>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando líderes...</p>
          </div>
        ) : leaders.length > 0 ? (
          <div className="flex flex-col gap-3">
            {leaders.map((leader) => (
              <div
                key={leader.id}
                className="rounded-xl border border-warning/30 bg-warning/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-warning">
                      <ShieldCheck className="size-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{leader.profiles.full_name}</p>
                      {leader.profiles.email && (
                        <p className="text-sm text-muted-foreground">{leader.profiles.email}</p>
                      )}
                      <p className="mt-1 text-xs text-warning">Líder do departamento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => requestRemoveLeader(leader.id, leader.profiles.full_name)}
                    className="rounded-lg bg-destructive/10 p-2"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center">
            <ShieldCheck className="size-8 text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Nenhum líder definido ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a busca acima para adicionar líderes
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive
        loading={confirmConfig.loading}
        onConfirm={executeRemoveLeader}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </div>
  )
}
