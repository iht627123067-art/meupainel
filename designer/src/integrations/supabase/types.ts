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
      ai_classifications: {
        Row: {
          alert_id: string
          approved_at: string | null
          confidence_score: number | null
          created_at: string | null
          destination: Database["public"]["Enums"]["content_destination"]
          id: string
          is_approved: boolean | null
          reasoning: string | null
          suggested_text: string | null
        }
        Insert: {
          alert_id: string
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          destination: Database["public"]["Enums"]["content_destination"]
          id?: string
          is_approved?: boolean | null
          reasoning?: string | null
          suggested_text?: string | null
        }
        Update: {
          alert_id?: string
          approved_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          destination?: Database["public"]["Enums"]["content_destination"]
          id?: string
          is_approved?: boolean | null
          reasoning?: string | null
          suggested_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_classifications_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string | null
          clean_url: string | null
          created_at: string | null
          description: string | null
          duplicate_group_id: string | null
          email_account_id: string | null
          email_date: string | null
          email_id: string | null
          email_subject: string | null
          id: string
          is_duplicate: boolean | null
          is_valid: boolean | null
          keywords: string[] | null
          publication_date: string | null
          publisher: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          url: string
          user_id: string | null
        }
        Insert: {
          alert_type?: string | null
          clean_url?: string | null
          created_at?: string | null
          description?: string | null
          duplicate_group_id?: string | null
          email_account_id?: string | null
          email_date?: string | null
          email_id?: string | null
          email_subject?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_valid?: boolean | null
          keywords?: string[] | null
          publication_date?: string | null
          publisher?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          url: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string | null
          clean_url?: string | null
          created_at?: string | null
          description?: string | null
          duplicate_group_id?: string | null
          email_account_id?: string | null
          email_date?: string | null
          email_id?: string | null
          email_subject?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_valid?: boolean | null
          keywords?: string[] | null
          publication_date?: string | null
          publisher?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_email_account_id_fkey"
            columns: ["email_account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      extracted_content: {
        Row: {
          alert_id: string
          content: string | null
          created_at: string | null
          id: string
          keywords: string[] | null
          markdown_content: string | null
          quality_score: number | null
          summary: string | null
          word_count: number | null
        }
        Insert: {
          alert_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          markdown_content?: string | null
          quality_score?: number | null
          summary?: string | null
          word_count?: number | null
        }
        Update: {
          alert_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          keywords?: string[] | null
          markdown_content?: string | null
          quality_score?: number | null
          summary?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_content_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_posts: {
        Row: {
          alert_id: string | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          published_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_posts_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      research_materials: {
        Row: {
          alert_id: string | null
          content: string | null
          created_at: string | null
          id: string
          source_type: string
          title: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          source_type: string
          title: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          source_type?: string
          title?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_materials_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_feeds: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_fetched_at: string | null
          name: string
          url: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          name: string
          url: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_status:
      | "pending"
      | "extracted"
      | "classified"
      | "approved"
      | "rejected"
      | "published"
      | "needs_review"
      content_destination: "linkedin" | "thesis" | "debate" | "archive"
      source_type: "gmail_alert" | "rss"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
