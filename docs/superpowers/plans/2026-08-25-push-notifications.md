# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send Web Push reminders to volunteers — 24h before a shift, and 3 days before / on the availability deadline (the 20th) — via a daily Vercel Cron job.

**Architecture:** A service worker `push` handler (added to the existing `src/app/sw.ts`) displays OS notifications; a client hook lets members opt in, storing their `PushSubscription` in the existing (currently unused) `push_subscriptions` table; a single daily Vercel Cron hits a protected Route Handler that queries `rosters`/`department_members`, sends via the `web-push` npm package, and logs each send in a new `notification_log` table to stay idempotent.

**Tech Stack:** Next.js 16 (Turbopack) App Router Route Handlers, Supabase (`@supabase/supabase-js` service-role client for the cron, `@supabase/ssr` for the subscribe routes), `web-push`, `date-fns`, Vercel Cron Jobs.

**Spec:** `docs/superpowers/specs/2026-08-25-push-notifications-design.md`

## Global Constraints

- No semicolons, double quotes — matches the existing style in `src/features/*`, `src/lib/supabase/*`, and `src/proxy.ts` (all new files in this plan follow that, not the semicolon style used in the earlier `src/app/{layout,manifest,sw}.ts` PWA files).
- This repo has no test framework (no vitest/jest, no `*.test.*` files anywhere) — do not add one. Verification is `tsc --noEmit`, `eslint`, `next build`, plus the manual/curl procedures each task specifies.
- No Supabase CLI is configured in this repo (no `supabase/config.toml`, no migrations directory, no `supabase` binary on PATH) — SQL migrations are saved as files for the record but must be applied manually by the user in the Supabase SQL editor.
- Vercel Hobby plan: cron jobs run **at most once per day**, with only per-hour (not per-minute) precision — confirmed against Vercel's current docs. `0 12 * * *` (UTC) is once daily and compliant.
- Vercel's documented cron security pattern: compare `request.headers.get("authorization")` against `` `Bearer ${process.env.CRON_SECRET}` `` — Vercel automatically sends that header on its own cron invocations.
- `web-push`'s `sendNotification` takes `{ endpoint, keys: { p256dh, auth } }` — note `p256dh`/`auth` are nested under `keys`, not flat, even though the `push_subscriptions` table stores them as flat columns.
- Every `user_id` column touched in this feature (`department_members.user_id`, `push_subscriptions.user_id`, `notification_log.user_id`) holds the raw Supabase Auth uid directly — no join through `profiles` is needed or correct.
- Real secrets (`VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) go in `.env.local` (already gitignored via `.env*` in `.gitignore`) — never commit them, and Vercel's project env vars must be set separately by the user (no CLI/dashboard access available here).

---

### Task 1: Database migration — `notification_log` table and `push_subscriptions` RLS

**Files:**
- Create: `supabase/migrations/20260825_push_notifications.sql`
- Modify: `src/types/database.ts` (insert a `notification_log` table entry between the existing `member_unavailability` and `organizations` entries, to keep the file's alphabetical ordering)

**Interfaces:**
- Produces: a `notification_log` table with columns `id, user_id, type, target_date, sent_at` and a unique constraint on `(user_id, type, target_date)`, used by Task 6. A unique constraint on `push_subscriptions.endpoint`, relied on by Task 7's upsert.

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260825_push_notifications.sql

alter table push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);

alter table push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null check (type in ('shift_reminder', 'availability_deadline_3d', 'availability_deadline_today')),
  target_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, type, target_date)
);

alter table notification_log enable row level security;
```

- [ ] **Step 2: Add the `notification_log` type to `src/types/database.ts`**

Insert this table entry (matching the existing style of the file) right after the `member_unavailability` entry closes and before the `organizations` entry starts:

```ts
      notification_log: {
        Row: {
          id: string
          sent_at: string | null
          target_date: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string | null
          target_date: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string | null
          target_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Tell the user to apply the migration**

Report to the user: "Run the SQL in `supabase/migrations/20260825_push_notifications.sql` against your Supabase project (SQL editor at https://supabase.com/dashboard/project/liivdavkqtateyczqqbq/sql, or `supabase db push` if you have the CLI set up locally). The rest of this feature can be built and compiled without it, but sending/receiving won't work end-to-end until it's applied." This is a manual step outside the repo — do not attempt to run it yourself.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260825_push_notifications.sql src/types/database.ts
git commit -m "feat: add notification_log table and push_subscriptions RLS migration"
```

---

### Task 2: `web-push` dependency and VAPID keys

**Files:**
- Modify: `package.json` (add `web-push` dependency, `@types/web-push` devDependency)
- Modify: `.env.local` (add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` — not committed, `.env*` is gitignored)

**Interfaces:**
- Produces: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (read by Task 8's client hook), `VAPID_PRIVATE_KEY` (read by Task 6's cron route), `SUPABASE_SERVICE_ROLE_KEY` (read by Task 4), `CRON_SECRET` (read by Task 6).

- [ ] **Step 1: Install `web-push`**

Run: `npm install web-push && npm install -D @types/web-push`

- [ ] **Step 2: Generate a VAPID key pair**

Run: `node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"`
This prints `{"publicKey":"...","privateKey":"..."}`.

- [ ] **Step 3: Add the generated keys and remaining secrets to `.env.local`**

Append (using the real values from Step 2 for the VAPID lines):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey from step 2>
VAPID_PRIVATE_KEY=<privateKey from step 2>
SUPABASE_SERVICE_ROLE_KEY=<paste from Supabase dashboard > Project Settings > API>
CRON_SECRET=<a random string, e.g. output of: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))">
```

`SUPABASE_SERVICE_ROLE_KEY` needs to be fetched from the Supabase dashboard by the user (not something I can retrieve) — if it's not available yet, leave that line with a placeholder and flag it; Task 4 onward won't run end-to-end without it, but everything still type-checks and builds.

- [ ] **Step 4: Report the required Vercel env vars to the user**

Report: "Add these same four variables (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) to the Vercel project's Environment Variables settings — I don't have access to change those myself."

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add web-push dependency"
```

(`.env.local` is gitignored and is not part of this commit.)

---

### Task 3: Service worker push handling

**Files:**
- Modify: `src/app/sw.ts:1-11` (imports/types section) and end of file (after `serwist.registerCapture` calls, before `serwist.addEventListeners()`)

**Interfaces:**
- Consumes: nothing new.
- Produces: the runtime contract Task 6's payload must match — `event.data.json()` is expected to be `{ title: string, body: string, url: string }`.

- [ ] **Step 1: Add the `push` and `notificationclick` listeners**

In `src/app/sw.ts`, insert this immediately before the existing `serwist.addEventListeners()` call at the end of the file:

```ts
self.addEventListener("push", (event) => {
  const data = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
  event.waitUntil(
    self.registration.showNotification(data?.title ?? "Escala Verbo", {
      body: data?.body,
      icon: "/icons/icon-192.png",
      data: { url: data?.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
```

Keep this file's existing semicolon style (it already uses semicolons, unlike the rest of this plan's new files).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (`PushEvent`/`NotificationEvent` come from the `webworker` lib already added to `tsconfig.json` in the earlier PWA work.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds, and the build log's `(serwist)` line still reports precache entries with no esbuild errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/sw.ts
git commit -m "feat: handle push and notificationclick events in the service worker"
```

---

### Task 4: Supabase service-role client

**Files:**
- Create: `src/lib/supabase/service-role.ts`

**Interfaces:**
- Produces: `createServiceRoleClient(): SupabaseClient<Database>` — a client that bypasses RLS, used by Task 6.

- [ ] **Step 1: Write the client**

```ts
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/service-role.ts
git commit -m "feat: add Supabase service-role client helper"
```

---

### Task 5: Notification scheduling logic (pure functions)

**Files:**
- Create: `src/features/notifications/notificationSchedule.ts`

**Interfaces:**
- Produces: `AVAILABILITY_DEADLINE_DAY: number`, `getTomorrowDateStr(today: Date): string`, `isThreeDaysBeforeDeadline(today: Date): boolean`, `isDeadlineDay(today: Date): boolean`, `getDeadlineDateStr(today: Date): string` — all consumed by Task 6.

- [ ] **Step 1: Write the module**

```ts
import { addDays, format, getDate, setDate } from "date-fns"

export const AVAILABILITY_DEADLINE_DAY = 20

export function getTomorrowDateStr(today: Date): string {
  return format(addDays(today, 1), "yyyy-MM-dd")
}

export function isThreeDaysBeforeDeadline(today: Date): boolean {
  return getDate(today) === AVAILABILITY_DEADLINE_DAY - 3
}

export function isDeadlineDay(today: Date): boolean {
  return getDate(today) === AVAILABILITY_DEADLINE_DAY
}

export function getDeadlineDateStr(today: Date): string {
  return format(setDate(today, AVAILABILITY_DEADLINE_DAY), "yyyy-MM-dd")
}
```

- [ ] **Step 2: Manually verify the date logic**

Run (no test framework in this repo, so this is a one-off manual check, not a committed test file):

```bash
node -e "
const { isThreeDaysBeforeDeadline, isDeadlineDay, getTomorrowDateStr, getDeadlineDateStr } = require('./src/features/notifications/notificationSchedule.ts');
"
```

This will fail directly with `node` since the file is TypeScript — instead verify it inline in the plan by reasoning: for `today = new Date('2026-08-17')`, `isThreeDaysBeforeDeadline` must return `true` and `isDeadlineDay` must return `false`; for `today = new Date('2026-08-20')`, the reverse. `getDeadlineDateStr(new Date('2026-08-17'))` must equal `'2026-08-20'`. Confirm this by reading the implementation against these three cases rather than executing it — `getDate`/`setDate` are date-fns's local-calendar-day functions (not UTC), which matches the "day of month" framing the whole feature is built around.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/notifications/notificationSchedule.ts
git commit -m "feat: add pure date-logic for notification scheduling"
```

---

### Task 6: Cron route handler, and excluding it from the auth proxy

**Files:**
- Create: `src/app/api/cron/notifications/route.ts`
- Modify: `src/proxy.ts:50-53` (the `config.matcher` regex)

**Interfaces:**
- Consumes: `createServiceRoleClient` (Task 4), `AVAILABILITY_DEADLINE_DAY`/`getTomorrowDateStr`/`isThreeDaysBeforeDeadline`/`isDeadlineDay`/`getDeadlineDateStr` (Task 5), the `push` payload contract `{ title, body, url }` (Task 3), `Database` type's `notification_log`/`push_subscriptions`/`rosters`/`department_members` tables (Task 1).
- Produces: nothing consumed elsewhere in this plan — this is the terminal orchestration point.

- [ ] **Step 1: Fix the auth proxy so the cron route is reachable**

`src/proxy.ts` currently redirects any request without a logged-in session to `/login` — but Vercel's cron invocation has no browser session at all (it authenticates via the `CRON_SECRET` header, not cookies), so without this fix the cron would always be redirected before reaching our handler. Change:

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|serwist|~offline|.*\\.png$).*)",
  ],
}
```

to:

```ts
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|serwist|~offline|api/cron|.*\\.png$).*)",
  ],
}
```

- [ ] **Step 2: Write the cron route**

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. If `rosters(...).select("member_id, department_members(user_id)")` doesn't type-check because of the embedded-resource shape, adjust the select to `"member_id, department_members!inner(user_id)"` and re-run — Supabase's generated types are stricter about nullable joins with a plain relation name.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds, `/api/cron/notifications` appears in the route list as a dynamic (`ƒ`) route.

- [ ] **Step 5: Manually verify locally**

With `.env.local` fully populated (Task 2) and the migration applied (Task 1), run `npm run dev`, then in another terminal:

```bash
curl -i "http://localhost:3000/api/cron/notifications?simulateDate=2026-08-17" -H "Authorization: Bearer $CRON_SECRET"
```

Expected: `200` with a JSON body like `{"candidates":N,"sent":N}`. Running the exact same command again should report the same `candidates` but `sent: 0` (idempotency — already logged). Without `CRON_SECRET` set correctly, expect `401`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/notifications/route.ts src/proxy.ts
git commit -m "feat: add cron route to send shift and availability-deadline push notifications"
```

---

### Task 7: Subscribe/unsubscribe API routes

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`
- Create: `src/app/api/push/unsubscribe/route.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server` (existing).
- Produces: `POST /api/push/subscribe` (body: `PushSubscriptionJSON`), `POST /api/push/unsubscribe` (body: `{ endpoint: string }`) — both consumed by Task 8's hook.

- [ ] **Step 1: Write the subscribe route**

```ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const subscription = (await request.json()) as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Write the unsubscribe route**

```ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { endpoint } = (await request.json()) as { endpoint: string }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit -p tsconfig.json && npm run build`
Expected: no errors; both routes appear in the build's route list.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/push
git commit -m "feat: add push subscription create/delete API routes"
```

---

### Task 8: `usePushSubscription` client hook

**Files:**
- Create: `src/features/pwa/usePushSubscription.ts`

**Interfaces:**
- Consumes: `POST /api/push/subscribe`, `POST /api/push/unsubscribe` (Task 7), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Task 2).
- Produces: `usePushSubscription(): { isSupported: boolean, isSubscribed: boolean, loading: boolean, subscribe: () => Promise<void>, unsubscribe: () => Promise<void> }` — consumed by Task 9.

- [ ] **Step 1: Write the hook**

```ts
"use client"

import { useCallback, useEffect, useState } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check, not available during SSR
      setLoading(false)
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time capability check, not available during SSR
    setIsSupported(true)

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setIsSubscribed(subscription !== null)
        setLoading(false)
      })
  }, [])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })
      setIsSubscribed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { isSupported, isSubscribed, loading, subscribe, unsubscribe }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint src/features/pwa/usePushSubscription.ts`
Expected: no errors (the two `set-state-in-effect` disables are pre-justified with inline comments, matching the precedent already established in `src/features/pwa/useInstallPrompt.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/features/pwa/usePushSubscription.ts
git commit -m "feat: add usePushSubscription hook"
```

---

### Task 9: Settings page toggle

**Files:**
- Modify: `src/app/(authenticated)/(member)/(tabs)/settings/page.tsx:1-45`

**Interfaces:**
- Consumes: `usePushSubscription` (Task 8), `Switch` from `@/components/ui/switch` (existing, already imported in this file).

- [ ] **Step 1: Add the toggle**

In `src/app/(authenticated)/(member)/(tabs)/settings/page.tsx`, add the import and hook call:

```ts
import { usePushSubscription } from "@/features/pwa/usePushSubscription"
```

```ts
  const { isSupported, isSubscribed, loading, subscribe, unsubscribe } = usePushSubscription()
```

Then insert a new card between the "Aparência" section and the "Conta" section (matching the existing card structure used for "Modo Escuro"):

```tsx
        {isSupported && (
          <>
            <p className="mb-3 mt-8 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notificações
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold">Lembretes</p>
                    <p className="text-xs text-muted-foreground">
                      Escalas e prazo de disponibilidade
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isSubscribed}
                  disabled={loading}
                  onCheckedChange={(checked) => (checked ? subscribe() : unsubscribe())}
                />
              </div>
            </div>
          </>
        )}
```

Add `Bell` to the existing `lucide-react` import line (`ChevronRight, LogOut, Moon, Sun, User` becomes `Bell, ChevronRight, LogOut, Moon, Sun, User`).

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(authenticated)/(member)/(tabs)/settings/page.tsx"`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manually verify in a browser**

With `npm run start` (production build — the service worker only registers meaningfully in production), open Settings while logged in. Toggle "Lembretes" on: browser prompts for notification permission, then the switch turns on. Reload the page: the switch is still on (reads the existing subscription). Toggle it off: switch turns off, and the corresponding row in `push_subscriptions` is deleted (check in the Supabase dashboard).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(authenticated)/(member)/(tabs)/settings/page.tsx"
git commit -m "feat: add notification opt-in toggle to Settings"
```

---

### Task 10: Vercel Cron configuration

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: `GET /api/cron/notifications` (Task 6).

- [ ] **Step 1: Write the cron config**

```json
{
  "crons": [{ "path": "/api/cron/notifications", "schedule": "0 12 * * *" }]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: schedule the daily notification cron on Vercel"
```

- [ ] **Step 3: Report deployment follow-up to the user**

Report: "Once this is pushed and deployed, and once you've applied the Task 1 migration and set the four env vars from Task 2 in Vercel's project settings, the cron will run daily at 09:00 America/Sao_Paulo (Vercel Hobby only guarantees per-hour precision, not the exact minute). You can also trigger it manually from the Vercel dashboard's Cron Jobs tab to test in production."

---

## Self-Review Notes

- **Spec coverage**: shift reminder (Task 6), deadline −3/deadline-today (Task 6, using Task 5's date logic), Web Push delivery via existing `push_subscriptions` (Tasks 1, 7, 8), `notification_log` idempotency (Tasks 1, 6), service worker `push`/`notificationclick` (Task 3), Vercel Cron + `CRON_SECRET` (Tasks 6, 10), VAPID keys (Task 2), Settings UI (Task 9), the `auth.uid()`-is-the-join-key finding (used directly in Task 6's queries, called out in Global Constraints) — all covered.
- **Proxy fix**: not in the original spec text explicitly as a task, but required for Task 6 to function at all (Vercel Cron has no session cookie); added as Task 6 Step 1 rather than a separate task since it's meaningless without the route it protects access to.
- **Type consistency check**: `PendingNotification`'s `type` field is typed as `Database["public"]["Tables"]["notification_log"]["Row"]["type"]` (a plain `string` per the Task 1 type addition, not a literal union) — the `as const` literals assigned to it (`"shift_reminder"`, etc.) are still valid since a literal is assignable to `string`. `usePushSubscription`'s return shape (`isSupported`, `isSubscribed`, `loading`, `subscribe`, `unsubscribe`) matches exactly what Task 9 destructures.
