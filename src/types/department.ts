export interface Department {
  id: string
  name: string
  description?: string | null
  priority_order?: number
  availability_deadline_day?: number
  parent_id?: string | null
  organization_id?: string
}

export interface DepartmentMember {
  id: string
  user_id: string
  dept_role: string
  profiles: {
    full_name: string | null
    email?: string | null
    avatar_url?: string | null
  }
  member_functions?: {
    department_functions: {
      id: string
      name: string
    }
  }[]
}

export interface DepartmentFunction {
  id: string
  name: string
  description?: string | null
}

export interface Profile {
  id: string
  full_name: string
  email?: string | null
}
