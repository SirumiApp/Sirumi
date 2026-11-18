// Generado desde Supabase. No lo edites a mano.
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
  public: {
    Tables: {
      accounts: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          initial_balance: number
          is_main: boolean
          kind: string
          name: string
          owner_type: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          is_main?: boolean
          kind: string
          name: string
          owner_type: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number
          is_main?: boolean
          kind?: string
          name?: string
          owner_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category_id: string
          created_at: string
          id: string
          monthly_limit: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          monthly_limit: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          monthly_limit?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          id: string
          kind: string | null
          name: string
          nit: string | null
          setup: Json
          tax_regime: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string | null
          name: string
          nit?: string | null
          setup?: Json
          tax_regime?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: string | null
          name?: string
          nit?: string | null
          setup?: Json
          tax_regime?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: string
          emoji: string
          hidden: boolean
          id: string
          key: string | null
          kind: string
          name: string | null
          position: number
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          emoji: string
          hidden?: boolean
          id?: string
          key?: string | null
          kind?: string
          name?: string | null
          position?: number
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          emoji?: string
          hidden?: boolean
          id?: string
          key?: string | null
          kind?: string
          name?: string | null
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      consents: {
        Row: {
          channel: string
          created_at: string
          granted: boolean
          id: string
          kind: string
          policy_version: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          granted: boolean
          id?: string
          kind: string
          policy_version: string
          user_id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          granted?: boolean
          id?: string
          kind?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          business_id: string
          city: string | null
          consent_at: string
          created_at: string
          data_consent: boolean
          doc_number: string | null
          doc_type: string | null
          email: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          city?: string | null
          consent_at?: string
          created_at?: string
          data_consent: boolean
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          city?: string | null
          consent_at?: string
          created_at?: string
          data_consent?: boolean
          doc_number?: string | null
          doc_type?: string | null
          email?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          business_id: string
          created_at: string
          credit_limit: number
          id: string
          initial_debt: number
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          credit_limit?: number
          id?: string
          initial_debt?: number
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          credit_limit?: number
          id?: string
          initial_debt?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          balance: number
          created_at: string
          emoji: string
          id: string
          min_payment: number
          name: string
          rate_ea: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance: number
          created_at?: string
          emoji?: string
          id?: string
          min_payment?: number
          name: string
          rate_ea?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          balance?: number
          created_at?: string
          emoji?: string
          id?: string
          min_payment?: number
          name?: string
          rate_ea?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          saved: number
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          saved?: number
          target: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          saved?: number
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          account_id: string | null
          amount: number
          business_id: string | null
          card_id: string | null
          category_id: string | null
          contact_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          kind: string
          owner_type: string
          paid: boolean
          recurring_id: string | null
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          business_id?: string | null
          card_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          kind: string
          owner_type?: string
          paid?: boolean
          recurring_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          business_id?: string | null
          card_id?: string | null
          category_id?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          kind?: string
          owner_type?: string
          paid?: boolean
          recurring_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_snapshots: {
        Row: {
          assets_total: number
          debts_total: number
          goals_total: number
          month: string
          net: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assets_total: number
          debts_total: number
          goals_total: number
          month: string
          net: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          assets_total?: number
          debts_total?: number
          goals_total?: number
          month?: string
          net?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country: string
          created_at: string
          currency: string
          document_number: string | null
          document_type: string | null
          full_name: string | null
          id: string
          language: string
          onboarded_at: string | null
          phone: string | null
          preferences: Json
          updated_at: string
          usage: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id: string
          language?: string
          onboarded_at?: string | null
          phone?: string | null
          preferences?: Json
          updated_at?: string
          usage?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          document_number?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          language?: string
          onboarded_at?: string | null
          phone?: string | null
          preferences?: Json
          updated_at?: string
          usage?: string | null
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          business_id: string
          created_at: string
          day_of_month: number
          id: string
          kind: string
          name: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          business_id: string
          created_at?: string
          day_of_month: number
          id?: string
          kind?: string
          name: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          business_id?: string
          created_at?: string
          day_of_month?: number
          id?: string
          kind?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_parameters: {
        Row: {
          note: string | null
          params: Json
          updated_at: string
          year: number
        }
        Insert: {
          note?: string | null
          params: Json
          updated_at?: string
          year: number
        }
        Update: {
          note?: string | null
          params?: Json
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      transfers: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          date: string
          from_account: string
          id: string
          note: string | null
          to_account: string | null
          to_card: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          date: string
          from_account: string
          id?: string
          note?: string | null
          to_account?: string | null
          to_card?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          date?: string
          from_account?: string
          id?: string
          note?: string | null
          to_account?: string | null
          to_card?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_fkey"
            columns: ["from_account"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_fkey"
            columns: ["to_account"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_card_fkey"
            columns: ["to_card"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_main: boolean
          name: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_main?: boolean
          name: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_main?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abonar_deuda: { Args: { deuda: string; monto: number }; Returns: number }
      abonar_meta: { Args: { meta: string; monto: number }; Returns: number }
      completar_onboarding: { Args: { datos: Json }; Returns: undefined }
      contacto_del_negocio: {
        Args: { contacto: string; negocio: string }
        Returns: boolean
      }
      crear_categorias_iniciales: { Args: never; Returns: undefined }
      crear_negocio: {
        Args: { ciudad?: string; nombre: string; tipo?: string }
        Returns: {
          city: string | null
          created_at: string
          created_by: string
          id: string
          kind: string | null
          name: string
          nit: string | null
          setup: Json
          tax_regime: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cuenta_del_negocio: {
        Args: { cuenta: string; negocio: string }
        Returns: boolean
      }
      eliminar_mi_cuenta: { Args: never; Returns: undefined }
      es_dueno: { Args: { negocio: string }; Returns: boolean }
      es_miembro: { Args: { negocio: string }; Returns: boolean }
      guardar_foto_patrimonio: { Args: never; Returns: undefined }
      quitar_cuenta_negocio: { Args: { cuenta: string }; Returns: number }
      recurrente_del_negocio: {
        Args: { negocio: string; recurrente: string }
        Returns: boolean
      }
      tarjeta_del_negocio: {
        Args: { negocio: string; tarjeta: string }
        Returns: boolean
      }
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
  public: {
    Enums: {},
  },
} as const

