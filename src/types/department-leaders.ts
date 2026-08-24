export interface DepartmentLeader {
  id: string
  user_id: string
  profiles: {
    id: string
    full_name: string
    email?: string | null
    avatar_url?: string | null
  }
}

export interface LeaderSearchResult {
  id: string
  full_name: string
  email?: string | null
  avatar_url?: string | null
}
