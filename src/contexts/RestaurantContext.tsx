import React, { createContext, useContext, useState, useCallback } from "react";

export interface ItemCarrinho {
  uid: string;
  produtoId: string;
  nome: string;
  precoBase: number;
  quantidade: number;
  removidos: string[];
  adicionais: { nome: string; preco: number }[];
  bebida?: string | null;
  observacoes?: string;
  precoUnitario: number;
}

export interface PedidoRealizado {
  id: string;
  numeroPedido: number;
  itens: ItemCarrinho[];
  total: number;
  criadoEm: string;
}

export interface Mesa {
  id: string;
  numero: number;
  status: "livre" | "pendente" | "consumo";
  total: number;
  carrinho: ItemCarrinho[];
  pedidos: PedidoRealizado[];
  chamarGarcom: boolean;
  chamadoEm: number | null;
}

function derivarStatus(m: Pick<Mesa, "carrinho" | "pedidos">): Mesa["status"] {
  if (m.pedidos.length > 0) return "consumo";
  if (m.carrinho.length > 0) return "pendente";
  return "livre";
}

interface RestaurantContextType {
  mesas: Mesa[];
  getMesa: (id: string) => Mesa | undefined;
  updateMesa: (id: string, updates: Partial<Mesa>) => void;
  addToCart: (mesaId: string, item: ItemCarrinho) => void;
  updateCartItemQty: (mesaId: string, uid: string, delta: number) => void;
  removeFromCart: (mesaId: string, uid: string) => void;
  confirmarPedido: (mesaId: string) => void;
  chamarGarcom: (mesaId: string) => void;
  dismissChamarGarcom: (mesaId: string) => void;
  fecharConta: (mesaId: string) => void;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

const criarMesasIniciais = (): Mesa[] =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `mesa-${i + 1}`,
    numero: i + 1,
    status: "livre" as const,
    total: 0,
    carrinho: [],
    pedidos: [],
    chamarGarcom: false,
    chamadoEm: null,
  }));

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mesas, setMesas] = useState<Mesa[]>(criarMesasIniciais);

  const getMesa = useCallback(
    (id: string) => mesas.find((m) => m.id === id),
    [mesas]
  );

  const updateMesa = useCallback((id: string, updates: Partial<Mesa>) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        updated.status = derivarStatus(updated);
        return updated;
      })
    );
  }, []);

  const addToCart = useCallback((mesaId: string, item: ItemCarrinho) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId) return m;
        const updated = { ...m, carrinho: [...m.carrinho, item] };
        updated.status = derivarStatus(updated);
        return updated;
      })
    );
  }, []);

  const updateCartItemQty = useCallback((mesaId: string, uid: string, delta: number) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId) return m;
        const newQty = (m.carrinho.find((i) => i.uid === uid)?.quantidade ?? 1) + delta;
        if (newQty < 1) {
          const updated = { ...m, carrinho: m.carrinho.filter((i) => i.uid !== uid) };
          updated.status = derivarStatus(updated);
          return updated;
        }
        const carrinho = m.carrinho.map((item) =>
          item.uid === uid ? { ...item, quantidade: newQty } : item
        );
        const updated = { ...m, carrinho };
        updated.status = derivarStatus(updated);
        return updated;
      })
    );
  }, []);

  const removeFromCart = useCallback((mesaId: string, uid: string) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId) return m;
        const updated = { ...m, carrinho: m.carrinho.filter((item) => item.uid !== uid) };
        updated.status = derivarStatus(updated);
        return updated;
      })
    );
  }, []);

  const confirmarPedido = useCallback((mesaId: string) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId || m.carrinho.length === 0) return m;

        const totalPedido = m.carrinho.reduce(
          (acc, item) => acc + item.precoUnitario * item.quantidade,
          0
        );

        const snapshot: ItemCarrinho[] = m.carrinho.map((item) => ({
          ...item,
          removidos: [...item.removidos],
          adicionais: item.adicionais.map((a) => ({ ...a })),
        }));

        const novoPedido: PedidoRealizado = {
          id: `pedido-${Date.now()}`,
          numeroPedido: m.pedidos.length + 1,
          itens: snapshot,
          total: totalPedido,
          criadoEm: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        return {
          ...m,
          carrinho: [],
          pedidos: [...m.pedidos, novoPedido],
          total: m.total + totalPedido,
          status: "consumo" as const,
        };
      })
    );
  }, []);

  const chamarGarcomFn = useCallback((mesaId: string) => {
    const chamadoEm = Date.now();

    setMesas((prev) =>
      prev.map((m) => (m.id === mesaId ? { ...m, chamarGarcom: true, chamadoEm } : m))
    );
  }, []);

  const dismissChamarGarcom = useCallback((mesaId: string) => {
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId ? { ...m, chamarGarcom: false, chamadoEm: null } : m
      )
    );
  }, []);

  const fecharConta = useCallback((mesaId: string) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId) return m;
        return {
          ...m,
          carrinho: [],
          pedidos: [],
          total: 0,
          chamarGarcom: false,
          chamadoEm: null,
          status: "livre" as const,
        };
      })
    );
  }, []);

  return (
    <RestaurantContext.Provider
      value={{
        mesas,
        getMesa,
        updateMesa,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        confirmarPedido,
        chamarGarcom: chamarGarcomFn,
        dismissChamarGarcom,
        fecharConta,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = (): RestaurantContextType => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
};
