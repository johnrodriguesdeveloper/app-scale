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

async function sendOne(subscription: Database["public"]["Tables"]["push_subscriptions"]["Row"], payload: string) {
  try {
    await Promise.race([
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload
      ),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("web-push send timed out")), 10_000)
      ),
    ])
    return null
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    return statusCode === 404 || statusCode === 410 ? subscription.id : null
  }
}

async function sendAndLog(
  supabase: ReturnType<typeof createServiceRoleClient>,
  notifications: PendingNotification[]
) {
  if (notifications.length === 0) return 0

  const userIds = Array.from(new Set(notifications.map((n) => n.userId)))

  const { data: existingLogs } = await supabase
    .from("notification_log")
    .select("user_id, type, target_date")
    .in("user_id", userIds)

  const alreadySent = new Set(
    (existingLogs ?? []).map((log) => `${log.user_id}:${log.type}:${log.target_date}`)
  )
  const pending = notifications.filter((n) => !alreadySent.has(`${n.userId}:${n.type}:${n.targetDate}`))
  if (pending.length === 0) return 0

  const pendingUserIds = Array.from(new Set(pending.map((n) => n.userId)))
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", pendingUserIds)

  const subscriptionsByUser = new Map<string, typeof subscriptions>()
  for (const subscription of subscriptions ?? []) {
    const list = subscriptionsByUser.get(subscription.user_id) ?? []
    list.push(subscription)
    subscriptionsByUser.set(subscription.user_id, list)
  }

  const results = await Promise.all(
    pending.map((notification) => {
      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        url: notification.url,
      })
      const userSubscriptions = subscriptionsByUser.get(notification.userId) ?? []
      return Promise.all(userSubscriptions.map((subscription) => sendOne(subscription, payload)))
    })
  )

  const expiredIds = results.flat().filter((id): id is string => id !== null)
  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds)
  }

  await supabase.from("notification_log").insert(
    pending.map((n) => ({ user_id: n.userId, type: n.type, target_date: n.targetDate }))
  )

  return pending.length
}

export const maxDuration = 60

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
