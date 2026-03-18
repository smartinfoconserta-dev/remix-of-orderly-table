import { useEffect, useState } from "react";
import PedidoFlow from "@/components/PedidoFlow";

const CLIENT_DEVICE_MESA_STORAGE_KEY = "obsidian-cliente-mesa-fixa";
const DEFAULT_CLIENT_MESA_ID = "mesa-1";

const getFixedMesaId = () => {
  if (typeof window === "undefined") return DEFAULT_CLIENT_MESA_ID;

  const storedMesaId = window.localStorage.getItem(CLIENT_DEVICE_MESA_STORAGE_KEY)?.trim();
  return storedMesaId || DEFAULT_CLIENT_MESA_ID;
};

const ClientePage = () => {
  const [mesaId] = useState(getFixedMesaId);

  useEffect(() => {
    window.localStorage.setItem(CLIENT_DEVICE_MESA_STORAGE_KEY, mesaId);
  }, [mesaId]);

  return <PedidoFlow modo="cliente" mesaId={mesaId} />;
};

export default ClientePage;
