import { useEffect, useState } from "react";
import { seedMenuData } from "@/scripts/seedMenu";

const STORE_ID = "66949d8d-257e-4bdd-b80c-0bb08e0e5c83";

export default function SeedPage() {
  const [status, setStatus] = useState("Aguardando...");
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    setStatus("Executando seed...");
    try {
      await seedMenuData(STORE_ID);
      setStatus("✅ Seed concluído com sucesso! Verifique o console para detalhes.");
    } catch (e: any) {
      setStatus(`❌ Erro: ${e.message}`);
    }
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Seed do Cardápio</h1>
        <p className="text-muted-foreground text-sm">
          Isso vai inserir 6 categorias e 20 produtos na loja <code className="text-xs bg-secondary px-1 rounded">{STORE_ID}</code>
        </p>
        <button
          onClick={run}
          disabled={running}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50"
        >
          {running ? "Executando..." : "Executar Seed"}
        </button>
        <p className="text-sm text-foreground">{status}</p>
      </div>
    </div>
  );
}
