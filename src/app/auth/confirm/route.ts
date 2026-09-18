import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const next = request.nextUrl.searchParams.get("next") || "/"

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

    if (!error) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = next
      redirectUrl.search = ""
      return NextResponse.redirect(redirectUrl)
    }
  }

  const errorUrl = request.nextUrl.clone()
  errorUrl.pathname = "/forgot-password"
  errorUrl.search = ""
  return NextResponse.redirect(errorUrl)
}
