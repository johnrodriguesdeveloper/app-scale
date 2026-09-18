import type { ReactNode } from "react"
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface MemberAvatarProps {
  avatarUrl?: string | null
  name?: string | null
  className?: string
  fallbackClassName?: string
  badge?: ReactNode
}

export function MemberAvatar({ avatarUrl, name, className, fallbackClassName, badge }: MemberAvatarProps) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?"

  return (
    <Avatar className={cn("size-10", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name || "Avatar"} />}
      <AvatarFallback delayMs={avatarUrl ? 200 : undefined} className={fallbackClassName}>
        {initial}
      </AvatarFallback>
      {badge && <AvatarBadge>{badge}</AvatarBadge>}
    </Avatar>
  )
}
