export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          organization_id: string
          status: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          organization_id: string
          status?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          organization_id?: string
          status?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          reason: string | null
          service_day_id: string | null
          specific_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          service_day_id?: string | null
          specific_date: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          service_day_id?: string | null
          specific_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_service_day_id_fkey"
            columns: ["service_day_id"]
            isOneToOne: false
            referencedRelation: "service_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_exceptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_routine: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          service_day_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          service_day_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          service_day_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_routine_service_day_id_fkey"
            columns: ["service_day_id"]
            isOneToOne: false
            referencedRelation: "service_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_routine_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_functions: {
        Row: {
          created_at: string | null
          department_id: string
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_functions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_leaders: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_leaders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_leaders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string | null
          department_id: string
          dept_role: string
          function_id: string | null
          id: string | null
          is_leader: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          dept_role: string
          function_id?: string | null
          id?: string | null
          is_leader?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          dept_role?: string
          function_id?: string | null
          id?: string | null
          is_leader?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "department_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          availability_deadline_day: number
          created_at: string | null
          description: string | null
          id: string
          is_double_shift_sunday: boolean | null
          name: string
          organization_id: string
          parent_id: string | null
          priority_order: number
          updated_at: string | null
        }
        Insert: {
          availability_deadline_day: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_double_shift_sunday?: boolean | null
          name: string
          organization_id: string
          parent_id?: string | null
          priority_order?: number
          updated_at?: string | null
        }
        Update: {
          availability_deadline_day?: number
          created_at?: string | null
          description?: string | null
          id?: string
          is_double_shift_sunday?: boolean | null
          name?: string
          organization_id?: string
          parent_id?: string | null
          priority_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      member_functions: {
        Row: {
          created_at: string | null
          function_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string | null
          function_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string | null
          function_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "department_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_functions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "department_members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_unavailability: {
        Row: {
          created_at: string | null
          id: string
          unavailable_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          unavailable_date: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          unavailable_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_unavailability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          id: string
          sent_at: string | null
          target_date: string
          type: string
          user_id: string
        }
        Insert: {
          id?: string
          sent_at?: string | null
          target_date: string
          type: string
          user_id: string
        }
        Update: {
          id?: string
          sent_at?: string | null
          target_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          theme_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          theme_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          theme_config?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          org_role: string
          organization_id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          org_role: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          org_role?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      rosters: {
        Row: {
          created_at: string | null
          department_id: string
          function_id: string
          id: string
          member_id: string | null
          schedule_date: string
          service_day_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id: string
          function_id: string
          id?: string
          member_id?: string | null
          schedule_date: string
          service_day_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string
          function_id?: string
          id?: string
          member_id?: string | null
          schedule_date?: string
          service_day_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rosters_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "department_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "department_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_service_day_id_fkey"
            columns: ["service_day_id"]
            isOneToOne: false
            referencedRelation: "service_days"
            referencedColumns: ["id"]
          },
        ]
      }
      service_days: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          name: string | null
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_days_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_available_members_by_function: {
        Args: {
          p_date: string
          p_department_id: string
          p_function_id: string
          p_organization_id: string
        }
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          function_id: string
          function_name: string
          is_available: boolean
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_master: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
