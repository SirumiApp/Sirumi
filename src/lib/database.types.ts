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
      business_invites: {
        Row: {
          business_id: string
          code: string
          created_at: string
          created_by: string | null
          display_name: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
          warehouse_id: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          created_by?: string | null
          display_name: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          warehouse_id?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_invites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_invites_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          created_at: string
          display_name: string | null
          role: string
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          display_name?: string | null
          role: string
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          display_name?: string | null
          role?: string
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      discount_codes: {
        Row: {
          active: boolean
          business_id: string
          code: string
          created_at: string
          expires_on: string | null
          id: string
          kind: string
          value: number
        }
        Insert: {
          active?: boolean
          business_id: string
          code: string
          created_at?: string
          expires_on?: string | null
          id?: string
          kind: string
          value: number
        }
        Update: {
          active?: boolean
          business_id?: string
          code?: string
          created_at?: string
          expires_on?: string | null
          id?: string
          kind?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_movements: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          kind: string
          note: string | null
          quantity: number
          reason: string | null
          undone: boolean
          variant_id: string
          warehouse_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          kind: string
          note?: string | null
          quantity: number
          reason?: string | null
          undone?: boolean
          variant_id: string
          warehouse_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          quantity?: number
          reason?: string | null
          undone?: boolean
          variant_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
          import_id: string | null
          kind: string
          owner_type: string
          paid: boolean
          recurring_id: string | null
          sale_id: string | null
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
          import_id?: string | null
          kind: string
          owner_type?: string
          paid?: boolean
          recurring_id?: string | null
          sale_id?: string | null
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
          import_id?: string | null
          kind?: string
          owner_type?: string
          paid?: boolean
          recurring_id?: string | null
          sale_id?: string | null
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
            foreignKeyName: "movements_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_recurring_id_fkey"
            columns: ["recurring_id"]
            isOneToOne: false
            referencedRelation: "recurring_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      payment_methods: {
        Row: {
          account_id: string
          business_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_id: string
          business_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          business_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          business_id: string
          color: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          size: string | null
        }
        Insert: {
          barcode?: string | null
          business_id: string
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          size?: string | null
        }
        Update: {
          barcode?: string | null
          business_id?: string
          color?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          collection: string | null
          cost: number
          cost_breakdown: Json | null
          created_at: string
          emoji: string
          id: string
          min_stock: number
          name: string
          photo_path: string | null
          price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          collection?: string | null
          cost?: number
          cost_breakdown?: Json | null
          created_at?: string
          emoji?: string
          id?: string
          min_stock?: number
          name: string
          photo_path?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          collection?: string | null
          cost?: number
          cost_breakdown?: Json | null
          created_at?: string
          emoji?: string
          id?: string
          min_stock?: number
          name?: string
          photo_path?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
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
      push_tokens: {
        Row: {
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string | null
          token: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_payments: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          business_id: string | null
          category_id: string | null
          created_at: string
          day_of_month: number
          id: string
          kind: string
          name: string
          owner_type: string
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          business_id?: string | null
          category_id?: string | null
          created_at?: string
          day_of_month: number
          id?: string
          kind?: string
          name: string
          owner_type?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          business_id?: string | null
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          id?: string
          kind?: string
          name?: string
          owner_type?: string
          user_id?: string | null
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
          {
            foreignKeyName: "recurring_payments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          business_id: string
          id: string
          line_total: number
          name: string
          quantity: number
          returned_qty: number
          sale_id: string
          unit_cost: number | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          business_id: string
          id?: string
          line_total: number
          name: string
          quantity: number
          returned_qty?: number
          sale_id: string
          unit_cost?: number | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          business_id?: string
          id?: string
          line_total?: number
          name?: string
          quantity?: number
          returned_qty?: number
          sale_id?: string
          unit_cost?: number | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string
          change: number | null
          client_id: string | null
          contact_id: string | null
          created_at: string
          date: string
          discount: number
          discount_code: string | null
          id: string
          number: number
          offline: boolean
          payments: Json
          received: number | null
          returned_amount: number
          returned_at: string | null
          seller_id: string | null
          status: string
          subtotal: number
          tax: number
          tax_included: boolean | null
          tax_rate: number | null
          total: number
          warehouse_id: string | null
        }
        Insert: {
          business_id: string
          change?: number | null
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          date: string
          discount?: number
          discount_code?: string | null
          id?: string
          number: number
          offline?: boolean
          payments?: Json
          received?: number | null
          returned_amount?: number
          returned_at?: string | null
          seller_id?: string | null
          status?: string
          subtotal: number
          tax?: number
          tax_included?: boolean | null
          tax_rate?: number | null
          total: number
          warehouse_id?: string | null
        }
        Update: {
          business_id?: string
          change?: number | null
          client_id?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string
          discount?: number
          discount_code?: string | null
          id?: string
          number?: number
          offline?: boolean
          payments?: Json
          received?: number | null
          returned_amount?: number
          returned_at?: string | null
          seller_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_included?: boolean | null
          tax_rate?: number | null
          total?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_imports: {
        Row: {
          account_id: string | null
          adjustment: number
          business_id: string | null
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          inflows: number
          month: string
          outflows: number
          owner_type: string
          rows: number
          user_id: string | null
        }
        Insert: {
          account_id?: string | null
          adjustment?: number
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          inflows?: number
          month: string
          outflows?: number
          owner_type: string
          rows?: number
          user_id?: string | null
        }
        Update: {
          account_id?: string | null
          adjustment?: number
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          inflows?: number
          month?: string
          outflows?: number
          owner_type?: string
          rows?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "statement_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statement_imports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          business_id: string
          quantity: number
          variant_id: string
          warehouse_id: string
        }
        Insert: {
          business_id: string
          quantity?: number
          variant_id: string
          warehouse_id: string
        }
        Update: {
          business_id?: string
          quantity?: number
          variant_id?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
      _cambiar_stock: {
        Args: {
          bodega: string
          delta: number
          negocio: string
          variante: string
        }
        Returns: number
      }
      _negocio_de_variante: {
        Args: { bodega: string; variante: string }
        Returns: string
      }
      _sacar_hasta_cero: {
        Args: {
          bodega: string
          cantidad: number
          negocio: string
          variante: string
        }
        Returns: number
      }
      abonar_deuda: { Args: { deuda: string; monto: number }; Returns: number }
      abonar_meta: { Args: { meta: string; monto: number }; Returns: number }
      cobrar_venta: { Args: { datos: Json }; Returns: Json }
      completar_onboarding: { Args: { datos: Json }; Returns: undefined }
      configuracion_de_negocio: { Args: { negocio: string }; Returns: Json }
      contacto_del_negocio: {
        Args: { contacto: string; negocio: string }
        Returns: boolean
      }
      crear_categorias_iniciales: { Args: never; Returns: undefined }
      crear_invitacion: {
        Args: { bodega?: string; negocio: string; nombre: string }
        Returns: string
      }
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
      crear_producto: { Args: { datos: Json }; Returns: string }
      cuenta_del_negocio: {
        Args: { cuenta: string; negocio: string }
        Returns: boolean
      }
      cuentas_para_vender: {
        Args: { negocio: string }
        Returns: {
          id: string
          is_main: boolean
          kind: string
          name: string
        }[]
      }
      deshacer_importacion: {
        Args: { importacion: string }
        Returns: undefined
      }
      deshacer_movimiento_inventario: {
        Args: { movimiento: string }
        Returns: undefined
      }
      devolver_parte: { Args: { items: Json; venta: string }; Returns: Json }
      devolver_venta: { Args: { venta: string }; Returns: undefined }
      eliminar_mi_cuenta: { Args: never; Returns: undefined }
      es_dueno: { Args: { negocio: string }; Returns: boolean }
      es_miembro: { Args: { negocio: string }; Returns: boolean }
      formato_pesos: { Args: { valor: number }; Returns: string }
      guardar_foto_patrimonio: { Args: never; Returns: undefined }
      hacer_principal: { Args: { bodega: string }; Returns: undefined }
      importar_extracto: { Args: { datos: Json }; Returns: string }
      mover_inventario: {
        Args: {
          bodega: string
          cantidad: number
          motivo?: string
          nota?: string
          variante: string
        }
        Returns: string
      }
      negocio_de_ruta: { Args: { ruta: string }; Returns: string }
      producto_del_negocio: {
        Args: { negocio: string; producto: string }
        Returns: boolean
      }
      quitar_bodega: { Args: { bodega: string }; Returns: undefined }
      quitar_cuenta_negocio: { Args: { cuenta: string }; Returns: number }
      quitar_variante: { Args: { variante: string }; Returns: undefined }
      quitar_vendedor: {
        Args: { negocio: string; usuario: string }
        Returns: undefined
      }
      recurrente_del_negocio: {
        Args: { negocio: string; recurrente: string }
        Returns: boolean
      }
      recurrente_personal: { Args: { recurrente: string }; Returns: boolean }
      registrar_celular: {
        Args: { plataforma: string; token_celular: string }
        Returns: undefined
      }
      revisar_codigo: { Args: { codigo: string }; Returns: string }
      tarjeta_del_negocio: {
        Args: { negocio: string; tarjeta: string }
        Returns: boolean
      }
      trasladar_inventario: {
        Args: {
          cantidad: number
          desde: string
          hacia: string
          variante: string
        }
        Returns: string
      }
      unirse_con_codigo: { Args: { codigo: string }; Returns: string }
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

