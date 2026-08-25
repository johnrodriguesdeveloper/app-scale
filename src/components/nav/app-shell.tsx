"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navItems } from "./nav-items"
import { InstallAppButton } from "./install-app-button"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:p-4">
        <div className="mb-6 px-2 text-lg font-bold">Escala Verbo</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <InstallAppButton className="mt-auto w-full" />
      </aside>

      <InstallAppButton className="fixed right-4 bottom-24 z-30 shadow-md md:hidden" />

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background md:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
