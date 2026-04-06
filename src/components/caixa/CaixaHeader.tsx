import { useEffect, useState } from "react";
import {
  Banknote,
  Clock,
  LockKeyhole,
  LogOut,
  Menu,
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
      {/* ── Title Bar ── */}
      <div className="flex items-center px-3 md:px-4 py-2 md:py-2.5 shrink-0 border-b border-border bg-card gap-2">
        <p className="text-xs md:text-sm font-black text-foreground truncate min-w-0">
          {nomeRestaurante || "Orderly"}
        </p>
        <div className="flex-1" />
        <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block truncate">
          {operadorNome} •{" "}
          {accessMode === "gerente" ? "Acesso completo" : "Operador"}
        </p>
        <div className="flex-1 hidden md:block" />
        <div className="flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
          <span className="text-xs md:text-sm font-black tabular-nums text-foreground">
            {clockStr}
          </span>
        </div>
      </div>

      {/* ── Toolbar — scrollable on mobile ── */}
      <div className="flex items-center gap-1 border-b border-border px-2 md:px-3 py-1 md:py-1.5 shrink-0 bg-card overflow-x-auto scrollbar-hide">
        {[
          { onClick: onOpenBalcao, icon: ReceiptText, label: "Novo pedido" },
          { onClick: onOpenMovimentacao, icon: Banknote, label: "Sangria" },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            className="flex flex-col items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors shrink-0"
            style={{ minWidth: 60 }}
          >
            <btn.icon className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-[10px] md:text-xs font-bold whitespace-nowrap">{btn.label}</span>
          </button>
        ))}
        <div className="w-px h-6 md:h-8 mx-0.5 md:mx-1 bg-border shrink-0" />
        <button
          onClick={onOpenTurnoReport}
          className="flex flex-col items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded text-xs border border-destructive/50 bg-secondary text-destructive hover:bg-destructive/15 transition-colors shrink-0"
          style={{ minWidth: 60 }}
        >
          <LockKeyhole className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] md:text-xs font-bold whitespace-nowrap">Fechar turno</span>
        </button>
        <button
          onClick={onOpenBuscaComanda}
          className="flex flex-col items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors shrink-0"
          style={{ minWidth: 60 }}
        >
          <Search className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] md:text-xs font-bold">Buscar</span>
        </button>
        <button
          onClick={onOpenQrScanner}
          className="flex flex-col items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors shrink-0"
          style={{ minWidth: 60 }}
        >
          <QrCode className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] md:text-xs font-bold">QR</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 px-2 md:px-3 py-1 md:py-1.5 rounded text-xs border border-border bg-secondary text-foreground hover:bg-primary/15 transition-colors shrink-0"
          style={{ minWidth: 60 }}
        >
          <LogOut className="h-4 w-4 md:h-5 md:w-5" />
          <span className="text-[10px] md:text-xs font-bold">Sair</span>
        </button>
      </div>
    </>
  );
};

export default CaixaHeader;
