"use client"

import Link from "next/link"
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useForgotPassword } from "@/features/auth/useForgotPassword"

export default function ForgotPasswordPage() {
  const { email, setEmail, loading, modalConfig, handleResetPassword, handleCloseModal } =
    useForgotPassword()

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-primary p-4 shadow-lg shadow-primary/20">
            <KeyRound className="size-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Recuperar Senha</h1>
          <p className="text-center text-muted-foreground">
            Digite seu email para receber o link de redefinição
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleResetPassword()
          }}
        >
          <IconInput
            icon={Mail}
            type="email"
            placeholder="Seu email cadastrado"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Button type="submit" size="lg" disabled={loading || !email.trim()} className="shadow-lg">
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Enviar Link"}
          </Button>

          <Button asChild variant="ghost" disabled={loading}>
            <Link href="/login">
              <ArrowLeft className="size-4" />
              Voltar para o Login
            </Link>
          </Button>
        </form>
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
