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
          category: string | null
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
          category?: string | null
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
          category?: string | null
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
            isOneToOne: true
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          clean_url: string | null
          created_at: string | null
          description: string | null
          email_date: string | null
          email_id: string | null
          email_subject: string | null
          id: string
          is_valid: boolean | null
          keywords: string[] | null
          publisher: string | null
          rss_feed_id: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
          source_url: string | null
          status: Database["public"]["Enums"]["alert_status"] | null
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          clean_url?: string | null
          created_at?: string | null
          description?: string | null
          email_date?: string | null
          email_id?: string | null
          email_subject?: string | null
          id?: string
          is_valid?: boolean | null
          keywords?: string[] | null
          publisher?: string | null
          rss_feed_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          clean_url?: string | null
          created_at?: string | null
          description?: string | null
          email_date?: string | null
          email_id?: string | null
          email_subject?: string | null
          id?: string
          is_valid?: boolean | null
          keywords?: string[] | null
          publisher?: string | null
          rss_feed_id?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["alert_status"] | null
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      extracted_content: {
        Row: {
          alert_id: string
          cleaned_content: string | null
          created_at: string | null
          error_message: string | null
          extracted_at: string | null
          extraction_status: string | null
          id: string
          markdown_content: string | null
          quality_score: number | null
          word_count: number | null
        }
        Insert: {
          alert_id: string
          cleaned_content?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_at?: string | null
          extraction_status?: string | null
          id?: string
          markdown_content?: string | null
          quality_score?: number | null
          word_count?: number | null
        }
        Update: {
          alert_id?: string
          cleaned_content?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_at?: string | null
          extraction_status?: string | null
          id?: string
          markdown_content?: string | null
          quality_score?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_content_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: true
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_posts: {
        Row: {
          alert_id: string | null
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string | null
          id: string
          linkedin_post_id: string | null
          published_at: string | null
          status: string | null
        }
        Insert: {
          alert_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string | null
          id?: string
          linkedin_post_id?: string | null
          published_at?: string | null
          status?: string | null
        }
        Update: {
          alert_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string | null
          id?: string
          linkedin_post_id?: string | null
          published_at?: string | null
          status?: string | null
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
      rss_feeds: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          title: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          title?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string
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
      | "archived"
      | "duplicate"
      content_destination: "linkedin" | "thesis" | "debate" | "archive"
      source_type: "gmail_alert" | "rss" | "google_news"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
    Database[PublicTableNameOrOptions['schema']]['Views'])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
    Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
    PublicSchema['Views'])
  ? (PublicSchema['Tables'] &
    PublicSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema['Tables']
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema['Tables']
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema['Enums']
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
  ? PublicSchema['Enums'][PublicEnumNameOrOptions]
  : never
