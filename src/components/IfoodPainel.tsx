import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw, ShoppingBag, Clock, MapPin, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IfoodPedido {
  id: string;
  numero_pedido: number;
  cliente_nome: string;
  cliente_telefone: string;
  endereco_completo: string;
  bairro: string;
  total: number;
  itens: any[];
  criado_em: string;
  criado_em_iso: string;
  forma_pagamento_delivery: string;
  observacao_geral: string;
  status_balcao: string;
}

export default function IfoodPainel() {
  const { storeId } = useStore();
  const [pedidos, setPedidos] = useState<IfoodPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchPedidos = useCallback(async () => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*")
        .eq("store_id", storeId)
        .eq("origem", "ifood")
        .eq("cancelado", false)
        .in("status_balcao", ["pendente_ifood", "aberto", "preparando"])
        .order("criado_em_iso", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((p: any) => ({
        ...p,
        itens: typeof p.itens === "string" ? JSON.parse(p.itens) : p.itens || [],
      }));
      setPedidos(mapped);
    } catch (err) {
      console.error("[IfoodPainel] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 5000);
    return () => clearInterval(interval);
  }, [fetchPedidos]);

  // Realtime subscription
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel("ifood-pedidos")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pedidos",
          filter: `store_id=eq.${storeId}`,
        },
        () => fetchPedidos()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId, fetchPedidos]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/ifood-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ store_id: storeId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao sincronizar");

      toast.success(
        `Sincronizado! ${data.orders_inserted || 0} novo(s) pedido(s)`
      );
      fetchPedidos();
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar com iFood");
    } finally {
      setSyncing(false);
    }
  };

  const handleAceitar = async (pedidoId: string) => {
    try {
      await supabase.rpc("rpc_update_pedido" as any, {
        _id: pedidoId,
        _store_id: storeId,
        _updates: { status_balcao: "aberto" },
      });
      toast.success("Pedido aceito! Enviado para a cozinha.");
      fetchPedidos();
    } catch (err) {
      toast.error("Erro ao aceitar pedido");
    }
  };

  const handleRejeitar = async (pedidoId: string) => {
    try {
      await supabase.rpc("rpc_update_pedido" as any, {
        _id: pedidoId,
        _store_id: storeId,
        _updates: {
          cancelado: true,
          cancelado_em: new Date().toISOString(),
          cancelado_motivo: "Rejeitado pelo restaurante",
          cancelado_por: "gerente",
          status_balcao: "cancelado",
        },
      });
      toast.success("Pedido rejeitado.");
      fetchPedidos();
    } catch (err) {
      toast.error("Erro ao rejeitar pedido");
    }
  };

  const pendentes = pedidos.filter((p) => p.status_balcao === "pendente_ifood");
  const aceitos = pedidos.filter((p) => p.status_balcao !== "pendente_ifood");

  const formatPayment = (p: string) => {
    const map: Record<string, string> = {
      ifood_online: "iFood Online",
      dinheiro: "Dinheiro",
      credito: "Crédito",
      debito: "Débito",
      pix: "PIX",
    };
    return map[p] || p || "iFood Online";
  };

  const minutesAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(diff / 60_000));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-lg font-bold">iFood</h2>
          {pendentes.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendentes.length} pendente{pendentes.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-orange-600">⏳ Aguardando aprovação</p>
          {pendentes.map((p) => (
            <div
              key={p.id}
              className="border-2 border-orange-400 bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">#{p.numero_pedido}</span>
                  <Badge className="bg-red-500 text-white text-[10px]">iFood</Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {minutesAgo(p.criado_em_iso)} min atrás
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{p.cliente_nome}</span>
                </div>
                {p.endereco_completo && (
                  <div className="flex items-start gap-1">
                    <MapPin className="h-3 w-3 mt-0.5" />
                    <span className="text-xs text-muted-foreground">
                      {p.endereco_completo}
                    </span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="bg-background/60 rounded-lg p-2 space-y-1">
                {(Array.isArray(p.itens) ? p.itens : []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {item.quantidade}x {item.nome}
                    </span>
                    <span className="font-medium">
                      R$ {(item.preco * (item.quantidade || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatPayment(p.forma_pagamento_delivery)}
                </span>
                <span className="font-bold text-lg">
                  R$ {Number(p.total).toFixed(2)}
                </span>
              </div>

              {p.observacao_geral && (
                <p className="text-xs bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded text-yellow-800 dark:text-yellow-200">
                  📝 {p.observacao_geral}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAceitar(p.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aceitar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleRejeitar(p.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aceitos em andamento */}
      {aceitos.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-green-600">✅ Aceitos / Em preparo</p>
          {aceitos.map((p) => (
            <div
              key={p.id}
              className="border rounded-lg p-3 bg-green-50/50 dark:bg-green-950/10 space-y-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">#{p.numero_pedido}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {p.status_balcao}
                  </Badge>
                </div>
                <span className="font-semibold">
                  R$ {Number(p.total).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {p.cliente_nome} • {(Array.isArray(p.itens) ? p.itens : []).length} item(ns)
              </p>
            </div>
          ))}
        </div>
      )}

      {pedidos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum pedido iFood no momento</p>
          <p className="text-xs mt-1">Clique em "Sincronizar" para buscar novos pedidos</p>
        </div>
      )}
    </div>
  );
}
