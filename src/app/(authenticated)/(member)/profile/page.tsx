"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Calendar, Loader2, LogOut, Phone, User } from "lucide-react"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useProfile } from "@/features/profile/useProfile"

export default function ProfilePage() {
  const router = useRouter()
  const {
    profile,
    loading,
    saving,
    editingName,
    setEditingName,
    editingPhone,
    editingBirthDate,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSaveProfile,
    handleLogout,
    getInitials,
    closeModal,
  } = useProfile()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="rounded-lg bg-muted p-2">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-xl font-bold">Meu Perfil</h1>
          <button onClick={handleLogout} className="rounded-lg bg-destructive/10 p-2">
            <LogOut className="size-5 text-destructive" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-lg p-6">
        <div className="mb-8 flex flex-col items-center">
          <div className="opacity-80">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.full_name || "Avatar"}
                width={96}
                height={96}
                className="size-24 rounded-full border-4 border-background object-cover"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full border-4 border-background bg-muted">
                <span className="text-2xl font-bold text-muted-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            (Alteração de foto temporariamente indisponível)
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Dados Pessoais</h2>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveProfile()
            }}
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Nome Completo
              </label>
              <IconInput icon={User} value={editingName} onChange={(e) => setEditingName(e.target.value)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Data de Nascimento
              </label>
              <IconInput
                icon={Calendar}
                placeholder="DD/MM/AAAA"
                value={editingBirthDate}
                onChange={(e) => handleDateChange(e.target.value)}
                maxLength={10}
                inputMode="numeric"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                WhatsApp / Celular
              </label>
              <IconInput
                icon={Phone}
                placeholder="(DD) 99999-9999"
                value={editingPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={15}
                inputMode="tel"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center rounded-lg bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : "Salvar Alterações"}
            </button>
          </form>
        </div>
      </div>

      <FeedbackModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={closeModal}
      />
    </div>
  )
}
