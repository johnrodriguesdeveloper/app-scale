export interface DepartmentLeader {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface LeaderSearchResult {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}