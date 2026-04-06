

## Bug Fix: Relatório do turno não fecha após fechar caixa

### Problema confirmado

No `handleCloseTurno` (CaixaPage.tsx, linha 979), após `fecharCaixaDoDia`, o modal de PIN é fechado (`setTurnoModalOpen(false)`) mas o relatório do turno permanece aberto porque falta `setTurnoReportOpen(false)`.

### Correção

**Arquivo: `src/pages/CaixaPage.tsx`** (linha ~979)
- Adicionar `setTurnoReportOpen(false)` junto com `setTurnoModalOpen(false)`

**Arquivo: `src/components/caixa/CaixaTurnoReport.tsx`**
- Adicionar `useEffect` de segurança: se `caixaAberto === false` e `turnoReportOpen === true`, chamar `setTurnoReportOpen(false)`. A prop `caixaAberto` já é recebida pelo componente mas não é utilizada — serve como fallback para garantir que o relatório nunca fique visível com o caixa fechado.

### Impacto
Duas linhas de código + um useEffect curto. Zero alteração de lógica de negócio.

