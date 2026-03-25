

## Plano: Página "Mesas" no Admin — CRUD completo + PIN de vínculo

### Situação atual
- Mesas são apenas um número (`total_mesas`) no `restaurant_config`, sem entidade individual
- Não existe tabela de mesas no banco — tudo é derivado de um contador
- O vínculo tablet↔mesa usa `localStorage` no dispositivo (`tabletBinding.ts`)
- QR Codes e config de mesas ficam dentro de "Configurações > Salão"

### O que será criado

**1. Nova tabela `mesas` no Supabase**

Colunas:
- `id` (uuid, PK)
- `store_id` (uuid, NOT NULL)
- `numero` (integer, NOT NULL)
- `nome` (text, nullable — apelido opcional como "VIP 1")
- `status` (text, default "livre") — livre, ocupada, reservada, inativa
- `capacidade` (integer, nullable — lugares)
- `created_at`, `updated_at`
- Unique constraint em `(store_id, numero)`

RLS: leitura pública, escrita para store members e masters.

**2. Nova aba "Mesas" na sidebar do Admin**

Adicionar `{ id: "mesas", label: "Mesas", icon: Grid3X3 }` ao array `sidebarSections` entre "Cardápio" e "PINs".

**3. Conteúdo da aba Mesas**

- **Barra superior**: botão "Nova Mesa" + contador total
- **Lista/grid de mesas**: cada card mostra número, nome (se houver), status (badge colorido), capacidade
- **Ações por mesa**: Editar (modal com nome, capacidade, status), Excluir (confirmação)
- **Criar mesa**: modal com número (auto-incrementa), nome opcional, capacidade
- **Criar em lote**: botão "Criar 10 mesas" para setup inicial rápido
- **QR Codes**: mantém geração de QR por mesa (move da seção Salão para cá)

**4. PIN de vínculo de mesa (para tablet do cliente)**

- Na lista de mesas, cada mesa terá um botão "Gerar PIN" que cria um PIN temporário de 4 dígitos
- Esse PIN é salvo na tabela `module_pins` com `module = "cliente"` e `label = "Mesa XX"`
- No tablet (`/cliente`), após login com Código da Loja + PIN de Tablet Cliente, o sistema identifica qual mesa está vinculada pelo label do PIN
- Opção de "Revogar PIN" para desativar o PIN ativo daquela mesa

**5. Arquivos alterados**

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/` | Nova migration: tabela `mesas` + RLS |
| `src/pages/AdminPage.tsx` | Nova aba "mesas" na sidebar, novo bloco de renderização com CRUD |
| `src/contexts/RestaurantContext.tsx` | Fetch de mesas do Supabase para uso global |

**6. Remover seção "Salão" das Configurações**

O conteúdo atual (número de mesas + QR Codes) será absorvido pela nova aba Mesas. A seção "Salão" em Configurações será removida.

