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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          project_managers: Json | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          project_managers?: Json | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          project_managers?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          active: boolean
          created_at: string
          day_rate: number
          id: string
          name: string
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_rate?: number
          id?: string
          name: string
          role?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          day_rate?: number
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      labour_assignments: {
        Row: {
          client_name: string
          created_at: string
          employee_id: string
          id: string
          item_desc: string
          kind: string
          labour_amount: number
          line_item_id: string | null
          quote_id: string | null
          quote_ref: string
          unit_index: number | null
          work_date: string
        }
        Insert: {
          client_name?: string
          created_at?: string
          employee_id: string
          id?: string
          item_desc?: string
          kind?: string
          labour_amount?: number
          line_item_id?: string | null
          quote_id?: string | null
          quote_ref?: string
          unit_index?: number | null
          work_date: string
        }
        Update: {
          client_name?: string
          created_at?: string
          employee_id?: string
          id?: string
          item_desc?: string
          kind?: string
          labour_amount?: number
          line_item_id?: string | null
          quote_id?: string | null
          quote_ref?: string
          unit_index?: number | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labour_assignments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_bookings: {
        Row: {
          book_date: string
          client_name: string
          created_at: string
          employee_ids: string[]
          id: string
          note: string
          quote_id: string | null
          quote_ref: string
        }
        Insert: {
          book_date: string
          client_name?: string
          created_at?: string
          employee_ids?: string[]
          id?: string
          note?: string
          quote_id?: string | null
          quote_ref?: string
        }
        Update: {
          book_date?: string
          client_name?: string
          created_at?: string
          employee_ids?: string[]
          id?: string
          note?: string
          quote_id?: string | null
          quote_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_bookings_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      labour_holidays: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          note: string
          start_date: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          note?: string
          start_date: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          note?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "labour_holidays_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_projects: {
        Row: {
          address: string
          assigned_team: Json
          client_name: string
          completion_date: string | null
          created_at: string
          current_stage: string
          expected_delivery: string | null
          id: string
          installation_date: string | null
          notes: Json
          order_date: string | null
          project_type: string
          quote_id: string | null
          quote_ref: string
          survey_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          assigned_team?: Json
          client_name?: string
          completion_date?: string | null
          created_at?: string
          current_stage?: string
          expected_delivery?: string | null
          id?: string
          installation_date?: string | null
          notes?: Json
          order_date?: string | null
          project_type?: string
          quote_id?: string | null
          quote_ref?: string
          survey_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_team?: Json
          client_name?: string
          completion_date?: string | null
          created_at?: string
          current_stage?: string
          expected_delivery?: string | null
          id?: string
          installation_date?: string | null
          notes?: Json
          order_date?: string | null
          project_type?: string
          quote_id?: string | null
          quote_ref?: string
          survey_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managed_projects_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client: string
          client_id: string | null
          created_at: string
          date: string
          id: string
          line_items: Json
          pricing: Json | null
          project_manager_id: string | null
          project_manager_name: string | null
          project_ref: string
          sent_at: string | null
          settings: Json
          status: string
          updated_at: string
        }
        Insert: {
          client?: string
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          line_items?: Json
          pricing?: Json | null
          project_manager_id?: string | null
          project_manager_name?: string | null
          project_ref?: string
          sent_at?: string | null
          settings?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          client?: string
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          line_items?: Json
          pricing?: Json | null
          project_manager_id?: string | null
          project_manager_name?: string | null
          project_ref?: string
          sent_at?: string | null
          settings?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client: string
          client_id: string | null
          created_at: string
          date: string
          id: string
          line_items: Json
          pricing: Json | null
          project_manager_id: string | null
          project_manager_name: string | null
          project_ref: string
          sent_at: string | null
          settings: Json
          status: string
          supplier_pdf_clean: string | null
          supplier_pdf_name: string | null
          supplier_pdf_original: string | null
          updated_at: string
        }
        Insert: {
          client?: string
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          line_items?: Json
          pricing?: Json | null
          project_manager_id?: string | null
          project_manager_name?: string | null
          project_ref?: string
          sent_at?: string | null
          settings?: Json
          status?: string
          supplier_pdf_clean?: string | null
          supplier_pdf_name?: string | null
          supplier_pdf_original?: string | null
          updated_at?: string
        }
        Update: {
          client?: string
          client_id?: string | null
          created_at?: string
          date?: string
          id?: string
          line_items?: Json
          pricing?: Json | null
          project_manager_id?: string | null
          project_manager_name?: string | null
          project_ref?: string
          sent_at?: string | null
          settings?: Json
          status?: string
          supplier_pdf_clean?: string | null
          supplier_pdf_name?: string | null
          supplier_pdf_original?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      ensure_profile_exists: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "manager" | "field"
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
      app_role: ["admin", "manager", "field"],
    },
  },
} as const
