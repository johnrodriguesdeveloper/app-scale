"use client"

import { CheckCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconInput } from "@/components/form/icon-input"
import { FeedbackModal } from "@/components/FeedbackModal"
import { useUpdatePassword } from "@/features/auth/useUpdatePassword"

export default function UpdatePasswordPage() {
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    modalConfig,
    handleUpdate,
    handleCloseModal,
  } = useUpdatePassword()

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 rounded-full bg-primary p-4 shadow-lg shadow-primary/20">
            <Lock className="size-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Nova Senha</h1>
          <p className="text-center text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleUpdate()
          }}
        >
          <IconInput
            icon={Lock}
            type={showPassword ? "text" : "password"}
            placeholder="Nova Senha"
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

          <IconInput
            icon={Lock}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmar Nova Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
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
            disabled={loading || !password || !confirmPassword}
            className="shadow-lg"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="size-5" />
                Salvar Nova Senha
              </>
            )}
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
