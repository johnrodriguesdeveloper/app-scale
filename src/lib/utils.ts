import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortName(fullName?: string | null): string {
  if (!fullName) return ""
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 2) return fullName.trim()
  return `${parts[0]} ${parts[parts.length - 1]}`
}
