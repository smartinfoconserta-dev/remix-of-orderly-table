

# Plano: Gerar Exportação Complementar Completa

## Resumo

Executar um script Python que gera `/mnt/documents/exportacao_complementar_pdv.md` contendo:

1. **Edge Functions** — Codigo-fonte completo das 5 funções (create-admin-account, create-team-member, update-admin-account, emit-nfce, ifood-sync) + codigo do whatsappNotify.ts (client-side)
2. **RPCs** — SQL completo de todas as 27 funções com CREATE OR REPLACE FUNCTION
3. **Seed** — Codigo completo do seedMenu.ts + equivalente em INSERT SQL
4. **Secrets** — Lista dos 9 nomes de secrets configurados
5. **Assets** — Lista dos 12 arquivos em src/assets/ + 14 presets de tema com cores hex
6. **RLS Policies** — Todas as policies por tabela (já extraídas do banco)

## Sobre screenshots

Os screenshots dos módulos já foram gerados na execução anterior e estão em `/mnt/documents/screenshots/`. O documento referenciará esses arquivos.

## Execução

Um único `code--exec` com script Python escrevendo o Markdown completo. Nenhuma alteração no código do projeto.

