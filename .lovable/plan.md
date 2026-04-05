
Objetivo: estabilizar todo o fluxo de fechamentos para que mesa/comanda/caixa não “voltem” após recarregar, não dupliquem no histórico e não entrem em loop no Caixa/Gerente.

1. Diagnóstico do que encontrei
- Fechamento de mesa e balcão está otimista demais: o app limpa a UI e mostra sucesso antes de o Supabase confirmar:
  - criação do fechamento
  - atualização dos pedidos para `status_balcao: "pago"`
  - reset da mesa em `estado_mesas`
- O fechamento do caixa sofre o mesmo problema: `fecharCaixaDoDia` muda estado local imediatamente, mas os chamadores tratam isso como assíncrono sem ele realmente esperar a persistência.
- O `RestaurantContext` ainda pode reintroduzir estado antigo:
  - o realtime de `estado_mesas` sobrescreve `mesa.pedidos` com snapshot da mesa
  - o polling de `pedidosBalcao` faz merge, mas não remove registros obsoletos
- O valor sugerido para próxima abertura está inflando porque o fechamento salva o dinheiro total contado na gaveta como `fundo_proximo`, em vez de tratar isso separadamente do fundo de troco.

2. Correção do fluxo de fechamento de mesa/comanda
- Tornar o fluxo de fechar conta realmente assíncrono.
- Em `useMesaActions.fecharConta`:
  - criar o fechamento
  - marcar todos os pedidos da mesa como `pago`
  - sincronizar a mesa zerada em `estado_mesas`
  - só depois atualizar o estado React, fechar a tela e mostrar toast de sucesso
- Se qualquer etapa crítica falhar, não limpar a tela nem liberar novo clique.
- Adicionar trava de processamento no botão “Confirmar fechamento” para impedir clique duplo e duplicação no histórico.

3. Correção do fluxo de fechamento de balcão/delivery/totem
- Aplicar a mesma lógica em `useBalcaoActions.fecharContaBalcao`:
  - persistir fechamento
  - marcar pedido como `pago`
  - só então remover da lista operacional
- Adicionar estado “processando” no detalhe do balcão para impedir múltiplos fechamentos do mesmo pedido.

4. Correção do fechamento do caixa/turno
- Transformar `fecharCaixaDoDia` em ação assíncrona real.
- Fazer `CaixaPage.handleCloseTurno` e `GerentePage.handleFecharDia` aguardarem esse fechamento antes de:
  - fechar modal
  - limpar campos
  - mostrar sucesso
- No fechamento do caixa:
  - persistir `estado_caixa` corretamente
  - zerar `estado_mesas`
  - impedir que pedidos de mesa ativos reconstruam mesas após reload
- Vou alinhar a fonte da verdade para pedidos de mesa: o que define se a mesa reabre será o status persistido dos pedidos, não o snapshot local da UI.

5. Correção da reidratação/reload no RestaurantContext
- Ajustar o realtime de `estado_mesas` para não reintroduzir `mesa.pedidos` antigos vindos do snapshot da mesa.
- Usar `pedidos` como fonte principal para comandas abertas e `estado_mesas` para carrinho/chamado/status visual.
- Corrigir o polling para substituir/remover itens obsoletos, em vez de só acrescentar/mesclar.
- Manter deduplicação forte por `id` em fechamentos e evitar reentrada local enquanto um fechamento estiver em andamento.

6. Correção do fundo de troco inflando
- Separar “dinheiro contado no fechamento” de “fundo sugerido para próxima abertura”.
- Parar de salvar automaticamente o total contado da gaveta como `fundo_proximo`.
- Manter como sugestão o fundo real do turno/anterior ou um valor dedicado para próxima abertura, sem somar vendas dentro do fundo de troco.

7. Arquivos que vou ajustar
- `src/services/dbHelpers.ts`
- `src/hooks/useMesaActions.ts`
- `src/hooks/useBalcaoActions.ts`
- `src/hooks/useCaixaActions.ts`
- `src/contexts/RestaurantContext.tsx`
- `src/pages/CaixaPage.tsx`
- `src/pages/GerentePage.tsx`
- `src/components/caixa/CaixaMesaDetail.tsx`
- `src/components/caixa/CaixaBalcaoDetail.tsx`
- possivelmente `src/components/caixa/CaixaTurnoReport.tsx`

8. Detalhes técnicos da implementação
- Padronizar helpers críticos para retornarem resultado aguardável (`ok/error`) em vez de fire-and-forget.
- Tratar fechamento financeiro como operação crítica: se não houver confirmação, não concluir visualmente.
- Adicionar guardas de idempotência/local lock para:
  - fechar conta da mesa
  - fechar conta balcão
  - fechar turno/caixa
- Revisar a ordem das operações para evitar race condition:
  - persistir
  - atualizar store
  - liberar UI

9. Validação que vou considerar concluída
- Fechar mesa, recarregar imediatamente e confirmar que ela permanece livre.
- Clicar várias vezes em “Confirmar fechamento” e gerar apenas 1 registro no histórico.
- Fechar balcão/delivery e recarregar sem reaparecer na operação.
- Fechar turno pelo Caixa e pelo Gerente sem loop nem reabertura.
- Reabrir próximo turno sem fundo de troco inflado.
- Conferir histórico/relatórios para garantir que cada fechamento aparece uma única vez.
