export interface Scale {
  id: string
  schedule_date: string
  department_id: string
  service_day_id: string | null
  department_functions: { name: string } | null
  departments: { name: string } | null
  service_days?: { name: string } | null
}

export interface TeamMember {
  id: string
  function_name: string
  member_name: string
  member_phone: string | null
}
