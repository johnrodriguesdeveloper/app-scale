export interface Scale {
  id: string;
  schedule_date: string;
  department_id: string;
  service_day_id: string;
  department_functions: any;
  departments: any;
  service_days?: any;
}

export interface TeamMember {
  id: string;
  function_name: string;
  member_name: string;
  member_phone: string | null;
}