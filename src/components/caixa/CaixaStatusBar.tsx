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
    <div className="flex items-center shrink-0 divide-x divide-border text-[10px] bg-card border-t border-border text-muted-foreground">
      <span className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Online
      </span>
      <span className="px-3 py-1.5 font-bold">
        Operador: {currentOperatorNome}
      </span>
      {caixaOpenTime && (
        <span className="px-3 py-1.5">
          Turno: aberto {caixaOpenTime}
        </span>
      )}
      {moduloMesas && (
        <span className="px-3 py-1.5">Consumo: {mesasConsumo}</span>
      )}
      {moduloMesas && (
        <span className="px-3 py-1.5">Livres: {mesasLivre}</span>
      )}
      <span className="px-3 py-1.5">Fechadas: {fechamentosCount}</span>
      <span className="px-3 py-1.5">
        Último: {ultimoFechamento}
      </span>
      {showDeliveryTab && pedidosAguardando > 0 && (
        <button
          onClick={onGoToDelivery}
          className="px-3 py-1.5 font-bold animate-pulse bg-amber-500/15 text-amber-500"
        >
          🛵 {pedidosAguardando} delivery aguardando
        </button>
      )}
    </div>
  );
};

export default CaixaStatusBar;
