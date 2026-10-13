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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      factory_gallery: {
        Row: {
          caption_en: string | null
          caption_id: string | null
          category: "factory_office" | "machinery_equipment" | "production_process" | "warehouse_storage"
          created_at: string
          display_order: number
          id: string
          image_path: string
          is_featured: boolean
          is_placeholder: boolean
          is_published: boolean
          updated_at: string
        }
        Insert: {
          caption_en?: string | null
          caption_id?: string | null
          category: "factory_office" | "machinery_equipment" | "production_process" | "warehouse_storage"
          created_at?: string
          display_order?: number
          id?: string
          image_path: string
          is_featured?: boolean
          is_placeholder?: boolean
          is_published?: boolean
          updated_at?: string
        }
        Update: {
          caption_en?: string | null
          caption_id?: string | null
          category?: "factory_office" | "machinery_equipment" | "production_process" | "warehouse_storage"
          created_at?: string
          display_order?: number
          id?: string
          image_path?: string
          is_featured?: boolean
          is_placeholder?: boolean
          is_published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      outsole_categories: {
        Row: {
          category_id: string
          outsole_id: string
        }
        Insert: {
          category_id: string
          outsole_id: string
        }
        Update: {
          category_id?: string
          outsole_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsole_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsole_categories_outsole_id_fkey"
            columns: ["outsole_id"]
            isOneToOne: false
            referencedRelation: "outsoles"
            referencedColumns: ["id"]
          },
        ]
      }
      outsole_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          file_path: string
          id: string
          image_url: string
          is_primary: boolean
          outsole_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          file_path: string
          id?: string
          image_url: string
          is_primary?: boolean
          outsole_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          file_path?: string
          id?: string
          image_url?: string
          is_primary?: boolean
          outsole_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsole_images_outsole_id_fkey"
            columns: ["outsole_id"]
            isOneToOne: false
            referencedRelation: "outsoles"
            referencedColumns: ["id"]
          },
        ]
      }
      outsole_materials: {
        Row: {
          material_id: string
          outsole_id: string
        }
        Insert: {
          material_id: string
          outsole_id: string
        }
        Update: {
          material_id?: string
          outsole_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsole_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsole_materials_outsole_id_fkey"
            columns: ["outsole_id"]
            isOneToOne: false
            referencedRelation: "outsoles"
            referencedColumns: ["id"]
          },
        ]
      }
      outsole_traction_types: {
        Row: {
          outsole_id: string
          traction_type_id: string
        }
        Insert: {
          outsole_id: string
          traction_type_id: string
        }
        Update: {
          outsole_id?: string
          traction_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outsole_traction_types_outsole_id_fkey"
            columns: ["outsole_id"]
            isOneToOne: false
            referencedRelation: "outsoles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outsole_traction_types_traction_type_id_fkey"
            columns: ["traction_type_id"]
            isOneToOne: false
            referencedRelation: "traction_types"
            referencedColumns: ["id"]
          },
        ]
      }
      outsoles: {
        Row: {
          created_at: string
          description: string | null
          din_abrasion_mm3: number | null
          id: string
          is_featured: boolean
          is_sampling_available: boolean
          model_number: string
          name: string
          shore_max: number | null
          shore_min: number | null
          shore_scale: string
          slug: string
          status: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          din_abrasion_mm3?: number | null
          id?: string
          is_featured?: boolean
          is_sampling_available?: boolean
          model_number: string
          name: string
          shore_max?: number | null
          shore_min?: number | null
          shore_scale?: string
          slug: string
          status?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          din_abrasion_mm3?: number | null
          id?: string
          is_featured?: boolean
          is_sampling_available?: boolean
          model_number?: string
          name?: string
          shore_max?: number | null
          shore_min?: number | null
          shore_scale?: string
          slug?: string
          status?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      sample_inquiries: {
        Row: {
          client_name: string
          company_name: string
          created_at: string
          email: string
          id: string
          message: string
          outsole_id: string | null
          phone: string | null
          status: string
        }
        Insert: {
          client_name: string
          company_name: string
          created_at?: string
          email: string
          id?: string
          message: string
          outsole_id?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          client_name?: string
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          outsole_id?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sample_inquiries_outsole_id_fkey"
            columns: ["outsole_id"]
            isOneToOne: false
            referencedRelation: "outsoles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_content: {
        Row: {
          content: string | null
          content_en: string | null
          content_key: string
          id: string
          title: string | null
          title_en: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_en?: string | null
          content_key: string
          id?: string
          title?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_en?: string | null
          content_key?: string
          id?: string
          title?: string | null
          title_en?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      traction_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "editor"
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
    Enums: {
      app_role: ["admin", "editor"],
    },
  },
} as const
