# PWA Support — Design

## Context

Escala Verbo (`app-scale-next`) is a Next.js 16.3.2 App Router app (Turbopack default for both `dev` and `build`), Supabase-backed, with authenticated (`(authenticated)`) and unauthenticated (`(auth)`) route groups. `layout.tsx` already references a `manifest: "/manifest.json"` that has never existed, and the app has no custom icons — only the default `create-next-app` favicon and placeholder SVGs.

The goal is to make the app installable (Add to Home Screen, standalone display) on desktop, Android, and iOS, and to add basic offline support for the static app shell and assets. Authenticated, per-user data (schedules, availability, member lists) must never be cached by the service worker — only the network is allowed to serve that content, so users never see stale or cross-account data offline.

Explicitly out of scope: Web Push notifications (separate feature requiring VAPID keys and a subscriptions table).

## Icons

No existing brand icon. Generate a simple placeholder: a monogram/calendar mark on the existing theme blue (`#2563eb`) background. Source as SVG, rasterize with `sharp` (already present transitively in `node_modules`, used as a one-off script — not added as a project dependency) into:

- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-512-maskable.png` (512×512, with safe-zone padding per Android adaptive icon spec)
- `public/icons/apple-touch-icon.png` (180×180, no transparency — iOS ignores alpha)

`src/app/favicon.ico` is left as-is (out of scope; unrelated to installability).

## Web app manifest

`src/app/manifest.ts` using `MetadataRoute.Manifest`:

- `name`: "Escala Verbo"
- `short_name`: "Escala Verbo"
- `description`: "Gestão de escalas e disponibilidade da equipe"
- `start_url`: "/"
- `display`: "standalone"
- `background_color` / `theme_color`: `#09090b` (matches the app's dark theme, which is the default theme per `layout.tsx`'s `defaultTheme="dark"`)
- `icons`: the four files above, with `purpose: "any"` for the 192/512 set and `purpose: "maskable"` for the maskable one

This is a Next.js special file — Next auto-links it in `<head>`, so no manual `<link rel="manifest">` or `metadata.manifest` field is needed.

## Layout metadata changes (`src/app/layout.tsx`)

- Remove the stale `manifest: "/manifest.json"` field from the `metadata` export (superseded by `app/manifest.ts` auto-linking).
- Add `appleWebApp: { capable: true, statusBarStyle: "default", title: "Escala Verbo" }` so iOS treats the installed app as standalone with a native-like title.
- Add `formatDetection: { telephone: false }` to stop iOS Safari from auto-linking phone-number-looking text.
- Wrap `{children}` (inside `QueryProvider`) with `SerwistProvider` (see below) to register the service worker.

## Service worker (Serwist, Turbopack integration)

Next 16 defaults both `next dev` and `next build` to Turbopack, which does not run webpack plugins. `@serwist/next` hooks into webpack config, so it is not usable here — this project must use `@serwist/turbopack`, confirmed against Serwist's current documentation for this Next.js version.

New devDependencies: `serwist`, `@serwist/turbopack`, `esbuild`.

Files:

- `next.config.ts` — wrap the existing config with `withSerwist` from `@serwist/turbopack`.
- `src/app/serwist/sw.js/route.ts` — the Serwist route handler (`createSerwistRoute`), compiling `app/sw.ts` and serving it at `/serwist/sw.js`. The folder-named-`sw.js` convention is how Next.js App Router exposes a route handler at a dotted static path.
- `src/app/sw.ts` — the worker source. Route groups `(auth)` and `(authenticated)` don't add URL segments, so authenticated pages (`/`, `/availability`, `/departments`, `/profile`, `/settings`, `/onboarding`, etc.) and public pages (`/login`, `/signup`, `/forgot-password`, `/update-password`) are flat, indistinguishable-by-prefix routes at the same origin. Because Next.js renders authenticated, per-user data directly into a page's HTML, navigation caching must be an **allowlist of the known public paths only** — never a blanket rule over all navigations:
  - Precaches the build's static app shell entries (`self.__SW_MANIFEST`) plus `/~offline`.
  - `CacheFirst` runtime caching for `_next/static/*`, the icon files, and fonts.
  - `NetworkFirst` runtime *caching* for navigations matching only `/login`, `/signup`, `/forgot-password`, and `/update-password` — the public, non-personalized pages. Online users get fresh HTML; a recent visit is served from cache if the network request fails.
  - A second, catch-all `NavigationRoute` covers every other navigation (including `/` and all authenticated routes) with a `NetworkOnly` strategy — it never caches the response — whose `handlerDidError` plugin returns the precached `/~offline` page only when the network request itself fails. Authenticated pages are therefore always fetched fresh from the network or, if offline, shown the generic offline page — never a stale/cached copy of another session's data.
  - No routes registered for Supabase requests (`*.supabase.co`) or Next.js Server Actions/API routes — unmatched requests are never intercepted by Serwist and always go straight to the network, so authenticated/dynamic data is never cached.
- `src/app/~offline/page.tsx` — a minimal static page ("Você está offline. Conecte-se à internet para continuar.") precached as the offline fallback.

## Build/dev scripts (`package.json`)

- `"dev": "serwist build && next dev"` — builds the worker once before starting the dev server. If someone edits `app/sw.ts` mid-session, they restart `next dev`; this is expected to be rare enough not to justify adding `concurrently`/`cross-env` for a watch mode.
- `"build": "next build && serwist build"`.

## Testing

- `npm run build && npm start`, then in Chrome DevTools: confirm the manifest is picked up (Application tab), confirm the install icon appears in the address bar, and confirm `/serwist/sw.js` registers successfully.
- Toggle DevTools Network → Offline, reload a previously-visited public/static route: app shell renders from cache. Navigate to a never-visited route while offline: `/~offline` renders.
- Confirm an authenticated page's data is never served stale: log in online, go offline, refresh an authenticated page — it should show the offline fallback or a network error, never cached schedule data.
- iOS Safari (or simulator): "Add to Home Screen" launches standalone with the correct icon and no browser chrome.
