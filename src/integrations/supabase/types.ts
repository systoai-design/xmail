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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      email_attachments: {
        Row: {
          created_at: string | null
          draft_id: string | null
          email_id: string | null
          encrypted_file_name: string
          encrypted_symmetric_key: string
          file_name: string
          file_size_bytes: number
          id: string
          iv: string
          mime_type: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          draft_id?: string | null
          email_id?: string | null
          encrypted_file_name: string
          encrypted_symmetric_key: string
          file_name: string
          file_size_bytes: number
          id?: string
          iv: string
          mime_type: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          draft_id?: string | null
          email_id?: string | null
          encrypted_file_name?: string
          encrypted_symmetric_key?: string
          file_name?: string
          file_size_bytes?: number
          id?: string
          iv?: string
          mime_type?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "email_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "encrypted_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_drafts: {
        Row: {
          auto_saved: boolean | null
          created_at: string | null
          encrypted_body: string | null
          encrypted_subject: string | null
          id: string
          to_wallet: string | null
          updated_at: string | null
          wallet_address: string
        }
        Insert: {
          auto_saved?: boolean | null
          created_at?: string | null
          encrypted_body?: string | null
          encrypted_subject?: string | null
          id?: string
          to_wallet?: string | null
          updated_at?: string | null
          wallet_address: string
        }
        Update: {
          auto_saved?: boolean | null
          created_at?: string | null
          encrypted_body?: string | null
          encrypted_subject?: string | null
          id?: string
          to_wallet?: string | null
          updated_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      email_label_assignments: {
        Row: {
          assigned_at: string | null
          email_id: string | null
          id: string
          label_id: string | null
          wallet_address: string
        }
        Insert: {
          assigned_at?: string | null
          email_id?: string | null
          id?: string
          label_id?: string | null
          wallet_address: string
        }
        Update: {
          assigned_at?: string | null
          email_id?: string | null
          id?: string
          label_id?: string | null
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_label_assignments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "encrypted_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "email_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      email_labels: {
        Row: {
          color: string
          created_at: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          wallet_address: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          wallet_address: string
        }
        Update: {
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          wallet_address?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          description: string | null
          encrypted_body: string
          encrypted_subject: string
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          updated_at: string | null
          use_count: number | null
          variables: Json | null
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          encrypted_body: string
          encrypted_subject: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          updated_at?: string | null
          use_count?: number | null
          variables?: Json | null
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          encrypted_body?: string
          encrypted_subject?: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          updated_at?: string | null
          use_count?: number | null
          variables?: Json | null
          wallet_address?: string
        }
        Relationships: []
      }
      encrypted_emails: {
        Row: {
          created_at: string
          encrypted_body: string
          encrypted_subject: string
          from_wallet: string
          id: string
          payment_tx_signature: string | null
          read: boolean
          sender_signature: string
          timestamp: string
          to_wallet: string
        }
        Insert: {
          created_at?: string
          encrypted_body: string
          encrypted_subject: string
          from_wallet: string
          id?: string
          payment_tx_signature?: string | null
          read?: boolean
          sender_signature: string
          timestamp?: string
          to_wallet: string
        }
        Update: {
          created_at?: string
          encrypted_body?: string
          encrypted_subject?: string
          from_wallet?: string
          id?: string
          payment_tx_signature?: string | null
          read?: boolean
          sender_signature?: string
          timestamp?: string
          to_wallet?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string
          key_created_at: string | null
          public_key: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          key_created_at?: string | null
          public_key: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          key_created_at?: string | null
          public_key?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          created_at: string | null
          encrypted_body: string
          encrypted_subject: string
          error_message: string | null
          id: string
          scheduled_for: string
          sender_signature: string
          sent_at: string | null
          status: string
          timezone: string
          to_wallet: string
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          encrypted_body: string
          encrypted_subject: string
          error_message?: string | null
          id?: string
          scheduled_for: string
          sender_signature: string
          sent_at?: string | null
          status?: string
          timezone?: string
          to_wallet: string
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          encrypted_body?: string
          encrypted_subject?: string
          error_message?: string | null
          id?: string
          scheduled_for?: string
          sender_signature?: string
          sent_at?: string | null
          status?: string
          timezone?: string
          to_wallet?: string
          wallet_address?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          wallet_address: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _wallet_address: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "tester" | "user"
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
      app_role: ["admin", "tester", "user"],
    },
  },
} as const
