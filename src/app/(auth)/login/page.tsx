"use client"

import Link from "next/link"
import { Calendar, Eye, EyeOff, Loader2, LogIn, Mail, Lock, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useLogin } from "@/features/auth/useLogin"

export default function LoginPage() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    showPassword,
    setShowPassword,
    modalConfig,
    closeModal,
    handleSignIn,
  } = useLogin()

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-12 w-full max-w-md rounded-lg border bg-card p-8 shadow-2xl shadow-primary/5">
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-5 rounded-full bg-primary p-4 shadow-lg shadow-primary/30">
            <Calendar className="size-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight">Escala Verbo</h1>
          <p className="text-center text-sm font-medium text-muted-foreground">
            Gerencie suas escalas de forma simples
          </p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleSignIn()
          }}
        >
          <IconInput
            icon={Mail}
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <IconInput
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
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

          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-primary">
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="shadow-lg shadow-primary/20">
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <LogIn className="size-5" />
                Entrar
              </>
            )}
          </Button>

          <Button asChild variant="outline" size="lg" disabled={loading}>
            <Link href="/signup">
              <UserPlus className="size-5" />
              Criar nova conta
            </Link>
          </Button>
        </form>
      </div>

      <div className="flex flex-col items-center">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Versão 1.0.0</p>
        <a
          href="https://johnrodrigues.xyz"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:opacity-70"
        >
          Developed by <span className="font-bold text-primary">John Rodrigues</span>
        </a>
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
