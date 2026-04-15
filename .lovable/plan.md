

# Plano: Gerar Relatório Técnico Completo do PDV

## Resumo

Gerar um único arquivo Markdown em `/mnt/documents/relatorio_completo_pdv.md` contendo documentação técnica exaustiva do projeto "Orderly Table" — cobrindo todas as 36 seções solicitadas, sem resumir.

## O que será feito

Executar um script Python que escreve o arquivo Markdown com todo o conteúdo baseado na análise completa do código-fonte e banco de dados. O script NÃO altera código do projeto.

## Conteúdo do relatório (todas as 36 seções)

### Multi-tenancy e acesso (seções 1-6)
- **stores**: 6 colunas documentadas, RLS policies listadas
- **user_roles**: enum `app_role` (master), RLS
- **store_members**: roles por loja (owner/admin/gerente/caixa/etc), RLS
- **module_pins**: hash bcrypt via `create_module_pin`, verificação via `verify_pin`, pin_plain armazenado
- **tablets/devices**: vinculação a mesa, DeviceGate, ativação
- **restaurant_license**: planos (basico/restaurante/fastfood/completo), vencimento

### Configuração (seção 7)
- **restaurant_config**: TODAS as 50+ colunas documentadas com status de uso na UI

### Cardápio (seções 8-9)
- **restaurant_categories**: parent_id (adicionado para subcategorias, NÃO usado na UI ainda)
- **produtos**: TODAS as colunas, JSONB de grupos/adicionais/ingredientes, estoque (campo existe mas NÃO funcional)

### Operação (seções 10-15)
- **mesas**, **pedidos**, **fechamentos**, **estado_caixa**, **movimentacoes_caixa**, **eventos_operacionais** — cada tabela com todas as colunas, JSONB formats, status possíveis

### Módulos (seções 16-25)
Para cada módulo: arquivo principal, linhas de código, fluxo de acesso, todas as telas, botões e ações com funções chamadas

### Integrações (seções 26-29)
- WhatsApp: wa.me deeplink (NÃO é API real)
- Impressão: window.print() no browser, comanda térmica
- NFC-e: Edge Function real chamando Focus NFe
- Pagamento: NENHUM gateway implementado

### Enums e constantes (seção 30)
Todos os valores exatos de status, origens, módulos, roles, formas de pagamento

### Bugs e features incompletas (seção 31)
Lista honesta de tudo que está quebrado ou pela metade

### Credenciais e RPCs (seções 32-35)
- .env completo
- Todas as 22 RPCs com código SQL completo
- Todas as RLS policies por tabela

### Versão (seção 36)
Estado atual e últimas alterações

## Limitações

- **ZIP do projeto**: o sandbox não permite criar ZIPs do repositório completo — instruções serão incluídas no relatório
- **Dump SQL**: requer acesso ao dashboard do Supabase — instruções incluídas
- **Service role key**: está configurada como secret no Supabase, acessível pelo dashboard

## Execução

Um único `code--exec` com script Python que escreve o Markdown completo em `/mnt/documents/relatorio_completo_pdv.md`.

