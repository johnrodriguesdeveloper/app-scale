# Push Notifications — Design

## Context

Escala Verbo needs to remind volunteers about two things, via Web Push:

1. **Shift reminder** — 24 hours before they're scheduled (`rosters.schedule_date`).
2. **Availability deadline** — the app already has a hardcoded cutoff, `DIA_CORTE = 20`, in `src/utils/getTargetMonthDate.ts` (after the 20th, editing the availability calendar targets the month after next instead of next month). Two reminders around it: 3 days before (the 17th) and on the day itself (the 20th).

The database already has an unused `push_subscriptions` table (`endpoint`, `p256dh`, `auth`, `user_id`) — no application code references it yet, and it has no RLS policies. The PWA service worker built in the previous round (`src/app/sw.ts`) doesn't handle `push` events yet. The app is deployed on Vercel (Hobby plan).

Every `user_id` column across this schema (`department_members`, `availability_routine`, `push_subscriptions`, etc.) stores the raw Supabase Auth uid directly — confirmed by reading the app's existing queries (e.g. `useAvailability.ts` does `.eq("user_id", user.id)` straight off `supabase.auth.getUser()`), not by trusting the generated `Database` type's relationship metadata, which inconsistently shows some of these columns FK'd to `profiles.id` and others to nothing. This matters because it means no join through `profiles` is needed anywhere in this feature.

**Confirmed decisions from brainstorming:**
- Delivery: Web Push, using the existing `push_subscriptions` table, triggered by a single daily Vercel Cron job.
- "Hasn't filled availability" has no real signal in the data model (no submission event — untouched rows just default to "available"), so both deadline reminders are sent to **every** member unconditionally, not gated on completion.

## Data model changes

### New table: `notification_log`

Makes the cron idempotent — if it reruns or is manually retried the same day, nobody gets double-notified.

```sql
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

No policies are added — only the server's service-role client (which bypasses RLS) ever touches this table, so RLS-with-no-policies correctly blocks it from every client-side key.

### `push_subscriptions`: add RLS and a uniqueness constraint

Currently has no RLS policies (inaccessible to the client) and no unique constraint on `endpoint` (so re-subscribing the same browser would insert duplicate rows instead of updating).

```sql
alter table push_subscriptions add constraint push_subscriptions_endpoint_key unique (endpoint);

alter table push_subscriptions enable row level security;

drop policy if exists "Users can manage their own push subscriptions" on push_subscriptions;
create policy "Users can manage their own push subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

**Manual deployment step**: there's no Supabase CLI configured in this repo (no `supabase/config.toml`, no migrations directory, no `supabase` binary on PATH) and I have no direct DB access. The SQL above will be saved as `supabase/migrations/20260825_push_notifications.sql` for the record, but you'll need to run it yourself in the Supabase SQL editor (or via `supabase db push` if you set up the CLI locally) before the feature will work end to end.

## Subscribe flow (client)

- `src/features/pwa/usePushSubscription.ts` — client hook. On mount (in an effect, for the same SSR-safety reason as `useInstallPrompt`), checks `navigator.serviceWorker.ready` → `registration.pushManager.getSubscription()` to report current state (`isSubscribed`, `loading`, `isSupported`). Exposes `subscribe()` (requests `Notification` permission, calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <public key> })`, POSTs the resulting `PushSubscriptionJSON` to `/api/push/subscribe`) and `unsubscribe()` (calls the subscription's own `.unsubscribe()`, then POSTs `{ endpoint }` to `/api/push/unsubscribe`).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var carries the public key to the client.
- UI: a "Notificações" row with the existing `Switch` component, added to `src/app/(authenticated)/(member)/(tabs)/settings/page.tsx` right above the existing "Aparência" section, following the same card styling already used there for "Modo Escuro".

## Server-side: subscribe/unsubscribe routes

- `src/app/api/push/subscribe/route.ts` — `POST`, reads the authenticated user from the Supabase server client (cookies), upserts `{ endpoint, p256dh, auth, user_id }` into `push_subscriptions` with `onConflict: "endpoint"`.
- `src/app/api/push/unsubscribe/route.ts` — `POST`, deletes the row matching `endpoint` **and** `user_id = auth.uid()` (so one user can't delete another's subscription by guessing an endpoint).

## Server-side: the cron route

`src/app/api/cron/notifications/route.ts` — `GET`, checked against `Authorization: Bearer ${CRON_SECRET}`. I'll verify Vercel's current exact cron-auth convention against their docs during implementation rather than assume it from memory, since it's Vercel platform behavior, not Next.js.

Uses a Supabase client built with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS — needed to read every user's subscriptions and roster/membership rows, not just the caller's own).

"Today" is computed in `America/Sao_Paulo`. To keep the date logic testable without a test framework (this project has none, and adding one just for this feature isn't warranted), the day-of-month branching is a small pure function taking `today: Date` as a parameter, and the route accepts an optional `?simulateDate=YYYY-MM-DD` override that only works outside production (`process.env.VERCEL_ENV !== "production"`), so the 17th/20th branches can be exercised locally on demand.

Three checks, each producing a list of `{ userId, title, body, url }`:

1. **Shift reminder**: `rosters` where `schedule_date = tomorrow` **and** `member_id is not null` (an unfilled slot has nothing to notify), joined to `department_members.user_id` via `member_id`. Grouped by `user_id` — a member scheduled for more than one function/department the same day still gets exactly one notification. `target_date = tomorrow`, `type = 'shift_reminder'`, `url = '/my-scales'`.
2. **Deadline −3 days**: only runs when `today`'s day-of-month is 17. Audience = every distinct `user_id` in `department_members`. `target_date = <this month>-20`, `type = 'availability_deadline_3d'`, `url = '/availability'`.
3. **Deadline today**: only runs when `today`'s day-of-month is 20. Same audience and `url`, `target_date = today`, `type = 'availability_deadline_today'`.

For each `{ userId, type, target_date }`, skip if already present in `notification_log`. Otherwise, load that user's `push_subscriptions` rows and call `webpush.sendNotification(subscription, JSON.stringify({ title, body, url }))` for each. A `404`/`410` response deletes that subscription row (expired/uninstalled). After attempting all of a user's subscriptions (regardless of individual delivery failures), insert the `notification_log` row — this guarantees "once per user per day" even if some of their devices failed, so a transient failure on one device doesn't cause a retry-storm on the next cron run.

## Service worker changes (`src/app/sw.ts`)

Add two listeners (currently the worker only does caching):

```ts
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Escala Verbo", {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { url: data.url ?? "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data.url))
})
```

## Vercel Cron config

`vercel.json` (new file):

```json
{
  "crons": [{ "path": "/api/cron/notifications", "schedule": "0 12 * * *" }]
}
```

`0 12 * * *` UTC = 09:00 America/Sao_Paulo (Brazil has had no DST since 2019, so this doesn't drift). I'll confirm Vercel Hobby's current cron limits (frequency/count) against their docs during implementation before relying on this.

## Manual deployment steps (outside this repo, not something I can do myself)

1. Run the `supabase/migrations/20260825_push_notifications.sql` SQL against the live database (Supabase SQL editor or `supabase db push`).
2. Generate a VAPID key pair (I'll do this with the `web-push` package's `generateVAPIDKeys()` during implementation and hand you the values) and add to Vercel's env vars **and** local `.env.local`: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
3. Add `SUPABASE_SERVICE_ROLE_KEY` (from the Supabase dashboard) and a random `CRON_SECRET` to Vercel's env vars and `.env.local`.

## Testing

- No test framework exists in this project; I won't introduce one for this feature alone. Verification is manual/integration-level:
- `npm run build` + `tsc`/`eslint` as before.
- Local: curl `/api/cron/notifications` with the `Authorization` header and `?simulateDate=` overrides for the 17th/20th/day-before-a-shift cases, using a real subscribed browser, and confirm the OS notification appears and `notification_log` gets the expected row (and a second identical call doesn't double-send).
- Subscribe/unsubscribe toggle: manually verify in a real browser (permission prompt, DB row appears/disappears, toggle state persists across reload).
- Confirm an expired/revoked subscription gets pruned from `push_subscriptions` after a failed send.
