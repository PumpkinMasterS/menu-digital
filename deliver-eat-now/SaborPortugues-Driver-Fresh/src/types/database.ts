// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          role: 'platform_owner' | 'super_admin' | 'restaurant_admin' | 'kitchen' | 'driver' | 'customer'
          organization_id: string | null
          restaurant_id: string | null
          full_name: string | null
          phone: string | null
          account_activated: boolean
          account_activated_at: string | null
          activation_email_sent: boolean
          activation_email_sent_at: string | null
          temp_password_hash: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'platform_owner' | 'super_admin' | 'restaurant_admin' | 'kitchen' | 'driver' | 'customer'
          organization_id?: string | null
          restaurant_id?: string | null
          full_name?: string | null
          phone?: string | null
          account_activated?: boolean
          account_activated_at?: string | null
          activation_email_sent?: boolean
          activation_email_sent_at?: string | null
          temp_password_hash?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'platform_owner' | 'super_admin' | 'restaurant_admin' | 'kitchen' | 'driver' | 'customer'
          organization_id?: string | null
          restaurant_id?: string | null
          full_name?: string | null
          phone?: string | null
          account_activated?: boolean
          account_activated_at?: string | null
          activation_email_sent?: boolean
          activation_email_sent_at?: string | null
          temp_password_hash?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          status: 'pending' | 'active' | 'inactive' | 'suspended'
          profile_completed: boolean
          documents_verified: boolean
          background_check_status: 'pending' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          status?: 'pending' | 'active' | 'inactive' | 'suspended'
          profile_completed?: boolean
          documents_verified?: boolean
          background_check_status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          status?: 'pending' | 'active' | 'inactive' | 'suspended'
          profile_completed?: boolean
          documents_verified?: boolean
          background_check_status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          name: string
          organization_id: string
          address: string | null
          phone: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          organization_id: string
          address?: string | null
          phone?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          organization_id?: string
          address?: string | null
          phone?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_id: string
          restaurant_id: string
          driver_id: string | null
          status: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_address: string
          customer_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          restaurant_id: string
          driver_id?: string | null
          status?: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
          total_amount: number
          delivery_address: string
          customer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          restaurant_id?: string
          driver_id?: string | null
          status?: 'pending' | 'confirmed' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled'
          total_amount?: number
          delivery_address?: string
          customer_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}