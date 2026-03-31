import { useEffect, useState } from "react";
import {
  Banknote,
  Clock,
  LockKeyhole,
  LogOut,
  QrCode,
  ReceiptText,
  Search,
} from "lucide-react";

interface CaixaHeaderProps {
  caixaAberto: boolean;
  operadorNome: string;
  nomeRestaurante: string;
  accessMode: "caixa" | "gerente";
  onLogout: () => void;
  onOpenMovimentacao: () => void;
  onOpenTurnoReport: () => void;
  onOpenBuscaComanda: () => void;
  onOpenQrScanner: () => void;
  onOpenBalcao: () => void;
  isAdminAccess: boolean;
}

const CaixaHeader = ({
  operadorNome,
  nomeRestaurante,
  accessMode,
  onLogout,
  onOpenMovimentacao,
  onOpenTurnoReport,
  onOpenBuscaComanda,
  onOpenQrScanner,
  onOpenBalcao,
}: CaixaHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockStr = currentTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <>
      {/* ── Windows-style Title Bar ── */}
      <div className="flex items-center px-4 py-2.5 shrink-0 border-b border-border bg-card">
        <p className="text-sm font-black text-foreground truncate">
          {nomeRestaurante || "Orderly"}
        </p>
        <div className="flex-1" />
        <p className="text-xs text-muted-foreground">
          {operadorNome} •{" "}
          {accessMode === "gerente" ? "Acesso completo" : "Operador de caixa"}
        </p>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-black tabular-nums text-foreground">
            {clockStr}
          </span>
        </div>
      </div>

      {/* ── Windows-style Toolbar ── */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 shrink-0 bg-card">
        <button
          onClick={onOpenBalcao}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <ReceiptText className="h-5 w-5" />
          <span className="text-xs font-bold">Novo pedido</span>
        </button>
        <button
          onClick={onOpenMovimentacao}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <Banknote className="h-5 w-5" />
          <span className="text-xs font-bold">Sangria</span>
        </button>
        <div className="w-px h-8 mx-1 bg-border" />
        <button
          onClick={onOpenTurnoReport}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-destructive/50 bg-secondary text-destructive hover:bg-destructive/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <LockKeyhole className="h-5 w-5" />
          <span className="text-xs font-bold">Fechar turno</span>
        </button>
        <button
          onClick={onOpenBuscaComanda}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <Search className="h-5 w-5" />
          <span className="text-xs font-bold">Buscar</span>
        </button>
        <button
          onClick={onOpenQrScanner}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <QrCode className="h-5 w-5" />
          <span className="text-xs font-bold">QR Code</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors"
          style={{ minWidth: 76 }}
        >
          <LogOut className="h-5 w-5" />
          <span className="text-xs font-bold">Sair</span>
        </button>
      </div>
    </>
  );
};

export default CaixaHeader;
