import { Calendar, Home, Settings, Users } from "lucide-react"

export const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/my-scales", label: "Minha Agenda", icon: Calendar },
  { href: "/departments", label: "Departamentos", icon: Users },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const
