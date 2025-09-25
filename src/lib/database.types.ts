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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      auctions: {
        Row: {
          arquivado: boolean | null
          created_at: string | null
          custos_numerico: number | null
          custos_texto: string | null
          data_encerramento: string | null
          data_entrada: string | null
          data_inicio: string
          data_vencimento_vista: string | null
          dia_vencimento_padrao: number | null
          endereco: string | null
          historico_notas: string[] | null
          id: string
          identificacao: string | null
          local: Database["public"]["Enums"]["location_type"]
          lotes: Json | null
          mes_inicio_pagamento: string | null
          nome: string
          parcelas_padrao: number | null
          status: Database["public"]["Enums"]["auction_status"] | null
          tipo_pagamento: string | null
          updated_at: string | null
        }
        Insert: {
          arquivado?: boolean | null
          created_at?: string | null
          custos_numerico?: number | null
          custos_texto?: string | null
          data_encerramento?: string | null
          data_entrada?: string | null
          data_inicio: string
          data_vencimento_vista?: string | null
          dia_vencimento_padrao?: number | null
          endereco?: string | null
          historico_notas?: string[] | null
          id?: string
          identificacao?: string | null
          local?: Database["public"]["Enums"]["location_type"]
          lotes?: Json | null
          mes_inicio_pagamento?: string | null
          nome: string
          parcelas_padrao?: number | null
          status?: Database["public"]["Enums"]["auction_status"] | null
          tipo_pagamento?: string | null
          updated_at?: string | null
        }
        Update: {
          arquivado?: boolean | null
          created_at?: string | null
          custos_numerico?: number | null
          custos_texto?: string | null
          data_encerramento?: string | null
          data_entrada?: string | null
          data_inicio?: string
          data_vencimento_vista?: string | null
          dia_vencimento_padrao?: number | null
          endereco?: string | null
          historico_notas?: string[] | null
          id?: string
          identificacao?: string | null
          local?: Database["public"]["Enums"]["location_type"]
          lotes?: Json | null
          mes_inicio_pagamento?: string | null
          nome?: string
          parcelas_padrao?: number | null
          status?: Database["public"]["Enums"]["auction_status"] | null
          tipo_pagamento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bidders: {
        Row: {
          arquivado: boolean | null
          auction_id: string
          created_at: string | null
          dia_vencimento_mensal: number | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          mes_inicio_pagamento: string | null
          nome: string
          observacoes: string | null
          parcelas_pagas: number | null
          quantidade_parcelas: number | null
          telefone: string | null
          updated_at: string | null
          valor_pagar_numerico: number | null
          valor_pagar_texto: string | null
        }
        Insert: {
          arquivado?: boolean | null
          auction_id: string
          created_at?: string | null
          dia_vencimento_mensal?: number | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          mes_inicio_pagamento?: string | null
          nome: string
          observacoes?: string | null
          parcelas_pagas?: number | null
          quantidade_parcelas?: number | null
          telefone?: string | null
          updated_at?: string | null
          valor_pagar_numerico?: number | null
          valor_pagar_texto?: string | null
        }
        Update: {
          arquivado?: boolean | null
          auction_id?: string
          created_at?: string | null
          dia_vencimento_mensal?: number | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          mes_inicio_pagamento?: string | null
          nome?: string
          observacoes?: string | null
          parcelas_pagas?: number | null
          quantidade_parcelas?: number | null
          telefone?: string | null
          updated_at?: string | null
          valor_pagar_numerico?: number | null
          valor_pagar_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bidders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bidders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          arquivado: boolean | null
          auction_id: string | null
          bidder_id: string | null
          categoria: Database["public"]["Enums"]["document_category"]
          created_at: string | null
          data_upload: string | null
          descricao: string | null
          id: string
          invoice_id: string | null
          lot_id: string | null
          merchandise_id: string | null
          nome: string
          storage_path: string | null
          tamanho: number | null
          tipo: Database["public"]["Enums"]["document_type"]
          updated_at: string | null
          url: string | null
        }
        Insert: {
          arquivado?: boolean | null
          auction_id?: string | null
          bidder_id?: string | null
          categoria?: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          data_upload?: string | null
          descricao?: string | null
          id?: string
          invoice_id?: string | null
          lot_id?: string | null
          merchandise_id?: string | null
          nome: string
          storage_path?: string | null
          tamanho?: number | null
          tipo: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          arquivado?: boolean | null
          auction_id?: string | null
          bidder_id?: string | null
          categoria?: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          data_upload?: string | null
          descricao?: string | null
          id?: string
          invoice_id?: string | null
          lot_id?: string | null
          merchandise_id?: string | null
          nome?: string
          storage_path?: string | null
          tamanho?: number | null
          tipo?: Database["public"]["Enums"]["document_type"]
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          arquivado: boolean | null
          auction_id: string
          bidder_id: string
          comissao: number | null
          created_at: string | null
          custos_adicionais: number | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          lot_id: string | null
          metodo_pagamento: string | null
          numero_fatura: string
          observacoes: string | null
          pdf_path: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          updated_at: string | null
          valor_arremate: number
          valor_liquido: number
        }
        Insert: {
          arquivado?: boolean | null
          auction_id: string
          bidder_id: string
          comissao?: number | null
          created_at?: string | null
          custos_adicionais?: number | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          lot_id?: string | null
          metodo_pagamento?: string | null
          numero_fatura: string
          observacoes?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string | null
          valor_arremate: number
          valor_liquido: number
        }
        Update: {
          arquivado?: boolean | null
          auction_id?: string
          bidder_id?: string
          comissao?: number | null
          created_at?: string | null
          custos_adicionais?: number | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          lot_id?: string | null
          metodo_pagamento?: string | null
          numero_fatura?: string
          observacoes?: string | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          updated_at?: string | null
          valor_arremate?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          arquivado: boolean | null
          auction_id: string
          bidder_id: string | null
          created_at: string | null
          descricao: string
          id: string
          incremento_lance: number | null
          merchandise_id: string | null
          numero: string
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_arremate: number | null
          valor_inicial: number
        }
        Insert: {
          arquivado?: boolean | null
          auction_id: string
          bidder_id?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          incremento_lance?: number | null
          merchandise_id?: string | null
          numero: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_arremate?: number | null
          valor_inicial: number
        }
        Update: {
          arquivado?: boolean | null
          auction_id?: string
          bidder_id?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          incremento_lance?: number | null
          merchandise_id?: string | null
          numero?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_arremate?: number | null
          valor_inicial?: number
        }
        Relationships: [
          {
            foreignKeyName: "lots_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_bidder_id_fkey"
            columns: ["bidder_id"]
            isOneToOne: false
            referencedRelation: "bidders_with_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lots_merchandise_id_fkey"
            columns: ["merchandise_id"]
            isOneToOne: false
            referencedRelation: "merchandise"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise: {
        Row: {
          arquivado: boolean | null
          auction_id: string
          created_at: string | null
          descricao: string
          id: string
          numero_lote: string | null
          observacoes: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor_numerico: number | null
          valor_texto: string | null
        }
        Insert: {
          arquivado?: boolean | null
          auction_id: string
          created_at?: string | null
          descricao: string
          id?: string
          numero_lote?: string | null
          observacoes?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Update: {
          arquivado?: boolean | null
          auction_id?: string
          created_at?: string | null
          descricao?: string
          id?: string
          numero_lote?: string | null
          observacoes?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_numerico?: number | null
          valor_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchandise_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchandise_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      auctions_complete: {
        Row: {
          arquivado: boolean | null
          created_at: string | null
          custos_numerico: number | null
          custos_texto: string | null
          data_encerramento: string | null
          data_inicio: string | null
          dia_vencimento_padrao: number | null
          endereco: string | null
          historico_notas: string[] | null
          id: string | null
          identificacao: string | null
          local: Database["public"]["Enums"]["location_type"] | null
          mes_inicio_pagamento: string | null
          nome: string | null
          parcelas_padrao: number | null
          status: Database["public"]["Enums"]["auction_status"] | null
          total_arrematantes: number | null
          total_documentos: number | null
          total_lotes: number | null
          total_mercadorias: number | null
          updated_at: string | null
          valor_pendente_arrematantes: number | null
        }
        Relationships: []
      }
      bidders_with_status: {
        Row: {
          arquivado: boolean | null
          auction_id: string | null
          created_at: string | null
          dia_vencimento_mensal: number | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string | null
          leilao_data: string | null
          leilao_nome: string | null
          mes_inicio_pagamento: string | null
          nome: string | null
          observacoes: string | null
          parcelas_pagas: number | null
          quantidade_parcelas: number | null
          status_pagamento: string | null
          telefone: string | null
          total_documentos: number | null
          updated_at: string | null
          valor_pagar_numerico: number | null
          valor_pagar_texto: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bidders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bidders_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_stats: {
        Row: {
          arrematantes_atrasados: number | null
          arrematantes_pendentes: number | null
          faturas_atrasadas: number | null
          faturas_em_aberto: number | null
          leiloes_agendados: number | null
          leiloes_em_andamento: number | null
          leiloes_finalizados: number | null
          total_a_receber: number | null
          total_arrematantes: number | null
          total_custos: number | null
          total_leiloes: number | null
          total_recebido: number | null
          valor_faturas_pendentes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_auction_status: {
        Args: { data_encerramento: string; data_inicio: string }
        Returns: Database["public"]["Enums"]["auction_status"]
      }
      calculate_invoice_status: {
        Args: { data_pagamento: string; data_vencimento: string }
        Returns: Database["public"]["Enums"]["invoice_status"]
      }
      get_auctions_with_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          arquivado: boolean
          created_at: string
          custos_numerico: number
          custos_texto: string
          data_andamento: string
          data_encerramento: string
          data_inicio: string
          endereco: string
          historico_notas: string[]
          id: string
          identificacao: string
          local: Database["public"]["Enums"]["location_type"]
          nome: string
          prazo_final_pagamento: string
          status: Database["public"]["Enums"]["auction_status"]
          total_arrematantes: number
          total_documentos: number
          total_lotes: number
          updated_at: string
          valor_total_arrecadado: number
        }[]
      }
    }
    Enums: {
      auction_status: "agendado" | "em_andamento" | "finalizado"
      document_category:
        | "leilao_geral"
        | "leilao_fotos_mercadoria"
        | "arrematante_documentos"
        | "mercadoria_fotos"
        | "mercadoria_documentos"
        | "lote_fotos"
        | "lote_documentos"
        | "lote_certificados"
        | "fatura_pdf"
        | "outros"
      document_type:
        | "pdf"
        | "doc"
        | "docx"
        | "jpg"
        | "jpeg"
        | "png"
        | "gif"
        | "xlsx"
        | "xls"
        | "txt"
        | "outros"
      invoice_status: "em_aberto" | "pago" | "atrasado" | "cancelado"
      location_type: "presencial" | "online" | "hibrido"
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
      auction_status: ["agendado", "em_andamento", "finalizado"],
      document_category: [
        "leilao_geral",
        "leilao_fotos_mercadoria",
        "arrematante_documentos",
        "mercadoria_fotos",
        "mercadoria_documentos",
        "lote_fotos",
        "lote_documentos",
        "lote_certificados",
        "fatura_pdf",
        "outros",
      ],
      document_type: [
        "pdf",
        "doc",
        "docx",
        "jpg",
        "jpeg",
        "png",
        "gif",
        "xlsx",
        "xls",
        "txt",
        "outros",
      ],
      invoice_status: ["em_aberto", "pago", "atrasado", "cancelado"],
      location_type: ["presencial", "online", "hibrido"],
    },
  },
} as const