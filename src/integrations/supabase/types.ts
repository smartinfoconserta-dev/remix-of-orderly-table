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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      restaurant_categories: {
        Row: {
          created_at: string | null
          icone: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          created_at?: string | null
          icone?: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          created_at?: string | null
          icone?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      restaurant_config: {
        Row: {
          banners: Json | null
          cor_primaria: string | null
          couvert_ativo: boolean | null
          couvert_obrigatorio: boolean | null
          couvert_valor: number | null
          cozinha_ativa: boolean | null
          created_at: string | null
          delivery_ativo: boolean | null
          horario_funcionamento: Json | null
          id: string
          impressao_por_setor: boolean | null
          instagram_bg: string | null
          instagram_url: string | null
          logo_base64: string | null
          logo_estilo: string | null
          logo_url: string | null
          mensagem_boas_vindas: string | null
          mensagem_fechado: string | null
          modo_identificacao_delivery: string | null
          modo_tv: string | null
          modulos: Json | null
          nome_impressora_bar: string | null
          nome_impressora_cozinha: string | null
          nome_restaurante: string
          plano: string | null
          senha_wifi: string | null
          taxa_entrega: number | null
          telefone: string | null
          tempo_entrega: string | null
          total_mesas: number | null
          updated_at: string | null
          wifi_bg: string | null
        }
        Insert: {
          banners?: Json | null
          cor_primaria?: string | null
          couvert_ativo?: boolean | null
          couvert_obrigatorio?: boolean | null
          couvert_valor?: number | null
          cozinha_ativa?: boolean | null
          created_at?: string | null
          delivery_ativo?: boolean | null
          horario_funcionamento?: Json | null
          id?: string
          impressao_por_setor?: boolean | null
          instagram_bg?: string | null
          instagram_url?: string | null
          logo_base64?: string | null
          logo_estilo?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_fechado?: string | null
          modo_identificacao_delivery?: string | null
          modo_tv?: string | null
          modulos?: Json | null
          nome_impressora_bar?: string | null
          nome_impressora_cozinha?: string | null
          nome_restaurante?: string
          plano?: string | null
          senha_wifi?: string | null
          taxa_entrega?: number | null
          telefone?: string | null
          tempo_entrega?: string | null
          total_mesas?: number | null
          updated_at?: string | null
          wifi_bg?: string | null
        }
        Update: {
          banners?: Json | null
          cor_primaria?: string | null
          couvert_ativo?: boolean | null
          couvert_obrigatorio?: boolean | null
          couvert_valor?: number | null
          cozinha_ativa?: boolean | null
          created_at?: string | null
          delivery_ativo?: boolean | null
          horario_funcionamento?: Json | null
          id?: string
          impressao_por_setor?: boolean | null
          instagram_bg?: string | null
          instagram_url?: string | null
          logo_base64?: string | null
          logo_estilo?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_fechado?: string | null
          modo_identificacao_delivery?: string | null
          modo_tv?: string | null
          modulos?: Json | null
          nome_impressora_bar?: string | null
          nome_impressora_cozinha?: string | null
          nome_restaurante?: string
          plano?: string | null
          senha_wifi?: string | null
          taxa_entrega?: number | null
          telefone?: string | null
          tempo_entrega?: string | null
          total_mesas?: number | null
          updated_at?: string | null
          wifi_bg?: string | null
        }
        Relationships: []
      }
      restaurant_license: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_vencimento: string | null
          id: string
          nome_cliente: string
          plano: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          nome_cliente?: string
          plano?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          nome_cliente?: string
          plano?: string | null
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
    Enums: {},
  },
} as const
