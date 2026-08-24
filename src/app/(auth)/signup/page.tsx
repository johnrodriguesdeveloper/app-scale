"use client"

import Link from "next/link"
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, User, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useSignup } from "@/features/auth/useSignup"

export default function SignupPage() {
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    errors,
    modalConfig,
    validateField,
    isFormValid,
    handleSignUp,
    handleCloseModal,
  } = useSignup()

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-2xl shadow-primary/5">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 rounded-full bg-primary p-4 shadow-lg shadow-primary/30">
            <UserPlus className="size-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight">Criar Conta</h1>
          <p className="text-center text-sm font-medium text-muted-foreground">
            Preencha os dados abaixo para começar
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSignUp()
          }}
        >
          <IconInput
            icon={User}
            placeholder="Nome Completo"
            autoComplete="name"
            value={fullName}
            error={errors.fullName}
            disabled={loading}
            onChange={(e) => {
              setFullName(e.target.value)
              validateField("fullName", e.target.value)
            }}
          />

          <IconInput
            icon={Mail}
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            error={errors.email}
            disabled={loading}
            onChange={(e) => {
              setEmail(e.target.value)
              validateField("email", e.target.value)
            }}
          />

          <IconInput
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            disabled={loading}
            onChange={(e) => {
              setPassword(e.target.value)
              validateField("password", e.target.value)
              if (confirmPassword) validateField("confirmPassword", confirmPassword, e.target.value)
            }}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
          />

          <IconInput
            icon={Lock}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmar Senha"
            autoComplete="new-password"
            value={confirmPassword}
            error={errors.confirmPassword}
            disabled={loading}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              validateField("confirmPassword", e.target.value, password)
            }}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            }
          />

          <Button
            type="submit"
            size="lg"
            disabled={loading || !isFormValid()}
            className="mt-2 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="size-5" />
                Criar Conta
              </>
            )}
          </Button>

          <Button asChild variant="ghost" disabled={loading}>
            <Link href="/login">
              <ArrowLeft className="size-4" />
              Já tem uma conta? <span className="text-primary">Entrar</span>
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
