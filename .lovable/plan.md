

## Plano: Permitir navegar no cardápio fora do horário, bloquear apenas o envio

### Problema atual
Quando o delivery está fora do horário, a página inteira é substituída pela tela "Ainda não abrimos" (linha 351-368 de PedidoPage.tsx). O cliente não consegue nem ver o cardápio.

### Mudança

**Arquivo: `src/pages/PedidoPage.tsx`**

1. **Remover o bloqueio total da página** — Tirar o `if (!statusHorario.aberto) { return (...) }` que bloqueia tudo (linhas 350-369).

2. **Mover `statusHorario` para antes do render do cardápio** — Manter a variável disponível mas sem bloquear.

3. **Bloquear o envio do pedido** — Em `handleConfirmarPedido` (linha 301), adicionar verificação no início:
   ```tsx
   const statusAgora = isDeliveryAberto();
   if (!statusAgora.aberto) {
     toast.error(statusAgora.mensagem + (statusAgora.proximoHorario ? `. ${statusAgora.proximoHorario}` : ""));
     return;
   }
   ```

4. **Bloquear também em `handlePedidoConfirmado`** (quando sai do cardápio para identificação/confirmação):
   ```tsx
   const statusAgora = isDeliveryAberto();
   if (!statusAgora.aberto) {
     toast.error(`${statusAgora.mensagem}. ${statusAgora.proximoHorario || ""}`);
     return;
   }
   ```

5. **Adicionar banner informativo no topo do cardápio** quando fora do horário — Um aviso discreto (não bloqueante) no header ou acima do PedidoFlow:
   ```tsx
   {!statusHorario.aberto && etapa === "cardapio" && (
     <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-center">
       <p className="text-sm font-bold text-destructive">{statusHorario.mensagem}</p>
       <p className="text-xs text-muted-foreground">{statusHorario.proximoHorario}</p>
     </div>
   )}
   ```

### Resultado
- Cliente acessa `/pedido` → vê o cardápio normalmente, pode navegar
- Banner no topo avisa "Ainda não abrimos — Abrimos às 18:00 (em ~8h)"
- Ao tentar enviar o pedido → toast de erro com a mensagem de horário
- Quando dentro do horário → tudo funciona igual a hoje

