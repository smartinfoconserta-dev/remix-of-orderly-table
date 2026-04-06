interface CaixaStatusBarProps {
  currentOperatorNome: string;
  caixaOpenTime: string | null;
  mesasConsumo: number;
  mesasLivre: number;
  fechamentosCount: number;
  ultimoFechamento: string;
  moduloMesas: boolean;
  showDeliveryTab: boolean;
  pedidosAguardando: number;
  onGoToDelivery: () => void;
}

const CaixaStatusBar = ({
  currentOperatorNome,
  caixaOpenTime,
  mesasConsumo,
  mesasLivre,
  fechamentosCount,
  ultimoFechamento,
  moduloMesas,
  showDeliveryTab,
  pedidosAguardando,
  onGoToDelivery,
}: CaixaStatusBarProps) => {
  return (
    <div className="flex items-center shrink-0 text-[10px] bg-card border-t border-border text-muted-foreground overflow-x-auto scrollbar-hide">
      <span className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 shrink-0 border-r border-border">
        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Online
      </span>
      <span className="px-2 md:px-3 py-1.5 font-bold shrink-0 border-r border-border hidden sm:block">
        {currentOperatorNome}
      </span>
      {caixaOpenTime && (
        <span className="px-2 md:px-3 py-1.5 shrink-0 border-r border-border hidden md:block">
          Turno: {caixaOpenTime}
        </span>
      )}
      {moduloMesas && (
        <span className="px-2 md:px-3 py-1.5 shrink-0 border-r border-border">C: {mesasConsumo}</span>
      )}
      <span className="px-2 md:px-3 py-1.5 shrink-0 border-r border-border">F: {fechamentosCount}</span>
      <span className="px-2 md:px-3 py-1.5 shrink-0 hidden md:block">{ultimoFechamento}</span>
      {showDeliveryTab && pedidosAguardando > 0 && (
        <button
          onClick={onGoToDelivery}
          className="px-2 md:px-3 py-1.5 font-bold animate-pulse bg-amber-500/15 text-amber-500 shrink-0 ml-auto"
        >
          🛵 {pedidosAguardando}
        </button>
      )}
    </div>
  );
};

export default CaixaStatusBar;
