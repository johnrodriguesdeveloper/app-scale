export interface SettingDepartmentFunction {
  id: string
  name: string
}

export interface DepartmentMemberSetting {
  id: string
  user_id: string
  profiles: {
    id: string
    full_name: string
    email?: string | null
  }
  member_functions: {
    function_id: string
    department_functions: {
      id: string
      name: string
    }
  }[]
}
