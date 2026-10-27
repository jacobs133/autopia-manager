export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      compatibility: {
        Row: {
          created_at: string;
          id: string;
          inventory_id: string;
          notes: string | null;
          source: string;
          vehicle_id: string;
          verification: Database["public"]["Enums"]["compat_verification"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          inventory_id: string;
          notes?: string | null;
          source?: string;
          vehicle_id: string;
          verification?: Database["public"]["Enums"]["compat_verification"];
        };
        Update: {
          created_at?: string;
          id?: string;
          inventory_id?: string;
          notes?: string | null;
          source?: string;
          vehicle_id?: string;
          verification?: Database["public"]["Enums"]["compat_verification"];
        };
        Relationships: [
          {
            foreignKeyName: "compatibility_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "compatibility_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          id: string;
          inventory_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          inventory_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          inventory_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
        ];
      };
      inventories: {
        Row: {
          condition: Database["public"]["Enums"]["part_condition"];
          created_at: string;
          description: string | null;
          id: string;
          internal_code: string | null;
          internal_notes: string | null;
          is_demo: boolean;
          location_id: string | null;
          oem_code: string | null;
          part_id: string;
          pickup_available: boolean;
          position_note: string | null;
          price: number;
          quantity: number;
          reserved_quantity: number;
          seller_id: string;
          seller_vehicle_id: string | null;
          shipping_available: boolean;
          shipping_cost: number | null;
          side: string | null;
          sold_quantity: number;
          source_vehicle_id: string | null;
          status: Database["public"]["Enums"]["inventory_status"];
          title: string;
          updated_at: string;
          views: number;
        };
        Insert: {
          condition?: Database["public"]["Enums"]["part_condition"];
          created_at?: string;
          description?: string | null;
          id?: string;
          internal_code?: string | null;
          internal_notes?: string | null;
          is_demo?: boolean;
          location_id?: string | null;
          oem_code?: string | null;
          part_id: string;
          pickup_available?: boolean;
          position_note?: string | null;
          price: number;
          quantity?: number;
          reserved_quantity?: number;
          seller_id: string;
          seller_vehicle_id?: string | null;
          shipping_available?: boolean;
          shipping_cost?: number | null;
          side?: string | null;
          sold_quantity?: number;
          source_vehicle_id?: string | null;
          status?: Database["public"]["Enums"]["inventory_status"];
          title: string;
          updated_at?: string;
          views?: number;
        };
        Update: {
          condition?: Database["public"]["Enums"]["part_condition"];
          created_at?: string;
          description?: string | null;
          id?: string;
          internal_code?: string | null;
          internal_notes?: string | null;
          is_demo?: boolean;
          location_id?: string | null;
          oem_code?: string | null;
          part_id?: string;
          pickup_available?: boolean;
          position_note?: string | null;
          price?: number;
          quantity?: number;
          reserved_quantity?: number;
          seller_id?: string;
          seller_vehicle_id?: string | null;
          shipping_available?: boolean;
          shipping_cost?: number | null;
          side?: string | null;
          sold_quantity?: number;
          source_vehicle_id?: string | null;
          status?: Database["public"]["Enums"]["inventory_status"];
          title?: string;
          updated_at?: string;
          views?: number;
        };
        Relationships: [
          {
            foreignKeyName: "inventories_location_fk";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "seller_inventory_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventories_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventories_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventories_seller_vehicle_fk";
            columns: ["seller_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "seller_vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventories_source_vehicle_id_fkey";
            columns: ["source_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_images: {
        Row: {
          id: string;
          inventory_id: string;
          position: number;
          url: string;
        };
        Insert: {
          id?: string;
          inventory_id: string;
          position?: number;
          url: string;
        };
        Update: {
          id?: string;
          inventory_id?: string;
          position?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_images_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          inventory_id: string;
          note: string | null;
          purchase_request_id: string | null;
          quantity_delta: number;
          sale_channel: string | null;
          seller_id: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inventory_id: string;
          note?: string | null;
          purchase_request_id?: string | null;
          quantity_delta?: number;
          sale_channel?: string | null;
          seller_id: string;
          type: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          inventory_id?: string;
          note?: string | null;
          purchase_request_id?: string | null;
          quantity_delta?: number;
          sale_channel?: string | null;
          seller_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_purchase_request_id_fkey";
            columns: ["purchase_request_id"];
            isOneToOne: false;
            referencedRelation: "purchase_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          inventory_id: string;
          order_id: string | null;
          quantity: number;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          inventory_id: string;
          order_id?: string | null;
          quantity?: number;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          inventory_id?: string;
          order_id?: string | null;
          quantity?: number;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          channel: string;
          created_at: string;
          id: string;
          link: string | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          channel?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          channel?: string;
          created_at?: string;
          id?: string;
          link?: string | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      order_refunds: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          fee_returned: number;
          id: string;
          order_id: string;
          reason: string | null;
          status: string;
          stripe_refund_id: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          fee_returned?: number;
          id?: string;
          order_id: string;
          reason?: string | null;
          status?: string;
          stripe_refund_id?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          fee_returned?: number;
          id?: string;
          order_id?: string;
          reason?: string | null;
          status?: string;
          stripe_refund_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          buyer_id: string;
          carrier: string | null;
          commission_on_shipping: boolean;
          created_at: string;
          currency: string;
          delivery_method: string;
          fee_refunded_amount: number;
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"];
          gross_amount: number;
          id: string;
          inventory_id: string;
          order_number: string | null;
          paid_at: string | null;
          payment_provider: string | null;
          payment_reference: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          platform_fee: number;
          platform_fee_percentage: number;
          purchase_protection_fee: number;
          purchase_protection_selected: boolean;
          purchase_request_id: string | null;
          quantity: number;
          refund_status: Database["public"]["Enums"]["refund_status"];
          refunded_amount: number;
          sale_channel: string;
          seller_amount: number;
          seller_id: string;
          shipped_at: string | null;
          shipping_address: string | null;
          shipping_cost: number;
          status: Database["public"]["Enums"]["order_status"];
          stripe_account_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          total: number;
          tracking_number: string | null;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          carrier?: string | null;
          commission_on_shipping?: boolean;
          created_at?: string;
          currency?: string;
          delivery_method?: string;
          fee_refunded_amount?: number;
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"];
          gross_amount: number;
          id?: string;
          inventory_id: string;
          order_number?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee: number;
          platform_fee_percentage: number;
          purchase_protection_fee?: number;
          purchase_protection_selected?: boolean;
          purchase_request_id?: string | null;
          quantity?: number;
          refund_status?: Database["public"]["Enums"]["refund_status"];
          refunded_amount?: number;
          sale_channel?: string;
          seller_amount: number;
          seller_id: string;
          shipped_at?: string | null;
          shipping_address?: string | null;
          shipping_cost?: number;
          status?: Database["public"]["Enums"]["order_status"];
          stripe_account_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          total: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          carrier?: string | null;
          commission_on_shipping?: boolean;
          created_at?: string;
          currency?: string;
          delivery_method?: string;
          fee_refunded_amount?: number;
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"];
          gross_amount?: number;
          id?: string;
          inventory_id?: string;
          order_number?: string | null;
          paid_at?: string | null;
          payment_provider?: string | null;
          payment_reference?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          platform_fee?: number;
          platform_fee_percentage?: number;
          purchase_protection_fee?: number;
          purchase_protection_selected?: boolean;
          purchase_request_id?: string | null;
          quantity?: number;
          refund_status?: Database["public"]["Enums"]["refund_status"];
          refunded_amount?: number;
          sale_channel?: string;
          seller_amount?: number;
          seller_id?: string;
          shipped_at?: string | null;
          shipping_address?: string | null;
          shipping_cost?: number;
          status?: Database["public"]["Enums"]["order_status"];
          stripe_account_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_transfer_id?: string | null;
          total?: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_purchase_request_id_fkey";
            columns: ["purchase_request_id"];
            isOneToOne: false;
            referencedRelation: "purchase_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      part_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      parts: {
        Row: {
          category_id: string | null;
          description: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          category_id?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          category_id?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: "parts_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "part_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          id: string;
          order_id: string | null;
          payload: Json | null;
          processed_at: string | null;
          stripe_event_id: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id?: string | null;
          payload?: Json | null;
          processed_at?: string | null;
          stripe_event_id: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string | null;
          payload?: Json | null;
          processed_at?: string | null;
          stripe_event_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          value: number;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          value: number;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          value?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          city: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      promotion_plans: {
        Row: {
          active: boolean;
          created_at: string;
          duration_hours: number;
          id: string;
          name: string;
          placement: string;
          price: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          duration_hours: number;
          id?: string;
          name: string;
          placement?: string;
          price: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          duration_hours?: number;
          id?: string;
          name?: string;
          placement?: string;
          price?: number;
        };
        Relationships: [];
      };
      promotions: {
        Row: {
          clicks: number;
          created_at: string;
          ends_at: string | null;
          id: string;
          impressions: number;
          inventory_id: string;
          orders_generated: number;
          placement: string;
          plan_id: string | null;
          price_paid: number;
          seller_id: string;
          starts_at: string | null;
          status: string;
        };
        Insert: {
          clicks?: number;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          impressions?: number;
          inventory_id: string;
          orders_generated?: number;
          placement: string;
          plan_id?: string | null;
          price_paid?: number;
          seller_id: string;
          starts_at?: string | null;
          status?: string;
        };
        Update: {
          clicks?: number;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          impressions?: number;
          inventory_id?: string;
          orders_generated?: number;
          placement?: string;
          plan_id?: string | null;
          price_paid?: number;
          seller_id?: string;
          starts_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotions_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "promotion_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "promotions_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_protection: {
        Row: {
          claim_reason: string | null;
          created_at: string;
          fee: number;
          id: string;
          order_id: string;
          refund_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          claim_reason?: string | null;
          created_at?: string;
          fee: number;
          id?: string;
          order_id: string;
          refund_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          claim_reason?: string | null;
          created_at?: string;
          fee?: number;
          id?: string;
          order_id?: string;
          refund_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_protection_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_protection_refund_id_fkey";
            columns: ["refund_id"];
            isOneToOne: false;
            referencedRelation: "order_refunds";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_requests: {
        Row: {
          buyer_id: string;
          buyer_note: string | null;
          created_at: string;
          delivery_method: string;
          expires_at: string;
          id: string;
          inventory_id: string;
          price_at_request: number;
          quantity: number;
          rejection_note: string | null;
          rejection_reason: string | null;
          seller_confirmed_at: string | null;
          seller_id: string;
          seller_rejected_at: string | null;
          status: Database["public"]["Enums"]["purchase_request_status"];
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          buyer_note?: string | null;
          created_at?: string;
          delivery_method?: string;
          expires_at: string;
          id?: string;
          inventory_id: string;
          price_at_request: number;
          quantity?: number;
          rejection_note?: string | null;
          rejection_reason?: string | null;
          seller_confirmed_at?: string | null;
          seller_id: string;
          seller_rejected_at?: string | null;
          status?: Database["public"]["Enums"]["purchase_request_status"];
          updated_at?: string;
        };
        Update: {
          buyer_id?: string;
          buyer_note?: string | null;
          created_at?: string;
          delivery_method?: string;
          expires_at?: string;
          id?: string;
          inventory_id?: string;
          price_at_request?: number;
          quantity?: number;
          rejection_note?: string | null;
          rejection_reason?: string | null;
          seller_confirmed_at?: string | null;
          seller_id?: string;
          seller_rejected_at?: string | null;
          status?: Database["public"]["Enums"]["purchase_request_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_requests_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "inventories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_requests_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_vehicles: {
        Row: {
          created_at: string;
          id: string;
          nickname: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nickname?: string | null;
          user_id: string;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nickname?: string | null;
          user_id?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_vehicles_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_inventory_locations: {
        Row: {
          code: string | null;
          created_at: string;
          id: string;
          level: string | null;
          position: string | null;
          seller_id: string;
          shelf: string | null;
          warehouse: string | null;
          zone: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string;
          id?: string;
          level?: string | null;
          position?: string | null;
          seller_id: string;
          shelf?: string | null;
          warehouse?: string | null;
          zone?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string;
          id?: string;
          level?: string | null;
          position?: string | null;
          seller_id?: string;
          shelf?: string | null;
          warehouse?: string | null;
          zone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "seller_inventory_locations_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_profiles: {
        Row: {
          address: string | null;
          admin_note: string | null;
          business_name: string;
          city: string;
          created_at: string;
          description: string | null;
          email: string | null;
          id: string;
          is_demo: boolean;
          latitude: number | null;
          legal_name: string | null;
          logo_url: string | null;
          longitude: number | null;
          opening_hours: string | null;
          phone: string | null;
          photo_url: string | null;
          postal_code: string | null;
          province: string | null;
          rating: number | null;
          reviewed_at: string | null;
          status: Database["public"]["Enums"]["seller_status"];
          updated_at: string;
          user_id: string | null;
          vat_number: string | null;
        };
        Insert: {
          address?: string | null;
          admin_note?: string | null;
          business_name: string;
          city: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_demo?: boolean;
          latitude?: number | null;
          legal_name?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          opening_hours?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          postal_code?: string | null;
          province?: string | null;
          rating?: number | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["seller_status"];
          updated_at?: string;
          user_id?: string | null;
          vat_number?: string | null;
        };
        Update: {
          address?: string | null;
          admin_note?: string | null;
          business_name?: string;
          city?: string;
          created_at?: string;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_demo?: boolean;
          latitude?: number | null;
          legal_name?: string | null;
          logo_url?: string | null;
          longitude?: number | null;
          opening_hours?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          postal_code?: string | null;
          province?: string | null;
          rating?: number | null;
          reviewed_at?: string | null;
          status?: Database["public"]["Enums"]["seller_status"];
          updated_at?: string;
          user_id?: string | null;
          vat_number?: string | null;
        };
        Relationships: [];
      };
      seller_subscription_plans: {
        Row: {
          active: boolean;
          created_at: string;
          features: string[];
          id: string;
          monthly_price: number | null;
          name: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          features?: string[];
          id?: string;
          monthly_price?: number | null;
          name: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          features?: string[];
          id?: string;
          monthly_price?: number | null;
          name?: string;
        };
        Relationships: [];
      };
      seller_subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan_id: string;
          seller_id: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id: string;
          seller_id: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan_id?: string;
          seller_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "seller_subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_subscriptions_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_vehicles: {
        Row: {
          arrival_date: string | null;
          body_style: string | null;
          catalog_vehicle_id: string | null;
          created_at: string;
          engine: string | null;
          fuel_type: string | null;
          generation: string | null;
          id: string;
          location: string | null;
          make: string;
          model: string;
          notes: string | null;
          photo_url: string | null;
          plate: string | null;
          power: string | null;
          seller_id: string;
          status: string;
          transmission: string | null;
          updated_at: string;
          version: string | null;
          vin: string | null;
          year: number | null;
        };
        Insert: {
          arrival_date?: string | null;
          body_style?: string | null;
          catalog_vehicle_id?: string | null;
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          generation?: string | null;
          id?: string;
          location?: string | null;
          make: string;
          model: string;
          notes?: string | null;
          photo_url?: string | null;
          plate?: string | null;
          power?: string | null;
          seller_id: string;
          status?: string;
          transmission?: string | null;
          updated_at?: string;
          version?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Update: {
          arrival_date?: string | null;
          body_style?: string | null;
          catalog_vehicle_id?: string | null;
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          generation?: string | null;
          id?: string;
          location?: string | null;
          make?: string;
          model?: string;
          notes?: string | null;
          photo_url?: string | null;
          plate?: string | null;
          power?: string | null;
          seller_id?: string;
          status?: string;
          transmission?: string | null;
          updated_at?: string;
          version?: string | null;
          vin?: string | null;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "seller_vehicles_catalog_vehicle_id_fkey";
            columns: ["catalog_vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_vehicles_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_accounts: {
        Row: {
          charges_enabled: boolean;
          created_at: string;
          details_submitted: boolean;
          id: string;
          livemode: boolean;
          onboarding_status: string;
          payouts_enabled: boolean;
          requirements: Json | null;
          seller_id: string;
          stripe_account_id: string;
          updated_at: string;
        };
        Insert: {
          charges_enabled?: boolean;
          created_at?: string;
          details_submitted?: boolean;
          id?: string;
          livemode?: boolean;
          onboarding_status?: string;
          payouts_enabled?: boolean;
          requirements?: Json | null;
          seller_id: string;
          stripe_account_id: string;
          updated_at?: string;
        };
        Update: {
          charges_enabled?: boolean;
          created_at?: string;
          details_submitted?: boolean;
          id?: string;
          livemode?: boolean;
          onboarding_status?: string;
          payouts_enabled?: boolean;
          requirements?: Json | null;
          seller_id?: string;
          stripe_account_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: true;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      vehicle_requests: {
        Row: {
          created_at: string;
          engine: string | null;
          fuel_type: string | null;
          id: string;
          make: string;
          model: string;
          notes: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
          year: number | null;
        };
        Insert: {
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          id?: string;
          make: string;
          model: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          year?: number | null;
        };
        Update: {
          created_at?: string;
          engine?: string | null;
          fuel_type?: string | null;
          id?: string;
          make?: string;
          model?: string;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          body_style: string | null;
          created_at: string;
          doors: number | null;
          engine: string | null;
          external_vehicle_id: string | null;
          fuel_type: string | null;
          generation: string | null;
          id: string;
          make: string;
          model: string;
          power: string | null;
          source: string | null;
          transmission: string | null;
          updated_at: string;
          version: string | null;
          year_from: number | null;
          year_to: number | null;
        };
        Insert: {
          body_style?: string | null;
          created_at?: string;
          doors?: number | null;
          engine?: string | null;
          external_vehicle_id?: string | null;
          fuel_type?: string | null;
          generation?: string | null;
          id?: string;
          make: string;
          model: string;
          power?: string | null;
          source?: string | null;
          transmission?: string | null;
          updated_at?: string;
          version?: string | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Update: {
          body_style?: string | null;
          created_at?: string;
          doors?: number | null;
          engine?: string | null;
          external_vehicle_id?: string | null;
          fuel_type?: string | null;
          generation?: string | null;
          id?: string;
          make?: string;
          model?: string;
          power?: string | null;
          source?: string | null;
          transmission?: string | null;
          updated_at?: string;
          version?: string | null;
          year_from?: number | null;
          year_to?: number | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_review_seller: {
        Args: { _decision: string; _note?: string; _seller_id: string };
        Returns: undefined;
      };
      buyer_cancel_request: {
        Args: { _request_id: string };
        Returns: undefined;
      };
      create_seller_request: {
        Args: { _email: string; _meta: Json; _user_id: string };
        Returns: string;
      };
      expire_purchase_requests: { Args: never; Returns: number };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      inventory_is_public: { Args: { _inventory_id: string }; Returns: boolean };
      is_approved_seller: {
        Args: { _seller_id: string; _user_id: string };
        Returns: boolean;
      };
      mark_inventory_sold_offline: {
        Args: { _channel?: string; _inventory_id: string; _quantity?: number };
        Returns: undefined;
      };
      owns_approved_inventory: {
        Args: { _inventory_id: string; _user_id: string };
        Returns: boolean;
      };
      owns_inventory: {
        Args: { _inventory_id: string; _user_id: string };
        Returns: boolean;
      };
      owns_seller: {
        Args: { _seller_id: string; _user_id: string };
        Returns: boolean;
      };
      request_purchase: {
        Args: {
          _delivery_method?: string;
          _inventory_id: string;
          _note?: string;
        };
        Returns: string;
      };
      request_seller_account: {
        Args: {
          _business_name: string;
          _city: string;
          _phone?: string;
          _province?: string;
        };
        Returns: string;
      };
      seller_is_public: { Args: { _seller_id: string }; Returns: boolean };
      seller_respond_request: {
        Args: {
          _accept: boolean;
          _note?: string;
          _reason?: string;
          _request_id: string;
        };
        Returns: undefined;
      };
      track_promotion: {
        Args: { _kind: string; _promotion_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "seller" | "customer";
      compat_verification:
        "seller_declared" | "database_verified" | "oem_verified" | "manually_verified";
      fulfillment_status:
        | "pending"
        | "processing"
        | "ready_for_pickup"
        | "shipped"
        | "delivered"
        | "completed"
        | "cancelled";
      inventory_status: "available" | "reserved" | "sold" | "inactive";
      order_status: "pending" | "confirmed" | "shipped" | "completed" | "cancelled";
      part_condition: "ottimo" | "buono" | "discreto" | "da_revisionare";
      payment_status:
        "pending" | "paid" | "failed" | "partially_refunded" | "refunded" | "disputed";
      purchase_request_status:
        | "pending_seller_confirmation"
        | "confirmed"
        | "payment_pending"
        | "paid"
        | "rejected"
        | "expired"
        | "payment_failed"
        | "cancelled";
      refund_status: "none" | "requested" | "partially_refunded" | "refunded" | "failed";
      seller_status: "pending" | "approved" | "suspended" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "customer"],
      compat_verification: [
        "seller_declared",
        "database_verified",
        "oem_verified",
        "manually_verified",
      ],
      fulfillment_status: [
        "pending",
        "processing",
        "ready_for_pickup",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
      ],
      inventory_status: ["available", "reserved", "sold", "inactive"],
      order_status: ["pending", "confirmed", "shipped", "completed", "cancelled"],
      part_condition: ["ottimo", "buono", "discreto", "da_revisionare"],
      payment_status: ["pending", "paid", "failed", "partially_refunded", "refunded", "disputed"],
      purchase_request_status: [
        "pending_seller_confirmation",
        "confirmed",
        "payment_pending",
        "paid",
        "rejected",
        "expired",
        "payment_failed",
        "cancelled",
      ],
      refund_status: ["none", "requested", "partially_refunded", "refunded", "failed"],
      seller_status: ["pending", "approved", "suspended", "rejected"],
    },
  },
} as const;