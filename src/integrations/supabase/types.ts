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
      bairros_delivery: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          store_id: string | null
          taxa: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id: string
          nome: string
          store_id?: string | null
          taxa?: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          store_id?: string | null
          taxa?: number
        }
        Relationships: [
          {
            foreignKeyName: "bairros_delivery_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_delivery: {
        Row: {
          bairro: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          criado_em: string | null
          endereco: string | null
          id: string
          nome: string
          numero: string | null
          referencia: string | null
          senha_hash: string | null
          store_id: string | null
          telefone: string | null
          ultimo_pedido: string | null
        }
        Insert: {
          bairro?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          criado_em?: string | null
          endereco?: string | null
          id: string
          nome?: string
          numero?: string | null
          referencia?: string | null
          senha_hash?: string | null
          store_id?: string | null
          telefone?: string | null
          ultimo_pedido?: string | null
        }
        Update: {
          bairro?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          criado_em?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          numero?: string | null
          referencia?: string | null
          senha_hash?: string | null
          store_id?: string | null
          telefone?: string | null
          ultimo_pedido?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_delivery_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          activated_at: string
          active: boolean
          created_at: string | null
          device_id: string
          id: string
          label: string | null
          last_seen_at: string | null
          mesa_id: string | null
          store_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string
          active?: boolean
          created_at?: string | null
          device_id: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          mesa_id?: string | null
          store_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string
          active?: boolean
          created_at?: string | null
          device_id?: string
          id?: string
          label?: string | null
          last_seen_at?: string | null
          mesa_id?: string | null
          store_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      estado_caixa: {
        Row: {
          aberto: boolean | null
          aberto_em: string | null
          aberto_por: string | null
          created_at: string | null
          diferenca_dinheiro: number | null
          diferenca_motivo: string | null
          fechado_em: string | null
          fechado_por: string | null
          fundo_proximo: number | null
          fundo_troco: number | null
          id: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          aberto?: boolean | null
          aberto_em?: string | null
          aberto_por?: string | null
          created_at?: string | null
          diferenca_dinheiro?: number | null
          diferenca_motivo?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          fundo_proximo?: number | null
          fundo_troco?: number | null
          id?: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          aberto?: boolean | null
          aberto_em?: string | null
          aberto_por?: string | null
          created_at?: string | null
          diferenca_dinheiro?: number | null
          diferenca_motivo?: string | null
          fechado_em?: string | null
          fechado_por?: string | null
          fundo_proximo?: number | null
          fundo_troco?: number | null
          id?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      estado_mesas: {
        Row: {
          carrinho: Json | null
          chamado_em: number | null
          chamar_garcom: boolean | null
          id: string
          mesa_id: string
          numero: number
          pedidos: Json | null
          status: string
          store_id: string | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          carrinho?: Json | null
          chamado_em?: number | null
          chamar_garcom?: boolean | null
          id: string
          mesa_id: string
          numero: number
          pedidos?: Json | null
          status?: string
          store_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          carrinho?: Json | null
          chamado_em?: number | null
          chamar_garcom?: boolean | null
          id?: string
          mesa_id?: string
          numero?: number
          pedidos?: Json | null
          status?: string
          store_id?: string | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estado_mesas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_operacionais: {
        Row: {
          acao: string | null
          created_at: string | null
          criado_em: string | null
          criado_em_iso: string | null
          descricao: string | null
          id: string
          item_nome: string | null
          mesa_id: string | null
          motivo: string | null
          pedido_numero: number | null
          store_id: string
          tipo: string
          usuario_id: string | null
          usuario_nome: string | null
          valor: number | null
        }
        Insert: {
          acao?: string | null
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          descricao?: string | null
          id: string
          item_nome?: string | null
          mesa_id?: string | null
          motivo?: string | null
          pedido_numero?: number | null
          store_id: string
          tipo: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number | null
        }
        Update: {
          acao?: string | null
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          descricao?: string | null
          id?: string
          item_nome?: string | null
          mesa_id?: string | null
          motivo?: string | null
          pedido_numero?: number | null
          store_id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      fechamentos: {
        Row: {
          caixa_id: string | null
          caixa_nome: string | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_motivo: string | null
          cancelado_por: string | null
          couvert: number | null
          cpf_nota: string | null
          created_at: string | null
          criado_em: string | null
          criado_em_iso: string | null
          desconto: number | null
          forma_pagamento: string | null
          id: string
          itens: Json | null
          mesa_id: string | null
          mesa_numero: number | null
          numero_comanda: number | null
          numero_pessoas: number | null
          origem: string | null
          pagamentos: Json | null
          store_id: string
          subtotal: number | null
          total: number | null
          troco: number | null
        }
        Insert: {
          caixa_id?: string | null
          caixa_nome?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          couvert?: number | null
          cpf_nota?: string | null
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          desconto?: number | null
          forma_pagamento?: string | null
          id: string
          itens?: Json | null
          mesa_id?: string | null
          mesa_numero?: number | null
          numero_comanda?: number | null
          numero_pessoas?: number | null
          origem?: string | null
          pagamentos?: Json | null
          store_id: string
          subtotal?: number | null
          total?: number | null
          troco?: number | null
        }
        Update: {
          caixa_id?: string | null
          caixa_nome?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          couvert?: number | null
          cpf_nota?: string | null
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          itens?: Json | null
          mesa_id?: string | null
          mesa_numero?: number | null
          numero_comanda?: number | null
          numero_pessoas?: number | null
          origem?: string | null
          pagamentos?: Json | null
          store_id?: string
          subtotal?: number | null
          total?: number | null
          troco?: number | null
        }
        Relationships: []
      }
      master_clientes: {
        Row: {
          ativo: boolean | null
          aviso_ativo: boolean | null
          aviso_texto: string | null
          cidade: string | null
          cnpj: string | null
          criado_em: string | null
          data_inicio: string | null
          data_termino: string | null
          data_vencimento: string | null
          dia_vencimento: number | null
          email: string | null
          endereco: string | null
          estado: string | null
          historico_pagamentos: Json | null
          id: string
          nome_contato: string | null
          nome_restaurante: string
          observacoes: string | null
          plano: string | null
          plano_modulos: string | null
          segmento: string | null
          telefone: string | null
          updated_at: string | null
          valor_mensalidade: number | null
        }
        Insert: {
          ativo?: boolean | null
          aviso_ativo?: boolean | null
          aviso_texto?: string | null
          cidade?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          data_vencimento?: string | null
          dia_vencimento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          historico_pagamentos?: Json | null
          id: string
          nome_contato?: string | null
          nome_restaurante?: string
          observacoes?: string | null
          plano?: string | null
          plano_modulos?: string | null
          segmento?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_mensalidade?: number | null
        }
        Update: {
          ativo?: boolean | null
          aviso_ativo?: boolean | null
          aviso_texto?: string | null
          cidade?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          data_vencimento?: string | null
          dia_vencimento?: number | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          historico_pagamentos?: Json | null
          id?: string
          nome_contato?: string | null
          nome_restaurante?: string
          observacoes?: string | null
          plano?: string | null
          plano_modulos?: string | null
          segmento?: string | null
          telefone?: string | null
          updated_at?: string | null
          valor_mensalidade?: number | null
        }
        Relationships: []
      }
      master_despesas: {
        Row: {
          categoria: string | null
          created_at: string | null
          data: string | null
          descricao: string
          id: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          data?: string | null
          descricao?: string
          id: string
          valor?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          data?: string | null
          descricao?: string
          id?: string
          valor?: number
        }
        Relationships: []
      }
      mesas: {
        Row: {
          capacidade: number | null
          created_at: string | null
          id: string
          nome: string | null
          numero: number
          status: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          capacidade?: number | null
          created_at?: string | null
          id?: string
          nome?: string | null
          numero: number
          status?: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          capacidade?: number | null
          created_at?: string | null
          id?: string
          nome?: string | null
          numero?: number
          status?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      module_pins: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          label: string | null
          module: string
          pin_hash: string
          store_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          module: string
          pin_hash: string
          store_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string | null
          module?: string
          pin_hash?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_pins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      motoboy_fechamentos: {
        Row: {
          conferido_em: string | null
          conferido_por: string | null
          created_at: string | null
          id: string
          motoboy_id: string
          motoboy_nome: string
          pedidos_ids: Json | null
          resumo: Json | null
          status: string
          store_id: string
        }
        Insert: {
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string | null
          id: string
          motoboy_id: string
          motoboy_nome?: string
          pedidos_ids?: Json | null
          resumo?: Json | null
          status?: string
          store_id: string
        }
        Update: {
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string | null
          id?: string
          motoboy_id?: string
          motoboy_nome?: string
          pedidos_ids?: Json | null
          resumo?: Json | null
          status?: string
          store_id?: string
        }
        Relationships: []
      }
      motoboys: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          nome: string
          pin_hash: string
          store_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id: string
          nome: string
          pin_hash?: string
          store_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome?: string
          pin_hash?: string
          store_id?: string
        }
        Relationships: []
      }
      movimentacoes_caixa: {
        Row: {
          created_at: string | null
          criado_em: string | null
          criado_em_iso: string | null
          descricao: string | null
          id: string
          store_id: string
          tipo: string
          usuario_id: string | null
          usuario_nome: string | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          descricao?: string | null
          id: string
          store_id: string
          tipo: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          criado_em?: string | null
          criado_em_iso?: string | null
          descricao?: string | null
          id?: string
          store_id?: string
          tipo?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          bairro: string | null
          caixa_id: string | null
          caixa_nome: string | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_motivo: string | null
          cancelado_por: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string | null
          criado_em: string
          criado_em_iso: string
          endereco_completo: string | null
          forma_pagamento_delivery: string | null
          garcom_id: string | null
          garcom_nome: string | null
          id: string
          itens: Json
          mesa_id: string | null
          motoboy_nome: string | null
          numero_pedido: number
          observacao_geral: string | null
          origem: string
          para_viagem: boolean | null
          pronto: boolean | null
          referencia: string | null
          status_balcao: string | null
          store_id: string | null
          total: number
          troco_para_quanto: number | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          caixa_id?: string | null
          caixa_nome?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          criado_em: string
          criado_em_iso?: string
          endereco_completo?: string | null
          forma_pagamento_delivery?: string | null
          garcom_id?: string | null
          garcom_nome?: string | null
          id: string
          itens?: Json
          mesa_id?: string | null
          motoboy_nome?: string | null
          numero_pedido: number
          observacao_geral?: string | null
          origem?: string
          para_viagem?: boolean | null
          pronto?: boolean | null
          referencia?: string | null
          status_balcao?: string | null
          store_id?: string | null
          total?: number
          troco_para_quanto?: number | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          caixa_id?: string | null
          caixa_nome?: string | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_motivo?: string | null
          cancelado_por?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          criado_em?: string
          criado_em_iso?: string
          endereco_completo?: string | null
          forma_pagamento_delivery?: string | null
          garcom_id?: string | null
          garcom_nome?: string | null
          id?: string
          itens?: Json
          mesa_id?: string | null
          motoboy_nome?: string | null
          numero_pedido?: number
          observacao_geral?: string | null
          origem?: string
          para_viagem?: boolean | null
          pronto?: boolean | null
          referencia?: string | null
          status_balcao?: string | null
          store_id?: string | null
          total?: number
          troco_para_quanto?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_operacionais: {
        Row: {
          chave: string
          id: string
          modulo: string
          store_id: string
          updated_at: string
          valor: string | null
        }
        Insert: {
          chave: string
          id?: string
          modulo: string
          store_id: string
          updated_at?: string
          valor?: string | null
        }
        Update: {
          chave?: string
          id?: string
          modulo?: string
          store_id?: string
          updated_at?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_operacionais_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          adicionais: Json | null
          ativo: boolean | null
          bebida_options: Json | null
          categoria_id: string
          controle_estoque: boolean | null
          created_at: string | null
          descricao: string | null
          disponivel_delivery: boolean | null
          embalagem_options: Json | null
          estoque_minimo: number | null
          etapas_fluxo: Json | null
          grupos: Json | null
          id: string
          imagem: string | null
          imagem_base64: string | null
          ingredientes_removiveis: Json | null
          nome: string
          ordem: number | null
          permite_levar: boolean | null
          preco: number
          quantidade_estoque: number | null
          removido: boolean | null
          setor: string | null
          store_id: string
          tipo_options: Json | null
          updated_at: string | null
        }
        Insert: {
          adicionais?: Json | null
          ativo?: boolean | null
          bebida_options?: Json | null
          categoria_id: string
          controle_estoque?: boolean | null
          created_at?: string | null
          descricao?: string | null
          disponivel_delivery?: boolean | null
          embalagem_options?: Json | null
          estoque_minimo?: number | null
          etapas_fluxo?: Json | null
          grupos?: Json | null
          id?: string
          imagem?: string | null
          imagem_base64?: string | null
          ingredientes_removiveis?: Json | null
          nome: string
          ordem?: number | null
          permite_levar?: boolean | null
          preco?: number
          quantidade_estoque?: number | null
          removido?: boolean | null
          setor?: string | null
          store_id: string
          tipo_options?: Json | null
          updated_at?: string | null
        }
        Update: {
          adicionais?: Json | null
          ativo?: boolean | null
          bebida_options?: Json | null
          categoria_id?: string
          controle_estoque?: boolean | null
          created_at?: string | null
          descricao?: string | null
          disponivel_delivery?: boolean | null
          embalagem_options?: Json | null
          estoque_minimo?: number | null
          etapas_fluxo?: Json | null
          grupos?: Json | null
          id?: string
          imagem?: string | null
          imagem_base64?: string | null
          ingredientes_removiveis?: Json | null
          nome?: string
          ordem?: number | null
          permite_levar?: boolean | null
          preco?: number
          quantidade_estoque?: number | null
          removido?: boolean | null
          setor?: string | null
          store_id?: string
          tipo_options?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurant_categories: {
        Row: {
          created_at: string | null
          icone: string
          id: string
          nome: string
          ordem: number | null
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          icone?: string
          id?: string
          nome: string
          ordem?: number | null
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          icone?: string
          id?: string
          nome?: string
          ordem?: number | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_config: {
        Row: {
          aviso_master: Json | null
          banners: Json | null
          cardapio_banner_base64: string | null
          cardapio_header_estilo: string | null
          cardapio_overrides: Json | null
          cor_primaria: string | null
          couvert_ativo: boolean | null
          couvert_obrigatorio: boolean | null
          couvert_valor: number | null
          cozinha_ativa: boolean | null
          cpf_nota_ativo: boolean | null
          created_at: string | null
          delivery_ativo: boolean | null
          horario_funcionamento: Json | null
          id: string
          identificacao_fast_food: string
          impressao_por_setor: boolean | null
          instagram_bg: string | null
          instagram_url: string | null
          logo_base64: string | null
          logo_estilo: string | null
          logo_url: string | null
          mensagem_boas_vindas: string | null
          mensagem_fechado: string | null
          modo_identificacao_delivery: string | null
          modo_operacao: string
          modo_tv: string | null
          modulos: Json | null
          nome_impressora_bar: string | null
          nome_impressora_cozinha: string | null
          nome_restaurante: string
          plano: string | null
          senha_wifi: string | null
          store_id: string | null
          taxa_entrega: number | null
          telefone: string | null
          tempo_entrega: string | null
          total_mesas: number | null
          updated_at: string | null
          wifi_bg: string | null
        }
        Insert: {
          aviso_master?: Json | null
          banners?: Json | null
          cardapio_banner_base64?: string | null
          cardapio_header_estilo?: string | null
          cardapio_overrides?: Json | null
          cor_primaria?: string | null
          couvert_ativo?: boolean | null
          couvert_obrigatorio?: boolean | null
          couvert_valor?: number | null
          cozinha_ativa?: boolean | null
          cpf_nota_ativo?: boolean | null
          created_at?: string | null
          delivery_ativo?: boolean | null
          horario_funcionamento?: Json | null
          id?: string
          identificacao_fast_food?: string
          impressao_por_setor?: boolean | null
          instagram_bg?: string | null
          instagram_url?: string | null
          logo_base64?: string | null
          logo_estilo?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_fechado?: string | null
          modo_identificacao_delivery?: string | null
          modo_operacao?: string
          modo_tv?: string | null
          modulos?: Json | null
          nome_impressora_bar?: string | null
          nome_impressora_cozinha?: string | null
          nome_restaurante?: string
          plano?: string | null
          senha_wifi?: string | null
          store_id?: string | null
          taxa_entrega?: number | null
          telefone?: string | null
          tempo_entrega?: string | null
          total_mesas?: number | null
          updated_at?: string | null
          wifi_bg?: string | null
        }
        Update: {
          aviso_master?: Json | null
          banners?: Json | null
          cardapio_banner_base64?: string | null
          cardapio_header_estilo?: string | null
          cardapio_overrides?: Json | null
          cor_primaria?: string | null
          couvert_ativo?: boolean | null
          couvert_obrigatorio?: boolean | null
          couvert_valor?: number | null
          cozinha_ativa?: boolean | null
          cpf_nota_ativo?: boolean | null
          created_at?: string | null
          delivery_ativo?: boolean | null
          horario_funcionamento?: Json | null
          id?: string
          identificacao_fast_food?: string
          impressao_por_setor?: boolean | null
          instagram_bg?: string | null
          instagram_url?: string | null
          logo_base64?: string | null
          logo_estilo?: string | null
          logo_url?: string | null
          mensagem_boas_vindas?: string | null
          mensagem_fechado?: string | null
          modo_identificacao_delivery?: string | null
          modo_operacao?: string
          modo_tv?: string | null
          modulos?: Json | null
          nome_impressora_bar?: string | null
          nome_impressora_cozinha?: string | null
          nome_restaurante?: string
          plano?: string | null
          senha_wifi?: string | null
          store_id?: string | null
          taxa_entrega?: number | null
          telefone?: string | null
          tempo_entrega?: string | null
          total_mesas?: number | null
          updated_at?: string | null
          wifi_bg?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_license: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_vencimento: string | null
          id: string
          nome_cliente: string
          plano: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          nome_cliente?: string
          plano?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_vencimento?: string | null
          id?: string
          nome_cliente?: string
          plano?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_license_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string | null
          id: string
          role_in_store: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role_in_store?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role_in_store?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tablets: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          mesa_id: string | null
          nome: string
          pin_code: string | null
          pin_id: string | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          mesa_id?: string | null
          nome: string
          pin_code?: string | null
          pin_id?: string | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          mesa_id?: string | null
          nome?: string
          pin_code?: string | null
          pin_id?: string | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tablets_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablets_pin_id_fkey"
            columns: ["pin_id"]
            isOneToOne: false
            referencedRelation: "module_pins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tablets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      can_manage_store_members: {
        Args: { _store_id: string }
        Returns: boolean
      }
      create_module_pin: {
        Args: {
          _label?: string
          _module: string
          _pin: string
          _store_id: string
        }
        Returns: string
      }
      get_store_by_cnpj: {
        Args: { _cnpj: string }
        Returns: {
          store_id: string
          store_name: string
        }[]
      }
      get_store_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_user_store_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      next_order_number: { Args: { _store_id: string }; Returns: number }
      rpc_get_operational_pedidos: {
        Args: { _store_id: string }
        Returns: {
          caixa_id: string
          caixa_nome: string
          cancelado: boolean
          cancelado_em: string
          cancelado_motivo: string
          cancelado_por: string
          cliente_nome: string
          criado_em: string
          criado_em_iso: string
          garcom_id: string
          garcom_nome: string
          id: string
          itens: Json
          mesa_id: string
          motoboy_nome: string
          numero_pedido: number
          observacao_geral: string
          origem: string
          para_viagem: boolean
          pronto: boolean
          status_balcao: string
          total: number
        }[]
      }
      rpc_get_preferencias: {
        Args: { _modulo: string; _store_id: string }
        Returns: {
          chave: string
          valor: string
        }[]
      }
      rpc_insert_evento: { Args: { _data: Json }; Returns: undefined }
      rpc_insert_fechamento: { Args: { _data: Json }; Returns: undefined }
      rpc_insert_motoboy_fechamento: {
        Args: { _data: Json }
        Returns: undefined
      }
      rpc_insert_movimentacao: { Args: { _data: Json }; Returns: undefined }
      rpc_insert_pedido: { Args: { _data: Json }; Returns: undefined }
      rpc_sync_bairros_delivery: {
        Args: { _bairros: Json; _store_id: string }
        Returns: undefined
      }
      rpc_update_fechamento: {
        Args: { _id: string; _store_id: string; _updates: Json }
        Returns: undefined
      }
      rpc_update_pedido: {
        Args: { _id: string; _store_id: string; _updates: Json }
        Returns: undefined
      }
      rpc_upsert_cliente_delivery: {
        Args: { _data: Json; _store_id: string }
        Returns: undefined
      }
      rpc_upsert_estado_caixa: {
        Args: { _data: Json; _store_id: string }
        Returns: undefined
      }
      rpc_upsert_estado_mesa: { Args: { _data: Json }; Returns: undefined }
      rpc_upsert_preferencia: {
        Args: {
          _chave: string
          _modulo: string
          _store_id: string
          _valor: string
        }
        Returns: undefined
      }
      search_stores: {
        Args: { query: string }
        Returns: {
          name: string
          slug: string
        }[]
      }
      verify_pin: {
        Args: { input_pin: string; stored_hash: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "admin"
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
      app_role: ["master", "admin"],
    },
  },
} as const
