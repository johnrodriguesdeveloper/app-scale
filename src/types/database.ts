export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          theme_config: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          theme_config?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          theme_config?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          org_role: 'admin' | 'member';
          full_name: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          org_role: 'admin' | 'member';
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          org_role?: 'admin' | 'member';
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          parent_id: string | null;
          priority_order: number;
          availability_deadline_day: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          parent_id?: string | null;
          priority_order?: number;
          availability_deadline_day: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          parent_id?: string | null;
          priority_order?: number;
          availability_deadline_day?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      department_functions: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      member_functions: {
        Row: {
          user_id: string;
          function_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          function_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          function_id?: string;
          created_at?: string;
        };
      };
      department_members: {
        Row: {
          user_id: string;
          department_id: string;
          dept_role: 'leader' | 'member';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          department_id: string;
          dept_role: 'leader' | 'member';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          department_id?: string;
          dept_role?: 'leader' | 'member';
          created_at?: string;
          updated_at?: string;
        };
      };
      availability: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          date: string;
          status: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          date: string;
          status?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          date?: string;
          status?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rosters: {
        Row: {
          id: string;
          organization_id: string;
          date: string;
          department_id: string;
          user_id: string;
          function_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          date: string;
          department_id: string;
          user_id: string;
          function_id: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          date?: string;
          department_id?: string;
          user_id?: string;
          function_id?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_available_members_by_function: {
        Args: {
          p_organization_id: string;
          p_department_id: string;
          p_function_id: string;
          p_date: string;
        };
        Returns: {
          user_id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          function_id: string;
          function_name: string;
          is_available: boolean;
        }[];
      };
    };
  };
}
