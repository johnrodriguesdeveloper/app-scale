"use client"

import { ArrowLeft, Calendar, CheckCircle, CheckSquare, ChevronRight, Loader2, Phone, Square } from "lucide-react"
import { IconInput } from "@/components/form/icon-input"
import { Button } from "@/components/ui/button"
import { FeedbackModal } from "@/components/FeedbackModal"
import { cn } from "@/lib/utils"
import { useOnboarding } from "@/features/onboarding/useOnboarding"

export default function OnboardingPage() {
  const {
    loading,
    saving,
    step,
    departments,
    subDepartments,
    functions,
    phone,
    birthDate,
    selectedDepartment,
    selectedSubDepartment,
    selectedFunctions,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSelectDepartment,
    setSelectedSubDepartment,
    goNextStep,
    goBackStep,
    toggleFunction,
    handleFinish,
    handleCloseModal,
  } = useOnboarding()

  const totalSteps = subDepartments.length > 0 ? 4 : 3

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl p-6 pt-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          {step === 1 ? "Seus Dados" : step === 4 ? "Suas Funções" : "Onde você serve?"}
        </h1>
        <p className="text-lg text-muted-foreground">
          Passo {step} de {totalSteps}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block font-semibold text-muted-foreground">
              Data de Nascimento
            </label>
            <IconInput
              icon={Calendar}
              placeholder="DD/MM/AAAA"
              value={birthDate}
              onChange={(e) => handleDateChange(e.target.value)}
              maxLength={10}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="mb-2 block font-semibold text-muted-foreground">
              WhatsApp / Celular
            </label>
            <IconInput
              icon={Phone}
              placeholder="(DD) 99999-9999"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              maxLength={15}
              inputMode="tel"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => handleSelectDepartment(dept)}
              className={cn(
                "flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors",
                selectedDepartment?.id === dept.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex-1">
                <p className="text-lg font-bold">{dept.name}</p>
                {dept.description && (
                  <p className="text-xs text-muted-foreground">{dept.description}</p>
                )}
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <p className="mb-1 text-muted-foreground">
            Dentro de <span className="font-bold text-foreground">{selectedDepartment?.name}</span>, qual sua área?
          </p>
          {subDepartments.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubDepartment(sub)}
              className={cn(
                "flex items-center justify-between rounded-xl border-2 p-4 text-left transition-colors",
                selectedSubDepartment?.id === sub.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <span className="text-lg font-bold">{sub.name}</span>
              {selectedSubDepartment?.id === sub.id && (
                <CheckCircle className="size-6 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-3">
          <p className="mb-1 text-muted-foreground">
            O que você faz em{" "}
            <span className="font-bold text-foreground">
              {selectedSubDepartment?.name || selectedDepartment?.name}
            </span>
            ?
          </p>
          {functions.length > 0 ? (
            functions.map((func) => {
              const isSelected = selectedFunctions.includes(func.id)
              return (
                <button
                  key={func.id}
                  onClick={() => toggleFunction(func.id)}
                  className={cn(
                    "flex items-center rounded-xl border-2 p-4 text-left transition-colors",
                    isSelected ? "border-primary bg-primary/10" : "border-border bg-card"
                  )}
                >
                  <span className="mr-3">
                    {isSelected ? (
                      <CheckSquare className="size-6 text-primary" />
                    ) : (
                      <Square className="size-6 text-muted-foreground" />
                    )}
                  </span>
                  <span className="text-lg font-semibold">{func.name}</span>
                </button>
              )
            })
          ) : (
            <p className="py-10 text-center text-muted-foreground">
              Nenhuma função encontrada para este departamento.
            </p>
          )}
        </div>
      )}

      <div className="mb-10 mt-8 flex justify-between gap-4">
        {step > 1 ? (
          <Button variant="secondary" size="lg" onClick={goBackStep}>
            <ArrowLeft className="size-5" />
          </Button>
        ) : (
          <div />
        )}

        {step === 4 ? (
          <Button
            size="lg"
            disabled={saving}
            onClick={handleFinish}
            className="flex-1 bg-success shadow-lg hover:bg-success/90"
          >
            {saving ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="size-5" />
                Concluir
              </>
            )}
          </Button>
        ) : (
          <Button size="lg" onClick={goNextStep} className="flex-1 shadow-lg">
            Próximo
            <ChevronRight className="size-5" />
          </Button>
        )}
      </div>

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
