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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      course_allocations: {
        Row: {
          academic_session: string
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          lecturer_id: string
        }
        Insert: {
          academic_session: string
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          lecturer_id: string
        }
        Update: {
          academic_session?: string
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lecturer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_allocations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credit_units: number
          department_id: string
          id: string
          is_active: boolean
          level: string | null
          semester: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          credit_units?: number
          department_id: string
          id?: string
          is_active?: boolean
          level?: string | null
          semester?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_units?: number
          department_id?: string
          id?: string
          is_active?: boolean
          level?: string | null
          semester?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          head_of_department: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          head_of_department?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          head_of_department?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          department_id: string | null
          id: string
          is_active: boolean
          priority: string
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          academic_session: string
          amount: number
          control_number: string
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          paid_at: string | null
          payment_type: string
          semester: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_session: string
          amount: number
          control_number: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_type: string
          semester?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_session?: string
          amount?: number
          control_number?: string
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          payment_type?: string
          semester?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          student_id: string | null
          updated_at: string
          user_id: string
          ussd_pin: string | null
          year_of_study: number | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
          ussd_pin?: string | null
          year_of_study?: number | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
          ussd_pin?: string | null
          year_of_study?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          academic_session: string
          approved_at: string | null
          approved_by: string | null
          course_id: string
          coursework_total: number | null
          created_at: string
          grade: string | null
          group_assignment: number | null
          id: string
          individual_assignment: number | null
          lecturer_id: string
          rejection_reason: string | null
          score: number | null
          status: Database["public"]["Enums"]["result_status"]
          student_id: string
          submitted_at: string | null
          test1_score: number | null
          university_exam: number | null
          updated_at: string
        }
        Insert: {
          academic_session: string
          approved_at?: string | null
          approved_by?: string | null
          course_id: string
          coursework_total?: number | null
          created_at?: string
          grade?: string | null
          group_assignment?: number | null
          id?: string
          individual_assignment?: number | null
          lecturer_id: string
          rejection_reason?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["result_status"]
          student_id: string
          submitted_at?: string | null
          test1_score?: number | null
          university_exam?: number | null
          updated_at?: string
        }
        Update: {
          academic_session?: string
          approved_at?: string | null
          approved_by?: string | null
          course_id?: string
          coursework_total?: number | null
          created_at?: string
          grade?: string | null
          group_assignment?: number | null
          id?: string
          individual_assignment?: number | null
          lecturer_id?: string
          rejection_reason?: string | null
          score?: number | null
          status?: Database["public"]["Enums"]["result_status"]
          student_id?: string
          submitted_at?: string | null
          test1_score?: number | null
          university_exam?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_courses: {
        Row: {
          academic_session: string
          course_id: string
          created_at: string
          id: string
          semester: string
          status: string
          student_id: string
          year_of_study: number
        }
        Insert: {
          academic_session: string
          course_id: string
          created_at?: string
          id?: string
          semester?: string
          status?: string
          student_id: string
          year_of_study?: number
        }
        Update: {
          academic_session?: string
          course_id?: string
          created_at?: string
          id?: string
          semester?: string
          status?: string
          student_id?: string
          year_of_study?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_department: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "lecturer" | "student" | "hod"
      result_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "published"
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
    Enums: {
      app_role: ["admin", "lecturer", "student", "hod"],
      result_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "published",
      ],
    },
  },
} as const
