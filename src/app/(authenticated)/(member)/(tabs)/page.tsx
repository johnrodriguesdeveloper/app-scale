import Link from "next/link"
import Image from "next/image"
import { Calendar, ChevronRight, Clock, MapPin, User } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { NotificationShortcut } from "@/components/nav/notification-shortcut"

function formatScaleDate(dateString: string) {
  try {
    return format(parseISO(dateString), "EEE, dd 'de' MMM", { locale: ptBR })
  } catch {
    return dateString
  }
}

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", user!.id)
    .single()

  const userName = profile?.full_name?.split(" ")[0] || "Membro"
  const avatarUrl = profile?.avatar_url

  const { data: memberRecords } = await supabase
    .from("department_members")
    .select("id")
    .eq("user_id", user!.id)

  const memberIds = (memberRecords ?? []).map((m) => m.id).filter((id): id is string => !!id)
  const today = new Date().toISOString().split("T")[0]

  const { data: nextScale } = memberIds.length
    ? await supabase
        .from("rosters")
        .select("schedule_date, department_functions(name), departments(name), service_days(name)")
        .in("member_id", memberIds)
        .gte("schedule_date", today)
        .order("schedule_date", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null }

  return (
    <div className="pb-10">
      <div className="mb-8 flex items-start justify-between border-b border-border px-6 pb-4 pt-8">
        <div className="flex items-center">
          <span className="text-base font-medium text-muted-foreground">Olá,</span>
          <span className="ml-1 text-xl font-bold tracking-tight">{userName} 👋</span>
        </div>

        <Link href="/profile" className="rounded-full shadow-sm">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={48}
              height={48}
              className="size-12 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <User className="size-6 text-muted-foreground" />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-col gap-4 px-6">
        <Link
          href="/my-scales"
          className="flex items-center rounded-3xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50"
        >
          <div className="mr-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Calendar className="size-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">Minha Agenda</p>
            {nextScale ? (
              <div className="mt-1">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sua próxima escala
                </p>
                <p className="text-sm font-semibold capitalize text-primary">
                  {formatScaleDate(nextScale.schedule_date)}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {nextScale.departments?.name} • {nextScale.department_functions?.name}
                </p>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">Nenhuma escala próxima</p>
            )}
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <Link
          href="/availability"
          className="flex items-center rounded-3xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50"
        >
          <div className="mr-5 flex size-14 items-center justify-center rounded-2xl bg-warning/10">
            <Clock className="size-6 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">Disponibilidade</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Informe ausências</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <Link
          href="/departments"
          className="flex items-center rounded-3xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/50"
        >
          <div className="mr-5 flex size-14 items-center justify-center rounded-2xl bg-muted">
            <MapPin className="size-6 text-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold">Departamentos</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Gerencie seus grupos</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        <NotificationShortcut />
      </div>
    </div>
  )
}
