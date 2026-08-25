import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  PrecacheFallbackPlugin,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Public, non-personalized pages: safe to cache a recent response for.
const PUBLIC_PAGES = ["/login", "/signup", "/forgot-password", "/update-password"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
});

// Static icons never contain user data, so they're safe to cache aggressively.
serwist.registerCapture(
  ({ url }) => url.pathname.startsWith("/icons/"),
  new CacheFirst({ cacheName: "icons" }),
);

// Public pages: serve a recent cached copy if the network request fails.
serwist.registerCapture(
  ({ request, url }) =>
    request.destination === "document" && PUBLIC_PAGES.includes(url.pathname),
  new NetworkFirst({ cacheName: "public-pages" }),
);

// Every other page navigation (the app itself, including all authenticated
// routes) is never cached — it always goes to the network, so a user never
// sees another session's stale schedule/availability data. If the network
// fails, this falls back to the generic offline page instead of the
// browser's default error page.
serwist.registerCapture(
  ({ request }) => request.destination === "document",
  new NetworkOnly({
    plugins: [
      new PrecacheFallbackPlugin({
        fallbackUrls: ["/~offline"],
        serwist,
      }),
    ],
  }),
);

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

serwist.addEventListeners();
