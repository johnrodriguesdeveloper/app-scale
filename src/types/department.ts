export interface Department {
  id: string;
  name: string;
  description?: string;
  priority_order?: number;
  availability_deadline_day?: number;
  parent_id?: string;
  organization_id?: string;
}

export interface DepartmentMember {
  id: string;
  user_id: string;
  dept_role: string;
  profiles: {
    full_name: string;
    email?: string;
    avatar_url?: string;
  };
  member_functions?: {
    department_functions: {
      id: string;
      name: string;
    };
  }[];
}

export interface DepartmentFunction {
  id: string;
  name: string;
  description?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
}