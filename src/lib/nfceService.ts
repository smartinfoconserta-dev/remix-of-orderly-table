/**
 * NFC-e emission service — calls the emit-nfce edge function.
 * Non-blocking: failures show a warning toast but don't block the closing flow.
 */
import { supabase } from "@/integrations/supabase/client";
import { getSistemaConfig } from "@/lib/adminStorage";
import { toast } from "sonner";
import type { FechamentoConta } from "@/types/restaurant";

export async function emitNfceForFechamento(fechamento: FechamentoConta, storeId: string | null) {
  if (!storeId) return;

  const cfg = getSistemaConfig();
  const nfce = cfg.nfceConfig;
  if (!nfce?.token || !nfce?.ambiente) return; // not configured, skip silently

  const items = (fechamento.itens || []).map((item) => ({
    descricao: item.nome,
    quantidade: item.quantidade,
    valor_unitario: item.precoUnitario,
  }));

  if (items.length === 0) return;

  try {
    const { data, error } = await supabase.functions.invoke("emit-nfce", {
      body: {
        store_id: storeId,
        fechamento_id: fechamento.id,
        items,
        payment_method: fechamento.formaPagamento,
        total: fechamento.total,
        cpf: fechamento.cpfNota || undefined,
      },
    });

    if (error) {
      console.warn("NFC-e emission failed:", error);
      toast.warning("Nota fiscal não emitida — verifique a configuração fiscal", { duration: 5000 });
      return;
    }

    if (data?.success) {
      const msg = data.numero
        ? `NFC-e #${data.numero} emitida com sucesso`
        : "NFC-e enviada para processamento";
      toast.success(msg, { duration: 4000 });
      return data;
    }

    console.warn("NFC-e error:", data?.error);
    toast.warning("Nota fiscal não emitida — verifique a configuração fiscal", { duration: 5000 });
  } catch (err) {
    console.warn("NFC-e emission error:", err);
    toast.warning("Nota fiscal não emitida — verifique a configuração fiscal", { duration: 5000 });
  }
}
