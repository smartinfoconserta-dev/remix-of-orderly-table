

# Plano: Exportação Complementar — Edge Functions, RPCs, Seeds, Assets e Screenshots

## O que será gerado

Um único arquivo Markdown em `/mnt/documents/exportacao_complementar_pdv.md` contendo as 5 seções textuais, mais screenshots de cada módulo.

---

## Seção 1: Edge Functions (código completo)

Já tenho o código de todas as 5 Edge Functions. Serão incluídas na íntegra:

| Função | Arquivo | Linhas | Descrição |
|--------|---------|--------|-----------|
| `create-admin-account` | index.ts | 126 | Cria usuário Auth + store + membership + config + license |
| `create-team-member` | index.ts | 184 | Cria membro da equipe com PIN e sync motoboy |
| `update-admin-account` | index.ts | 92 | Atualiza email/senha (Master only) |
| `emit-nfce` | index.ts | 131 | Emissão NFC-e via Focus NFe API |
| `ifood-sync` | index.ts | 188 | Polling de pedidos iFood |

**WhatsApp**: NÃO existe Edge Function. O arquivo `whatsappNotify.ts` é client-side e apenas abre `wa.me` deeplinks.

## Seção 2: RPCs (SQL completo)

Todas as 27 RPCs já estão disponíveis no contexto. Serão listadas com `CREATE OR REPLACE FUNCTION` completo.

## Seção 3: Seed / Dados de Exemplo

O arquivo `src/scripts/seedMenu.ts` será incluído na íntegra (6 categorias, 20 produtos com adicionais, ingredientes removíveis, combos e promoções). Também será gerado o equivalente em INSERT SQL.

## Seção 4: Edge Functions Secrets

9 secrets configurados:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL`
- `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_MERCHANT_ID`
- `LOVABLE_API_KEY`

## Seção 5: Assets Visuais e Identidade

**Arquivos em `src/assets/`** (12 arquivos): banners temáticos Obsidian (combo, happy hour, Instagram, WiFi, avisos), backgrounds para cards Instagram/WiFi, QR codes premium (SVG + PNG).

**Paleta/Temas**: 14 presets documentados (Obsidian, Italiano, Sorveteria, Dark Roxo, Hamburgueria, Teal, Açaí, Pizzaria, Cafeteria, Japonês, Bar, Padaria, Churrascaria, Saudável) com cores hex completas.

**Tipografia**: System fonts (sem custom fonts). Headings e body usam font stack padrão do Tailwind.

## Seção 6: Screenshots dos Módulos

Navegarei pelo app usando as ferramentas de browser para capturar screenshots de cada módulo. Como requer login e dados no banco, capturarei o que for acessível:

1. Tela de Login
2. Admin (se logado)
3. Caixa (restaurante / fast food)
4. Totem
5. Cozinha (KDS)
6. TV de retirada
7. Garçom
8. Delivery

**Nota**: Módulos protegidos por PIN/login podem mostrar apenas a tela de acesso se não houver sessão ativa.

---

## Execução

1. Script Python gerando o `.md` com seções 1-5 completas
2. Navegação no browser para capturar screenshots dos módulos
3. Screenshots salvos em `/mnt/documents/screenshots/`

