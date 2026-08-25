"use client"

import { Cake, MessageCircle } from "lucide-react"
import type { BirthdayPerson } from "@/types/birthday"

function handleOpenWhatsApp(phone: string, name: string) {
  const cleanNumber = phone.replace(/\D/g, "")
  const message = `Feliz aniversário, ${name}! 🎉`
  window.open(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`, "_blank")
}

export function BirthdayCard({ people }: { people: BirthdayPerson[] }) {
  if (people.length === 0) return null

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Cake className="size-5 text-primary" />
        <p className="text-sm font-bold">Aniversariantes hoje</p>
      </div>

      <div className="flex flex-col gap-2">
        {people.map((person) => (
          <div
            key={person.user_id}
            className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{person.full_name}</p>
              {person.department_name && (
                <p className="truncate text-xs text-muted-foreground">{person.department_name}</p>
              )}
            </div>

            {person.phone && (
              <button
                onClick={() => handleOpenWhatsApp(person.phone!, person.full_name)}
                className="ml-2 shrink-0 rounded-full bg-success/10 p-2"
                aria-label={`Mandar parabéns para ${person.full_name} no WhatsApp`}
              >
                <MessageCircle className="size-4 text-success" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
