export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          address: string
          admin_notes: string | null
          average_delivery_time: number | null
          banner_url: string | null
          business_hours: Json | null
          commission_rate: number | null
          created_at: string | null
          cuisine_type: string | null
          delivery_fee: number | null
          delivery_radius: number | null
          delivery_radius_km: number | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          delivery_zones: Json | null
          description: string | null
          display_name: string | null
          email: string | null
          featured_until: string | null
          features: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_open: boolean | null
          lat: number | null
          latitude: number | null
          lng: number | null
          longitude: number | null
          marketing_description: string | null
          minimum_order: number | null
          name: string
          notification_settings: Json | null
          organization_id: string | null
          owner_id: string | null
          payment_methods: string[] | null
          phone: string | null
          priority_level: number | null
          rating: number | null
          region_id: string | null
          seo_keywords: string | null
          slug: string | null
          social_media: Json | null
          updated_at: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          average_delivery_time?: number | null
          banner_url?: string | null
          business_hours?: Json | null
          commission_rate?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee?: number | null
          delivery_radius?: number | null
          delivery_radius_km?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          delivery_zones?: Json | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          featured_until?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          longitude?: number | null
          marketing_description?: string | null
          minimum_order?: number | null
          name: string
          notification_settings?: Json | null
          organization_id?: string | null
          owner_id?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          priority_level?: number | null
          rating?: number | null
          region_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          social_media?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          average_delivery_time?: number | null
          banner_url?: string | null
          business_hours?: Json | null
          commission_rate?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_fee?: number | null
          delivery_radius?: number | null
          delivery_radius_km?: number | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          delivery_zones?: Json | null
          description?: string | null
          display_name?: string | null
          email?: string | null
          featured_until?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_open?: boolean | null
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          longitude?: number | null
          marketing_description?: string | null
          minimum_order?: number | null
          name?: string
          notification_settings?: Json | null
          organization_id?: string | null
          owner_id?: string | null
          payment_methods?: string[] | null
          phone?: string | null
          priority_level?: number | null
          rating?: number | null
          region_id?: string | null
          seo_keywords?: string | null
          slug?: string | null
          social_media?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      // Other tables would be here in a complete implementation
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          region_id: string | null
          restaurant_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name?: string | null
          id: string
          organization_id?: string | null
          phone?: string | null
          region_id?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          region_id?: string | null
          restaurant_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
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
      app_role: "customer" | "driver" | "restaurant_admin" | "super_admin" | "platform_owner" | "kitchen"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
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
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
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
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never
