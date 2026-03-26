

## Plano: Renomear /cliente para /tablet + Cadastro de Tablets no Admin

### Contexto
- A rota `/cliente` na verdade serve tablets de mesa, mas o nome confunde
- Hoje o admin cria PINs do módulo "cliente" manualmente na aba PINs, sem gestao dedicada
- O vínculo tablet↔mesa é feito pelo label do PIN (ex: "Mesa 05") de forma manual e frágil

### O que será feito

**1. Renomear rota e arquivos**

| De | Para |
|---|---|
| `/cliente` (rota) | `/tablet` |
| `ClientePage.tsx` | `TabletPage.tsx` |
| `MesaPage.tsx` redirect | Atualizar para `/tablet?mesa=ID` |
| Módulo `"cliente"` nos PINs | Manter como `"cliente"` internamente (evita migration), mas exibir como "Tablet" no UI |

**2. Nova aba "Tablets" no Admin**

Adicionar `{ id: "tablets", label: "Tablets", icon: TabletSmartphone }` ao `sidebarSections`, entre "Mesas" e "PINs".

**3. Conteudo da aba Tablets (CRUD)**

Nova tabela `tablets` no Supabase:
- `id` (uuid, PK)
- `store_id` (uuid, NOT NULL)
- `nome` (text, NOT NULL) -- ex: "Tablet Mesa 05", "Tablet VIP"
- `mesa_id` (uuid, nullable, FK para mesas)
- `pin_id` (uuid, nullable, FK para module_pins) -- PIN associado
- `ativo` (boolean, default true)
- `created_at`, `updated_at`

RLS: leitura publica, escrita para store members e masters.

A tela mostrara:
- **Lista de tablets cadastrados**: nome, mesa vinculada (numero), PIN ativo (sim/nao), status
- **Botao "Novo Tablet"**: modal com nome, selecao de mesa (dropdown das mesas da loja), e gera PIN de 4 digitos automaticamente (salva em `module_pins` com module="cliente" e label=nome do tablet, e vincula o `pin_id` no registro do tablet)
- **Editar**: alterar nome, trocar mesa vinculada
- **Excluir**: desativa o PIN associado e remove o registro

**4. Fluxo simplificado no tablet**

Na `TabletPage.tsx`, ao fazer login com PIN de modulo "cliente":
- O sistema busca na tabela `tablets` qual registro tem aquele `pin_id`
- Se encontrar e tiver `mesa_id`, vincula automaticamente a mesa (sem tela de selecao)
- Se nao tiver mesa vinculada, mostra a tela de selecao de mesa (fluxo atual)

**5. Arquivos alterados**

| Arquivo | Mudanca |
|---|---|
| `supabase/migrations/` | Nova migration: tabela `tablets` + RLS |
| `src/App.tsx` | Rota `/tablet` no lugar de `/cliente`, manter `/cliente` como redirect |
| `src/pages/ClientePage.tsx` | Renomear para `TabletPage.tsx`, ajustar logica de auto-vinculo |
| `src/pages/MesaPage.tsx` | Redirect para `/tablet?mesa=ID` |
| `src/pages/AdminPage.tsx` | Nova aba "tablets" na sidebar + componente de CRUD |
| `src/components/TabletsManager.tsx` | Novo componente com CRUD completo |
| `src/components/StorePinsManager.tsx` | Label "Tablet Cliente" → "Tablet" (cosmético) |

