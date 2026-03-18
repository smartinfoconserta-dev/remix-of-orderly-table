
Status atual

O último pedido ficou parcialmente concluído, mas não finalizado por completo. Pelo código atual, já existem estas partes prontas:
- trava de 2 segundos contra envio duplicado no fluxo de pedido
- confirmação inline antes de enviar
- destaque visual de itens pendentes no carrinho
- reset parcial após sucesso via `handleSuccessAcknowledge`
- bloqueio básico da rota `/cliente` com interceptação de `popstate`
- vínculo fixo da mesa no tablet via `localStorage`
- histórico do caixa já mostra horário do pedido enviado

O que ainda falta para fechar o escopo profissional solicitado:
- confirmação final com texto exato “Pedido enviado com sucesso” e botão “OK”
- só finalizar o fluxo após clique em OK, sem auto-fechar em 1 segundo
- garantir fechamento de qualquer modal/drawer e retorno estável para a Home do cardápio
- centralizar a chave de vínculo da mesa para uso também no Caixa/Gerente
- criar no Caixa uma ação protegida por PIN de gerente para desvincular e/ou trocar a mesa do tablet
- reforçar o bloqueio do modo cliente para impedir saída acidental do sistema sem afetar o modo garçom

Plano de implementação

1. Centralizar o vínculo fixo do tablet
- Extrair a chave `obsidian-cliente-mesa-fixa` e helpers para um módulo compartilhado, para evitar divergência entre Cliente e Caixa.
- Manter o modo cliente sempre lendo a mesa vinculada desse helper.
- Permitir no Caixa/Gerente:
  - desvincular a mesa atual do tablet
  - redefinir o vínculo para outra mesa
- Essas ações devem ficar disponíveis só para gerente e exigir validação com nome + PIN.

2. Fechar o bloqueio do modo cliente
- Manter o cliente preso à rota `/cliente`.
- Continuar sem botão de voltar interno no cabeçalho.
- Garantir que o cliente não tenha logout nem troca de mesa visíveis.
- Reforçar a interceptação de navegação para evitar saída acidental por histórico do navegador, sem recarregar a app e sem perder estado.

3. Ajustar o fluxo final de pedido para os dois modos
- Atualizar `CartDrawer` para substituir o sucesso automático por um estado de confirmação final com:
  - mensagem “Pedido enviado com sucesso”
  - botão “OK”
- Ao clicar em OK:
  - fechar drawer do carrinho
  - fechar modal de produto, se estiver aberto
  - fechar “Minha Conta”, se estiver aberta
  - limpar qualquer seleção visual remanescente
  - voltar para a Home do cardápio dentro do `PedidoFlow`
  - resetar scroll/top para estado inicial
- Aplicar exatamente o mesmo comportamento em cliente e garçom, usando o mesmo `PedidoFlow`.

4. Consolidar prevenção de erros
- Manter a trava atual de 2 segundos em `PedidoFlow` como proteção lógica.
- Manter o lock visual em `CartDrawer` como proteção de interface.
- Revisar a coordenação entre os dois locks para não haver dupla lógica inconsistente.
- Garantir que, se a confirmação falhar, a UI volte ao estado revisável sem tela preta e sem travar o drawer.

5. Adicionar operação administrativa no Caixa
- Na tela do Gerente/Caixa, incluir um card/ação discreta na área de mesas para “Tablet da mesa”.
- Fluxos:
  - desvincular tablet
  - trocar vínculo para outra mesa
- Exigir PIN do gerente e registrar evento operacional para auditoria.
- Não expor isso para o perfil Caixa comum.

Arquivos mais prováveis de ajuste
- `src/components/CartDrawer.tsx`
- `src/components/PedidoFlow.tsx`
- `src/pages/ClientePage.tsx`
- `src/pages/CaixaPage.tsx`
- possivelmente novo util compartilhado para chave/helpers do tablet
- opcionalmente `src/contexts/RestaurantContext.tsx` para log operacional do vínculo/desvínculo

Detalhes técnicos
- Hoje o `CartDrawer` ainda usa sucesso temporizado de 1s e fecha sozinho; isso precisa virar confirmação explícita com botão OK.
- O reset visual já existe parcialmente em `handleSuccessAcknowledge`, então o ideal é reutilizar essa função como destino final do botão OK, em vez de criar uma segunda lógica paralela.
- O cliente já persiste a mesa via `localStorage`, mas o Caixa ainda não controla esse vínculo; por isso a ação de gerente precisa compartilhar a mesma chave e não duplicar regra.
- O retorno para “home” deve significar aba `Início` do próprio cardápio, não a rota `/`.
- O fluxo do garçom deve permanecer idêntico ao do cliente no pós-envio, mudando apenas o contexto da operação.

Checklist de validação
- Cliente: enviar pedido, ver “Pedido enviado com sucesso”, tocar OK, voltar para Início sem perder estabilidade
- Garçom: repetir o mesmo fluxo e confirmar comportamento idêntico
- Cliente: tentar voltar pelo navegador e confirmar permanência em `/cliente`
- Cliente: confirmar ausência de logout e troca de mesa
- Gerente: desvincular tablet com PIN válido
- Gerente: trocar vínculo do tablet para outra mesa com PIN válido
- Caixa comum: confirmar que não vê nem executa essas ações
- Confirmar que não há envio duplicado mesmo com cliques rápidos

Resultado esperado
- tablet cliente realmente fixo e seguro
- mesa vinculada controlada apenas pelo gerente no Caixa
- pós-envio consistente, estável e profissional
- mesmo fluxo operacional para cliente e garçom
- menos erro humano e menos risco de travamento visual
