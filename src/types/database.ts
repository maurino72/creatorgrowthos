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
      ai_logs: {
        Row: {
          action_type: string | null
          context_payload: Json | null
          created_at: string | null
          creator_rating: number | null
          full_prompt: string | null
          id: string
          latency_ms: number | null
          model: string
          prompt_template: string | null
          prompt_version: number | null
          response: string | null
          session_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
          was_used: boolean | null
        }
        Insert: {
          action_type?: string | null
          context_payload?: Json | null
          created_at?: string | null
          creator_rating?: number | null
          full_prompt?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          prompt_template?: string | null
          prompt_version?: number | null
          response?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
          was_used?: boolean | null
        }
        Update: {
          action_type?: string | null
          context_payload?: Json | null
          created_at?: string | null
          creator_rating?: number | null
          full_prompt?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_template?: string | null
          prompt_version?: number | null
          response?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
          was_used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_events: {
        Row: {
          clicks: number | null
          engagement_rate: number | null
          follows_from_post: number | null
          hours_since_publish: number | null
          id: string
          impressions: number | null
          likes: number | null
          observed_at: string
          platform: Database["public"]["Enums"]["platform_type"]
          post_publication_id: string
          profile_visits: number | null
          replies: number | null
          reposts: number | null
          source: string | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          engagement_rate?: number | null
          follows_from_post?: number | null
          hours_since_publish?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          observed_at: string
          platform: Database["public"]["Enums"]["platform_type"]
          post_publication_id: string
          profile_visits?: number | null
          replies?: number | null
          reposts?: number | null
          source?: string | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          engagement_rate?: number | null
          follows_from_post?: number | null
          hours_since_publish?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          observed_at?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          post_publication_id?: string
          profile_visits?: number | null
          replies?: number | null
          reposts?: number | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metric_events_post_publication_id_fkey"
            columns: ["post_publication_id"]
            isOneToOne: false
            referencedRelation: "post_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metric_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token_enc: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_user_id: string | null
          platform_username: string | null
          refresh_token_enc: string | null
          scopes: string[] | null
          status: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_enc?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token_enc?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_enc?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token_enc?: string | null
          scopes?: string[] | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_publications: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          platform: Database["public"]["Enums"]["platform_type"]
          platform_post_id: string | null
          platform_url: string | null
          post_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["publication_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform: Database["public"]["Enums"]["platform_type"]
          platform_post_id?: string | null
          platform_url?: string | null
          post_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          platform_post_id?: string | null
          platform_url?: string | null
          post_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_publications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_publications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_assisted: boolean | null
          ai_session_id: string | null
          body: string
          content_type: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          intent: string | null
          media_urls: string[] | null
          mentions: string[]
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          tags: string[]
          topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_assisted?: boolean | null
          ai_session_id?: string | null
          body: string
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          intent?: string | null
          media_urls?: string[] | null
          mentions?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          tags?: string[]
          topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_assisted?: boolean | null
          ai_session_id?: string | null
          body?: string
          content_type?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          intent?: string | null
          media_urls?: string[] | null
          mentions?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          tags?: string[]
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_imports: {
        Row: {
          id: string
          user_id: string
          platform: string
          requested_count: number
          imported_count: number | null
          failed_count: number | null
          status: string
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          requested_count: number
          imported_count?: number | null
          failed_count?: number | null
          status?: string
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          requested_count?: number
          imported_count?: number | null
          failed_count?: number | null
          status?: string
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          id: string
          user_id: string
          niches: string[]
          goals: string[]
          target_audience: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          niches: string[]
          goals: string[]
          target_audience: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          niches?: string[]
          goals?: string[]
          target_audience?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarded_at: string | null
          onboarding_step: string | null
          preferences: Record<string, unknown>
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarded_at?: string | null
          onboarding_step?: string | null
          preferences?: Record<string, unknown>
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarded_at?: string | null
          onboarding_step?: string | null
          preferences?: Record<string, unknown>
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      insights: {
        Row: {
          id: string
          user_id: string
          type: string
          headline: string
          detail: string
          data_points: Json | null
          action: string | null
          confidence: string
          status: string
          generated_at: string | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          headline: string
          detail: string
          data_points?: Json | null
          action?: string | null
          confidence: string
          status?: string
          generated_at?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          headline?: string
          detail?: string
          data_points?: Json | null
          action?: string | null
          confidence?: string
          status?: string
          generated_at?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          id: string
          user_id: string
          type: string
          hypothesis: string
          description: string
          status: string
          results: Json | null
          suggested_at: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          hypothesis: string
          description: string
          status?: string
          results?: Json | null
          suggested_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          hypothesis?: string
          description?: string
          status?: string
          results?: Json | null
          suggested_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          plan: string
          status: string
          billing_cycle: string
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          trial_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          plan: string
          status: string
          billing_cycle: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          plan?: string
          status?: string
          billing_cycle?: string
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          trial_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          id: string
          user_id: string
          period_start: string
          period_end: string
          posts_count: number
          ai_requests_count: number
          insights_count: number
          content_improvements_count: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          period_start: string
          period_end: string
          posts_count?: number
          ai_requests_count?: number
          insights_count?: number
          content_improvements_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string
          period_end?: string
          posts_count?: number
          ai_requests_count?: number
          insights_count?: number
          content_improvements_count?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      connection_status: "active" | "expired" | "revoked"
      platform_type: "twitter" | "linkedin" | "threads"
      post_status: "draft" | "scheduled" | "published" | "failed" | "deleted"
      publication_status: "pending" | "published" | "failed"
      subscription_status: "active" | "canceled" | "past_due" | "trialing" | "unpaid" | "incomplete"
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
      connection_status: ["active", "expired", "revoked"],
      platform_type: ["twitter", "linkedin", "threads"],
      post_status: ["draft", "scheduled", "published", "failed", "deleted"],
      publication_status: ["pending", "published", "failed"],
    },
  },
} as const
