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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_roles: {
        Row: {
          account_id: string
          granted_at: string
          granted_by: string | null
          role_id: string
        }
        Insert: {
          account_id: string
          granted_at?: string
          granted_by?: string | null
          role_id: string
        }
        Update: {
          account_id?: string
          granted_at?: string
          granted_by?: string | null
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_roles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: number
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: never
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          account_id: string
          created_at: string
          first_name: string
          id: string
          is_account_holder: boolean
          is_active: boolean
          last_name: string
          license_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          first_name: string
          id?: string
          is_account_holder?: boolean
          is_active?: boolean
          last_name: string
          license_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          first_name?: string
          id?: string
          is_account_holder?: boolean
          is_active?: boolean
          last_name?: string
          license_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          image_path: string | null
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_path?: string | null
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_path?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_id: string
        }
        Insert: {
          permission_code: string
          role_id: string
        }
        Update: {
          permission_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      schedule_cancellations: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string | null
          schedule_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          reason?: string | null
          schedule_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
          schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_cancellations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["schedule_period_kind"]
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          kind?: Database["public"]["Enums"]["schedule_period_kind"]
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["schedule_period_kind"]
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          cancellation_reason: string | null
          created_at: string
          date: string | null
          end_time: string
          id: string
          is_cancelled: boolean
          location: string | null
          period_id: string | null
          start_time: string
          title: string
          type: Database["public"]["Enums"]["schedule_type"]
          updated_at: string
          weekday: number | null
        }
        Insert: {
          cancellation_reason?: string | null
          created_at?: string
          date?: string | null
          end_time: string
          id?: string
          is_cancelled?: boolean
          location?: string | null
          period_id?: string | null
          start_time: string
          title: string
          type: Database["public"]["Enums"]["schedule_type"]
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          cancellation_reason?: string | null
          created_at?: string
          date?: string | null
          end_time?: string
          id?: string
          is_cancelled?: boolean
          location?: string | null
          period_id?: string | null
          start_time?: string
          title?: string
          type?: Database["public"]["Enums"]["schedule_type"]
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "schedule_periods"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_members: {
        Args: never
        Returns: {
          account_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_account_holder: boolean
          last_name: string
          license_number: string
          rejection_reason: string
          reviewed_at: string
          status: Database["public"]["Enums"]["member_status"]
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          role_ids: string[]
        }[]
      }
      approve_member: { Args: { member_id: string }; Returns: undefined }
      can_edit_news: { Args: never; Returns: boolean }
      has_permission: { Args: { permission: string }; Returns: boolean }
      import_planning: { Args: { payload: Json }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_system_role: { Args: { role: string }; Returns: boolean }
      my_permissions: { Args: never; Returns: string[] }
      planning: {
        Args: { from_date: string; to_date: string }
        Returns: {
          cancellation_reason: string
          day: string
          end_time: string
          is_cancelled: boolean
          is_exceptional: boolean
          location: string
          period_id: string
          period_kind: Database["public"]["Enums"]["schedule_period_kind"]
          period_name: string
          schedule_id: string
          start_time: string
          title: string
          type: Database["public"]["Enums"]["schedule_type"]
        }[]
      }
      reject_member: {
        Args: { member_id: string; reason: string }
        Returns: undefined
      }
      require_permission: { Args: { permission: string }; Returns: undefined }
      schedule_period_on: {
        Args: { day: string }
        Returns: {
          created_at: string
          end_date: string
          id: string
          kind: Database["public"]["Enums"]["schedule_period_kind"]
          name: string
          start_date: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "schedule_periods"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      member_status: "pending" | "approved" | "rejected"
      schedule_period_kind: "normal" | "holidays"
      schedule_type: "free_play" | "training" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      member_status: ["pending", "approved", "rejected"],
      schedule_period_kind: ["normal", "holidays"],
      schedule_type: ["free_play", "training", "other"],
    },
  },
} as const
