import React, { createContext, useContext, useState, useCallback } from "react";

export interface ItemCarrinho {
  uid: string; // unique per cart entry
  produtoId: string;
  nome: string;
  precoBase: number;
  quantidade: number;
  removidos: string[];
  adicionais: { nome: string; preco: number }[];
  precoUnitario: number; // base + adicionais
}

export interface PedidoRealizado {
  id: string;
  itens: ItemCarrinho[];
  total: number;
  horario: string;
}

export interface Mesa {
  id: string;
  numero: number;
  status: "livre" | "pendente" | "consumo";
  total: number;
  carrinho: ItemCarrinho[];
  pedidos: PedidoRealizado[];
}

interface RestaurantContextType {
  mesas: Mesa[];
  getMesa: (id: string) => Mesa | undefined;
  updateMesa: (id: string, updates: Partial<Mesa>) => void;
  addToCart: (mesaId: string, item: ItemCarrinho) => void;
  updateCartItemQty: (mesaId: string, uid: string, delta: number) => void;
  removeFromCart: (mesaId: string, uid: string) => void;
  confirmarPedido: (mesaId: string) => void;
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
  }));

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mesas, setMesas] = useState<Mesa[]>(criarMesasIniciais);

  const getMesa = useCallback(
    (id: string) => mesas.find((m) => m.id === id),
    [mesas]
  );

  const updateMesa = useCallback((id: string, updates: Partial<Mesa>) => {
    setMesas((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const addToCart = useCallback((mesaId: string, item: ItemCarrinho) => {
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId
          ? { ...m, carrinho: [...m.carrinho, item] }
          : m
      )
    );
  }, []);

  const updateCartItemQty = useCallback((mesaId: string, uid: string, delta: number) => {
    setMesas((prev) =>
      prev.map((m) => {
        if (m.id !== mesaId) return m;
        const carrinho = m.carrinho
          .map((item) =>
            item.uid === uid
              ? { ...item, quantidade: Math.max(1, item.quantidade + delta) }
              : item
          );
        return { ...m, carrinho };
      })
    );
  }, []);

  const removeFromCart = useCallback((mesaId: string, uid: string) => {
    setMesas((prev) =>
      prev.map((m) =>
        m.id === mesaId
          ? { ...m, carrinho: m.carrinho.filter((item) => item.uid !== uid) }
          : m
      )
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
        const novoPedido: PedidoRealizado = {
          id: `pedido-${Date.now()}`,
          itens: [...m.carrinho],
          total: totalPedido,
          horario: new Date().toLocaleTimeString("pt-BR", {
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

  return (
    <RestaurantContext.Provider
      value={{ mesas, getMesa, updateMesa, addToCart, updateCartItemQty, removeFromCart, confirmarPedido }}
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
