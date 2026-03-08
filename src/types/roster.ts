export interface RosterFunction {
  id: string;
  name: string;
  description?: string;
}

export interface RosterMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
}

export interface RosterEntry {
  id: string;
  department_id: string;
  function_id: string;
  member_id: string;
  schedule_date: string;
  member?: RosterMember;
}