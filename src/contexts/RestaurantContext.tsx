import React, { createContext, useContext, useState, useCallback } from "react";

export interface ItemPedido {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export interface PedidoRealizado {
  id: string;
  itens: ItemPedido[];
  total: number;
  horario: string;
}

export interface Mesa {
  id: string;
  numero: number;
  status: "livre" | "pendente" | "consumo";
  total: number;
  carrinho: ItemPedido[];
  pedidos: PedidoRealizado[];
}

interface RestaurantContextType {
  mesas: Mesa[];
  getMesa: (id: string) => Mesa | undefined;
  updateMesa: (id: string, updates: Partial<Mesa>) => void;
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

  return (
    <RestaurantContext.Provider value={{ mesas, getMesa, updateMesa }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
};
