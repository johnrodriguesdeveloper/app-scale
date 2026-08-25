import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  AVAILABILITY_DEADLINE_DAY,
  getDeadlineDateStr,
  getTomorrowDateStr,
  isDeadlineDay,
  isThreeDaysBeforeDeadline,
} from "@/features/notifications/notificationSchedule"
import type { Database } from "@/types/database"

webpush.setVapidDetails(
  "mailto:contato@escalaverbo.app",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

type NotificationType = Database["public"]["Tables"]["notification_log"]["Row"]["type"]

interface PendingNotification {
  userId: string
  type: NotificationType
  targetDate: string
  title: string
  body: string
  url: string
}

function getToday(request: NextRequest): Date {
  const simulateDate = request.nextUrl.searchParams.get("simulateDate")
  if (simulateDate && process.env.VERCEL_ENV !== "production") {
    return new Date(`${simulateDate}T12:00:00`)
  }
  return new Date()
}

async function buildShiftReminders(
  supabase: ReturnType<typeof createServiceRoleClient>,
  today: Date
): Promise<PendingNotification[]> {
  const tomorrow = getTomorrowDateStr(today)

  const { data: rows } = await supabase
    .from("rosters")
    .select("member_id, department_members(user_id)")
    .eq("schedule_date", tomorrow)
    .not("member_id", "is", null)

  const userIds = new Set<string>()
  for (const row of rows ?? []) {
    const userId = row.department_members?.user_id
    if (userId) userIds.add(userId)
  }

  return Array.from(userIds).map((userId) => ({
    userId,
    type: "shift_reminder" as const,
    targetDate: tomorrow,
    title: "Você está escalado amanhã",
    body: "Confira os detalhes da sua escala de amanhã no Escala Verbo.",
    url: "/my-scales",
  }))
}

async function buildDeadlineReminders(
  supabase: ReturnType<typeof createServiceRoleClient>,
  today: Date
): Promise<PendingNotification[]> {
  const threeDaysBefore = isThreeDaysBeforeDeadline(today)
  const deadlineDay = isDeadlineDay(today)
  if (!threeDaysBefore && !deadlineDay) return []

  const { data: rows } = await supabase.from("department_members").select("user_id")

  const userIds = new Set<string>()
  for (const row of rows ?? []) {
    if (row.user_id) userIds.add(row.user_id)
  }

  const targetDate = getDeadlineDateStr(today)
  const type: NotificationType = threeDaysBefore ? "availability_deadline_3d" : "availability_deadline_today"
  const title = threeDaysBefore
    ? `Faltam 3 dias para o prazo (dia ${AVAILABILITY_DEADLINE_DAY})`
    : "Hoje é o último dia para preencher sua disponibilidade"
  const body = "Preencha sua disponibilidade do próximo mês no Escala Verbo."

  return Array.from(userIds).map((userId) => ({
    userId,
    type,
    targetDate,
    title,
    body,
    url: "/availability",
  }))
}

async function sendAndLog(
  supabase: ReturnType<typeof createServiceRoleClient>,
  notifications: PendingNotification[]
) {
  let sent = 0

  for (const notification of notifications) {
    const { data: existing } = await supabase
      .from("notification_log")
      .select("id")
      .eq("user_id", notification.userId)
      .eq("type", notification.type)
      .eq("target_date", notification.targetDate)
      .maybeSingle()

    if (existing) continue

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", notification.userId)

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url,
    })

    for (const subscription of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id)
        }
      }
    }

    await supabase.from("notification_log").insert({
      user_id: notification.userId,
      type: notification.type,
      target_date: notification.targetDate,
    })
    sent += 1
  }

  return sent
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const today = getToday(request)

  const notifications = [
    ...(await buildShiftReminders(supabase, today)),
    ...(await buildDeadlineReminders(supabase, today)),
  ]

  const sent = await sendAndLog(supabase, notifications)

  return NextResponse.json({ candidates: notifications.length, sent })
}
