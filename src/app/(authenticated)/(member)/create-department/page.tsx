"use client"

import { useRouter } from "next/navigation"
import { Info, Loader2, Save, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCreateDepartment } from "@/features/departments/useCreateDepartment"
import { FeedbackModal } from "@/components/FeedbackModal"

export default function CreateDepartmentPage() {
  const router = useRouter()
  const {
    name,
    setName,
    priority,
    setPriority,
    deadlineDay,
    setDeadlineDay,
    loading,
    modalConfig,
    handleSave,
    handleCloseModal,
  } = useCreateDepartment()

  return (
    <div className="mx-auto max-w-xl p-4 pt-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Criar Departamento</h1>
        <button onClick={() => router.back()} className="rounded-full bg-muted p-2">
          <X className="size-6" />
        </button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
      >
        <div>
          <Label className="mb-2">Nome do Departamento</Label>
          <Input
            placeholder="Ex: Louvor, Diáconos..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <Label className="mb-2">Prioridade</Label>
          <Input
            placeholder="Ex: 1, 2, 3..."
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            inputMode="numeric"
            disabled={loading}
          />
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="flex-1 text-xs text-primary">
              A prioridade define a ordem. Número 1 é a maior prioridade.
            </p>
          </div>
        </div>

        <div>
          <Label className="mb-2">Dia Limite de Escala</Label>
          <Input
            placeholder="Ex: 15 (dia do mês)"
            value={deadlineDay}
            onChange={(e) => setDeadlineDay(e.target.value)}
            inputMode="numeric"
            disabled={loading}
          />
          <p className="ml-1 mt-2 text-xs text-muted-foreground">
            Dia do mês (1-31) que encerra o prazo de disponibilidade.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Save className="size-5" />
              Salvar Departamento
            </>
          )}
        </button>
      </form>

      <FeedbackModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />
    </div>
  )
}
