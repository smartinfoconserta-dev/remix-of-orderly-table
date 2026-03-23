

## Plano: Trocar banner por tela completa de fechado (como imagem 29)

### O que será feito

Remover o banner horizontal (imagem 28) e restaurar a tela de bloqueio completa quando fora do horário, com o visual elegante da imagem 29.

**Arquivo: `src/pages/PedidoPage.tsx`**

1. **Remover o `bannerFechado`** — Deletar o bloco das linhas 362-374 e suas referências nas linhas 380 e 393.

2. **Adicionar early return com tela completa** — Logo após `const statusHorario = isDeliveryAberto()` (linha 360), adicionar:
   ```tsx
   if (!statusHorario.aberto) {
     return (
       <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-6">
         {/* Logo */}
         {RESTAURANTE_LOGO ? (
           <img src={RESTAURANTE_LOGO} alt={RESTAURANTE_NOME}
             className="w-20 h-20 rounded-2xl object-cover border border-border" />
         ) : (
           <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center text-2xl font-black">
             {RESTAURANTE_INITIALS}
           </div>
         )}
         {/* Nome + mensagem */}
         <div className="space-y-2">
           <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{RESTAURANTE_NOME}</p>
           <h1 className="text-3xl font-black">{statusHorario.mensagem}</h1>
           <p className="text-sm text-muted-foreground">{statusHorario.proximoHorario}</p>
         </div>
         {/* Card horário do dia (abertura — fechamento + "Em aproximadamente Xh") */}
         {statusHorario.horasRestantes > 0 && (
           <div className="rounded-2xl border border-border bg-card px-8 py-5 space-y-1">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Horário de hoje</p>
             <p className="text-2xl font-black">{horarioDiaTexto}</p>
             <p className="text-xs text-primary font-bold">Em aproximadamente {statusHorario.horasRestantes}h</p>
           </div>
         )}
         {/* WhatsApp */}
         {sysConfig.telefoneRestaurante && (
           <button onClick={() => window.open(`https://wa.me/55${sysConfig.telefoneRestaurante}`, "_blank")}
             className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-6 py-3.5 text-white font-black">
             Falar no WhatsApp
           </button>
         )}
       </div>
     );
   }
   ```

3. **Obter horário do dia para o card** — Extrair abertura/fechamento do dia atual para mostrar "18:00 — 23:00":
   ```tsx
   const horarios = getHorariosFuncionamento();
   const diaAtual = ["dom","seg","ter","qua","qui","sex","sab"][new Date().getDay()];
   const horarioDia = horarios[diaAtual];
   const horarioDiaTexto = horarioDia.ativo ? `${horarioDia.abertura} — ${horarioDia.fechamento}` : "";
   ```

4. **Manter bloqueio no envio** — Os checks em `handleConfirmarPedido` e `handlePedidoConfirmado` continuam como segurança extra.

### Resultado
- Fora do horário → tela completa com logo, nome, mensagem, card de horário com "Em aproximadamente Xh", botão WhatsApp
- Sem banner horizontal
- Cardápio não aparece quando fechado

