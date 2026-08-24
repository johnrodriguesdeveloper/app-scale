"use client"

import { useEffect, useState } from "react"
import { CheckSquare, Loader2, Search, Square } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { DepartmentFunction, Profile } from "@/types/department"

interface AddMemberModalProps {
  visible: boolean
  mode: "add_member" | "add_function"
  availableProfiles: Profile[]
  availableFunctions: DepartmentFunction[]
  onClose: () => void
  onSaveMember: (userId: string, functionIds: string[]) => Promise<void>
  onSaveFunctions: (functionIds: string[]) => Promise<void>
}

export function AddMemberModal({
  visible,
  mode,
  availableProfiles,
  availableFunctions,
  onClose,
  onSaveMember,
  onSaveFunctions,
}: AddMemberModalProps) {
  const [step, setStep] = useState(1)
  const [searchText, setSearchText] = useState("")
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [selectedFunctionIds, setSelectedFunctionIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (visible) {
      setStep(mode === "add_member" ? 1 : 2)
      setSearchText("")
      setSelectedProfileId(null)
      setSelectedFunctionIds([])
      setErrorMsg("")
    }
  }, [visible, mode])

  const filteredProfiles = availableProfiles.filter((p) =>
    p.full_name.toLowerCase().includes(searchText.toLowerCase())
  )

  const toggleFunction = (id: string) => {
    setSelectedFunctionIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    )
  }

  const handleNextStep = () => {
    if (!selectedProfileId) {
      setErrorMsg("Selecione uma pessoa para continuar.")
      return
    }
    setErrorMsg("")
    setStep(2)
  }

  const handleSave = async () => {
    if (selectedFunctionIds.length === 0) {
      setErrorMsg("Selecione pelo menos uma função.")
      return
    }

    setSaving(true)
    setErrorMsg("")

    try {
      if (mode === "add_member") {
        if (!selectedProfileId) throw new Error("Usuário não selecionado.")
        await onSaveMember(selectedProfileId, selectedFunctionIds)
      } else {
        await onSaveFunctions(selectedFunctionIds)
      }
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[70vh] max-h-[600px] flex-col sm:max-w-md">
        <DialogTitle>
          {mode === "add_member" ? (step === 1 ? "Selecionar Membro" : "Atribuir Funções") : "Adicionar Funções"}
        </DialogTitle>

        {errorMsg ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm font-medium text-destructive">
            {errorMsg}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto">
          {step === 1 && mode === "add_member" && (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-input bg-muted/30 px-4 py-1">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="flex flex-col gap-2">
                {filteredProfiles.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground">Nenhum usuário encontrado.</p>
                )}
                {filteredProfiles.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedProfileId(item.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left",
                      selectedProfileId === item.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30"
                    )}
                  >
                    <p
                      className={cn(
                        "font-semibold",
                        selectedProfileId === item.id && "text-primary"
                      )}
                    >
                      {item.full_name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.email}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              {availableFunctions.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">Nenhuma função disponível.</p>
              )}
              {availableFunctions.map((item) => {
                const isSelected = selectedFunctionIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleFunction(item.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-4 text-left",
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                    )}
                  >
                    <span className={cn("font-semibold", isSelected && "text-primary")}>
                      {item.name}
                    </span>
                    {isSelected ? (
                      <CheckSquare className="size-5 text-primary" />
                    ) : (
                      <Square className="size-5 text-muted-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {step === 1 && mode === "add_member" ? (
          <Button onClick={handleNextStep}>Avançar</Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Confirmar"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
