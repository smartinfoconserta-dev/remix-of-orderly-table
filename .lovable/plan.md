

## Plano: Toggle de estilo da logo (quadrada vs circular) no Admin + exibição no cliente

### O que será feito

1. **Admin (`adminStorage.ts`)**: Adicionar campo `logoEstilo?: "quadrada" | "circular"` na interface `SistemaConfig` com default `"quadrada"`.

2. **Admin (`AdminPage.tsx`)**: Na sub-seção Identidade Visual, adicionar um seletor visual (dois botões lado a lado) para escolher entre "Quadrada" e "Circular", logo abaixo do upload da logo.

3. **Cliente (`PedidoFlow.tsx`)**: 
   - Corrigir o bug da logo: usar `sysConfig.logoBase64 || sysConfig.logoUrl` (já identificado antes).
   - Ler `logoEstilo` do config e aplicar:
     - **Quadrada**: `rounded-xl` (como está hoje, acompanha o design dos chips de categoria)
     - **Circular**: `rounded-full` (logo dentro de um círculo)
   - Aplicar nos 2 locais onde a logo aparece (modo delivery e modo padrão).

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/lib/adminStorage.ts` | +1 campo `logoEstilo` na interface + default |
| `src/pages/AdminPage.tsx` | Seletor quadrada/circular na Identidade Visual |
| `src/components/PedidoFlow.tsx` | Fix logoBase64 + aplicar `rounded-xl` ou `rounded-full` conforme config |

### Resultado esperado
- Admin → Identidade Visual → botão toggle "Quadrada / Circular"
- Cliente vê a logo no formato escolhido
- Default: quadrada (comportamento atual mantido)

