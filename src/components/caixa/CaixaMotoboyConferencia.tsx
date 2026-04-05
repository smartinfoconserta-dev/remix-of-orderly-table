/**
 * CaixaMotoboyConferencia — extracted from CaixaPage lines ~4241-4355.
 * Modal for motoboy delivery closing conference.
 * NO logic changes from original.
 */
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, isNetworkError } from "@/lib/offlineQueue";

interface CaixaMotoboyConferenciaProps {
  fechamentoSelecionado: any | null;
  setFechamentoSelecionado: (v: any | null) => void;
  pinConferencia: string;
  setPinConferencia: (v: string) => void;
  pinConferenciaErro: string;
  setPinConferenciaErro: (v: string) => void;
  verifyManagerAccess: (nome: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  currentOperator: { nome: string; [key: string]: any };
  registrarFechamentoMotoboy: (data: any) => Promise<void>;
  setFechamentosPendentes: React.Dispatch<React.SetStateAction<any[]>>;
}

const CaixaMotoboyConferencia = ({
  fechamentoSelecionado, setFechamentoSelecionado,
  pinConferencia, setPinConferencia,
  pinConferenciaErro, setPinConferenciaErro,
  verifyManagerAccess, currentOperator,
  registrarFechamentoMotoboy, setFechamentosPendentes,
}: CaixaMotoboyConferenciaProps) => {
  if (!fechamentoSelecionado) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-border bg-secondary/50">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conferência de fechamento</p>
          <p className="text-xl font-black text-foreground mt-1">🏍️ {fechamentoSelecionado.motoboy_nome}</p>
          <p className="text-xs text-muted-foreground">
            {fechamentoSelecionado.resumo?.totalEntregas ?? 0} entregas · {new Date(fechamentoSelecionado.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          <div className="rounded-xl bg-secondary/60 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">💵 Dinheiro físico</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recebido dos clientes</span>
              <span className="font-bold tabular-nums">R$ {fechamentoSelecionado.resumo.dinheiroRecebido.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Troco devolvido</span>
              <span className="font-bold tabular-nums text-destructive">- R$ {fechamentoSelecionado.resumo.trocoTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border/50 pt-2">
              <span className="font-bold">Líquido dinheiro</span>
              <span className="font-black tabular-nums">R$ {fechamentoSelecionado.resumo.liquidoDinheiro.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">+ Fundo de troco inicial</span>
              <span className="font-bold tabular-nums">R$ {fechamentoSelecionado.resumo.fundoTroco.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border/50 pt-2">
              <span className="font-black text-amber-400">Deve entregar em dinheiro</span>
              <span className="font-black tabular-nums text-amber-400 text-base">R$ {fechamentoSelecionado.resumo.deveDevolver.toFixed(2)}</span>
            </div>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">📱 Pagamentos digitais</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PIX</span>
              <span className="font-bold tabular-nums text-emerald-400">R$ {fechamentoSelecionado.resumo.pix.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cartão de crédito</span>
              <span className="font-bold tabular-nums text-blue-400">R$ {fechamentoSelecionado.resumo.credito.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cartão de débito</span>
              <span className="font-bold tabular-nums text-blue-400">R$ {fechamentoSelecionado.resumo.debito.toFixed(2)}</span>
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/8 p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total geral a prestar</p>
                <p className="text-xs text-muted-foreground mt-0.5">Dinheiro + confirmação dos digitais</p>
              </div>
              <span className="text-2xl font-black tabular-nums text-primary">R$ {fechamentoSelecionado.resumo.totalAPrestar.toFixed(2)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground">PIN do gerente para confirmar:</p>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pinConferencia}
              onChange={e => { setPinConferencia(e.target.value.replace(/\D/g, "").slice(0, 6)); setPinConferenciaErro(""); }}
              className="text-center text-xl font-black h-12 rounded-xl tracking-widest"
            />
            {pinConferenciaErro && <p className="text-xs text-destructive font-bold text-center">{pinConferenciaErro}</p>}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold"
            onClick={() => { setFechamentoSelecionado(null); setPinConferencia(""); setPinConferenciaErro(""); }}>
            Cancelar
          </Button>
          <Button className="flex-1 h-11 rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={async () => {
              if (pinConferencia.length < 4) { setPinConferenciaErro("PIN inválido"); return; }
              const nomeGerente = currentOperator?.nome || "";
              const result = await verifyManagerAccess(nomeGerente, pinConferencia);
              if (!result.ok) { setPinConferenciaErro("PIN incorreto ou sem permissão"); return; }

              const f = fechamentoSelecionado;
              registrarFechamentoMotoboy({
                motoboyNome: f.motoboy_nome,
                motoboyId: f.motoboy_id,
                dinheiro: f.resumo.dinheiroRecebido,
                troco: f.resumo.trocoTotal,
                fundoTroco: f.resumo.fundoTroco,
                pix: f.resumo.pix,
                credito: f.resumo.credito,
                debito: f.resumo.debito,
                totalEntregas: f.resumo.totalEntregas,
                pedidosIds: f.pedidos_ids || [],
                conferidoPor: nomeGerente,
              });

              const updateData = { status: "conferido", conferido_por: nomeGerente, conferido_em: new Date().toISOString() };
              supabase.from("motoboy_fechamentos").update(updateData).eq("id", f.id)
                .then(({ error }) => {
                  if (error) {
                    if (isNetworkError(error)) {
                      enqueue("rpc_insert_motoboy_fechamento", { _data: { ...f, ...updateData } }, `Conferência motoboy ${f.motoboy_nome}`);
                      toast.warning("Sem conexão — conferência salva localmente.");
                    } else {
                      console.error("Erro ao atualizar fechamento motoboy", error);
                      toast.error("Erro ao conferir fechamento");
                    }
                  }
                });
              setFechamentosPendentes(prev => prev.filter((item: any) => item.id !== f.id));

              setFechamentoSelecionado(null);
              setPinConferencia("");
              toast.success(`Fechamento de ${f.motoboy_nome} conferido! ✓`, { duration: 3000 });
            }}>
            ✓ Confirmar fechamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CaixaMotoboyConferencia;
