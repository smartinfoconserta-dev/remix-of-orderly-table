import { useCallback, useRef, useState } from "react";

/* ── types ── */
export type CriticalAction =
  | { type: "zerar_mesa"; mesaId: string; mesaNumero: number }
  | { type: "remover_item_carrinho"; mesaId: string; mesaNumero: number; itemUid: string; itemNome: string }
  | { type: "remover_item_pedido"; mesaId: string; mesaNumero: number; pedidoId: string; pedidoNumero: number; itemUid: string; itemNome: string; quantidade: number }
  | { type: "cancelar_pedido"; mesaId: string; mesaNumero: number; pedidoId: string; pedidoNumero: number };

export function useCaixaDialogsState() {
  /* ── Critical Action ── */
  const [criticalAction, setCriticalAction] = useState<CriticalAction | null>(null);
  const [criticalManagerName, setCriticalManagerName] = useState("");
  const [criticalManagerPin, setCriticalManagerPin] = useState("");
  const [criticalReason, setCriticalReason] = useState("");
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [isAuthorizingCriticalAction, setIsAuthorizingCriticalAction] = useState(false);

  const resetCriticalDialog = useCallback(() => {
    setCriticalAction(null);
    setCriticalManagerName("");
    setCriticalManagerPin("");
    setCriticalReason("");
    setCriticalError(null);
    setIsAuthorizingCriticalAction(false);
  }, []);

  /* ── Desconto ── */
  const [descontoModalOpen, setDescontoModalOpen] = useState(false);
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoInput, setDescontoInput] = useState("");
  const [descontoMotivo, setDescontoMotivo] = useState("");
  const [descontoManagerName, setDescontoManagerName] = useState("");
  const [descontoManagerPin, setDescontoManagerPin] = useState("");
  const [descontoError, setDescontoError] = useState<string | null>(null);
  const [descontoAplicado, setDescontoAplicado] = useState(0);

  /* ── Estorno ── */
  const [estornoModalOpen, setEstornoModalOpen] = useState(false);
  const [estornoFechamentoId, setEstornoFechamentoId] = useState<string | null>(null);
  const [estornoMotivo, setEstornoMotivo] = useState("");
  const [estornoPin, setEstornoPin] = useState("");
  const [estornoNome, setEstornoNome] = useState("");
  const [estornoError, setEstornoError] = useState<string | null>(null);

  /* ── Turno ── */
  const [turnoModalOpen, setTurnoModalOpen] = useState(false);
  const [turnoManagerName, setTurnoManagerName] = useState("");
  const [turnoManagerPin, setTurnoManagerPin] = useState("");
  const [turnoError, setTurnoError] = useState<string | null>(null);
  const [isClosingTurno, setIsClosingTurno] = useState(false);
  const [turnoReportOpen, setTurnoReportOpen] = useState(false);
  const [dinheiroContado, setDinheiroContado] = useState("");
  const [motivoDiferenca, setMotivoDiferenca] = useState("");

  /* ── Movimentação ── */
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<"entrada" | "saida">("entrada");
  const [movDescricao, setMovDescricao] = useState("");
  const [movValor, setMovValor] = useState("");
  const [movConfirmStep, setMovConfirmStep] = useState(false);

  /* ── Busca Comanda ── */
  const [buscaComanda, setBuscaComanda] = useState("");
  const [buscaComandaOpen, setBuscaComandaOpen] = useState(false);

  /* ── QR Scanner ── */
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrScanInput, setQrScanInput] = useState("");
  const qrScanInputRef = useRef<HTMLInputElement>(null);

  /* ── Totem Cancel ── */
  const [totemCancelOpen, setTotemCancelOpen] = useState<string | null>(null);
  const [totemCancelMotivo, setTotemCancelMotivo] = useState("");
  const [totemCancelPin, setTotemCancelPin] = useState("");
  const [totemCancelError, setTotemCancelError] = useState<string | null>(null);
  const [totemCancelLoading, setTotemCancelLoading] = useState(false);

  return {
    // critical action
    criticalAction, setCriticalAction,
    criticalManagerName, setCriticalManagerName,
    criticalManagerPin, setCriticalManagerPin,
    criticalReason, setCriticalReason,
    criticalError, setCriticalError,
    isAuthorizingCriticalAction, setIsAuthorizingCriticalAction,
    resetCriticalDialog,
    // desconto
    descontoModalOpen, setDescontoModalOpen,
    descontoTipo, setDescontoTipo,
    descontoInput, setDescontoInput,
    descontoMotivo, setDescontoMotivo,
    descontoManagerName, setDescontoManagerName,
    descontoManagerPin, setDescontoManagerPin,
    descontoError, setDescontoError,
    descontoAplicado, setDescontoAplicado,
    // estorno
    estornoModalOpen, setEstornoModalOpen,
    estornoFechamentoId, setEstornoFechamentoId,
    estornoMotivo, setEstornoMotivo,
    estornoPin, setEstornoPin,
    estornoNome, setEstornoNome,
    estornoError, setEstornoError,
    // turno
    turnoModalOpen, setTurnoModalOpen,
    turnoManagerName, setTurnoManagerName,
    turnoManagerPin, setTurnoManagerPin,
    turnoError, setTurnoError,
    isClosingTurno, setIsClosingTurno,
    turnoReportOpen, setTurnoReportOpen,
    dinheiroContado, setDinheiroContado,
    motivoDiferenca, setMotivoDiferenca,
    // movimentação
    movModalOpen, setMovModalOpen,
    movTipo, setMovTipo,
    movDescricao, setMovDescricao,
    movValor, setMovValor,
    movConfirmStep, setMovConfirmStep,
    // busca comanda
    buscaComanda, setBuscaComanda,
    buscaComandaOpen, setBuscaComandaOpen,
    // qr scanner
    qrScanOpen, setQrScanOpen,
    qrScanInput, setQrScanInput,
    qrScanInputRef,
    // totem cancel
    totemCancelOpen, setTotemCancelOpen,
    totemCancelMotivo, setTotemCancelMotivo,
    totemCancelPin, setTotemCancelPin,
    totemCancelError, setTotemCancelError,
    totemCancelLoading, setTotemCancelLoading,
  };
}
