export interface RosterDepartment {
  id: string;
  name: string;
}

export interface RosterFunction {
  id: string;
  name: string;
  description?: string;
}

export interface AvailableMember {
  user_id: string;
  full_name: string | null;
  email?: string | null;
}