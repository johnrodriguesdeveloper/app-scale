import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { count } = await supabase
    .from("department_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)

  if (!count) {
    redirect("/onboarding")
  }

  return <>{children}</>
}
