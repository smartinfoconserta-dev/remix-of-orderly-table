import type { CriticalAction } from "@/hooks/useCaixaDialogsState";
import CaixaCriticalActionDialog from "./CaixaCriticalActionDialog";
import CaixaTurnoReport from "./CaixaTurnoReport";
import CaixaMovimentacaoDialog from "./CaixaMovimentacaoDialog";
import CaixaBalcaoFormDialog from "./CaixaBalcaoFormDialog";
import type { ClienteDelivery } from "@/lib/deliveryStorage";
import type { PaymentMethod } from "@/types/operations";
import CaixaDeliveryConfirmDialog from "./CaixaDeliveryConfirmDialog";
import CaixaRejectDialog from "./CaixaRejectDialog";
import CaixaMotoboyConferencia from "./CaixaMotoboyConferencia";
import CaixaDescontoDialog from "./CaixaDescontoDialog";
import CaixaEstornoDialog from "./CaixaEstornoDialog";
import CaixaBuscaComanda from "./CaixaBuscaComanda";
import CaixaQrScanner from "./CaixaQrScanner";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";

interface CaixaDialogsProps {
  /* ── Critical Action ── */
  criticalAction: CriticalAction | null;
  resetCriticalDialog: () => void;
  criticalManagerName: string;
  setCriticalManagerName: (v: string) => void;
  criticalManagerPin: string;
  setCriticalManagerPin: (v: string) => void;
  criticalReason: string;
  setCriticalReason: (v: string) => void;
  criticalError: string | null;
  isAuthorizingCriticalAction: boolean;
  getCriticalActionCopy: () => { title: string; description: string; buttonLabel: string } | null;
  handleConfirmCriticalAction: () => void;

  /* ── Turno ── */
  turnoReportOpen: boolean;
  setTurnoReportOpen: (v: boolean) => void;
  turnoModalOpen: boolean;
  setTurnoModalOpen: (v: boolean) => void;
  turnoManagerName: string;
  setTurnoManagerName: (v: string) => void;
  turnoManagerPin: string;
  setTurnoManagerPin: (v: string) => void;
  turnoError: string | null;
  setTurnoError: (v: string | null) => void;
  isClosingTurno: boolean;
  dinheiroContado: string;
  setDinheiroContado: (v: string) => void;
  motivoDiferenca: string;
  setMotivoDiferenca: (v: string) => void;
  isDesktop: boolean;
  resumoFinanceiro: any;
  fundoTroco: number;
  caixaAberto: boolean;
  caixaOpenTime: string | null;
  clockStr: string;
  pedidosBalcao: any[];
  fechamentos: any[];
  movimentacoesCaixa: any[];
  resumoDeliveryTurno: any;
  handleCloseTurno: () => void;
  accessMode: string;
  currentOperatorNome: string;

  /* ── Movimentação ── */
  movModalOpen: boolean;
  setMovModalOpen: (v: boolean) => void;
  movTipo: "entrada" | "saida";
  setMovTipo: (v: "entrada" | "saida") => void;
  movDescricao: string;
  setMovDescricao: (v: string) => void;
  movValor: string;
  setMovValor: (v: string) => void;
  movConfirmStep: boolean;
  setMovConfirmStep: (v: boolean) => void;
  handleRegistrarMovimentacao: () => void;

  /* ── Balcão Form ── */
  balcaoOpen: boolean;
  balcaoFlowAtivo: boolean;
  onCloseBalcao: () => void;
  balcaoTipo: "balcao" | "delivery";
  setBalcaoTipo: (v: "balcao" | "delivery") => void;
  balcaoClienteNome: string;
  setBalcaoClienteNome: (v: string) => void;
  balcaoTelefone: string;
  setBalcaoTelefone: (v: string) => void;
  balcaoCpf: string;
  setBalcaoCpf: (v: string) => void;
  balcaoEndereco: string;
  setBalcaoEndereco: (v: string) => void;
  balcaoNumero: string;
  setBalcaoNumero: (v: string) => void;
  balcaoBairro: string;
  setBalcaoBairro: (v: string) => void;
  balcaoComplemento: string;
  setBalcaoComplemento: (v: string) => void;
  balcaoReferencia: string;
  setBalcaoReferencia: (v: string) => void;
  deliveryStep: string;
  setDeliveryStep: (v: any) => void;
  deliveryBusca: string;
  setDeliveryBusca: (v: string) => void;
  deliveryResultados: any[];
  setDeliveryResultados: (v: any[]) => void;
  deliveryCep: string;
  setDeliveryCep: (v: string) => void;
  deliveryCepLoading: boolean;
  setDeliveryCepLoading: (v: boolean) => void;
  deliveryCepErro: string;
  setDeliveryCepErro: (v: string) => void;
  deliveryCidade: string;
  setDeliveryCidade: (v: string) => void;
  onOpenCardapio: () => void;
  caixaStoreIdRef: React.MutableRefObject<string>;

  /* ── Delivery Confirm ── */
  deliveryConfirmOpen: boolean;
  onCloseDeliveryConfirm: () => void;
  deliveryPendingItens: ItemCarrinho[];
  sistemaConfig: any;
  balcaoFormaPag: string;
  setBalcaoFormaPag: (v: string) => void;
  balcaoTroco: string;
  setBalcaoTroco: (v: string) => void;
  deliveryTempoEstimado: string;
  setDeliveryTempoEstimado: (v: string) => void;
  handleDeliveryConfirm: (sendWhatsapp: boolean) => void;
  onBackToCardapio: () => void;

  /* ── Reject ── */
  rejectDialogOpen: boolean;
  rejectMotivo: string;
  setRejectMotivo: (v: string) => void;
  onCloseReject: () => void;
  onConfirmReject: () => void;

  /* ── Motoboy Conferencia ── */
  fechamentoSelecionado: any;
  setFechamentoSelecionado: (v: any) => void;
  pinConferencia: string;
  setPinConferencia: (v: string) => void;
  pinConferenciaErro: string;
  setPinConferenciaErro: (v: string) => void;
  verifyManagerAccess: any;
  currentOperator: any;
  registrarFechamentoMotoboy: any;
  setFechamentosPendentes: any;

  /* ── Desconto ── */
  descontoModalOpen: boolean;
  onCloseDesconto: () => void;
  descontoTipo: "percentual" | "valor";
  setDescontoTipo: (v: "percentual" | "valor") => void;
  descontoInput: string;
  setDescontoInput: (v: string) => void;
  descontoMotivo: string;
  setDescontoMotivo: (v: string) => void;
  descontoManagerName: string;
  setDescontoManagerName: (v: string) => void;
  descontoManagerPin: string;
  setDescontoManagerPin: (v: string) => void;
  descontoError: string | null;
  mesaTotal: number;
  handleAplicarDesconto: () => void;

  /* ── Estorno ── */
  estornoModalOpen: boolean;
  onCloseEstorno: () => void;
  estornoMotivo: string;
  setEstornoMotivo: (v: string) => void;
  estornoNome: string;
  setEstornoNome: (v: string) => void;
  estornoPin: string;
  setEstornoPin: (v: string) => void;
  estornoError: string | null;
  handleEstornar: () => void;

  /* ── Busca Comanda ── */
  buscaComandaOpen: boolean;
  onCloseBuscaComanda: () => void;
  resultadosBusca: any[];
  buscaComanda: string;
  setBuscaComanda: (v: string) => void;
  onEstornarFromBusca: (id: string) => void;

  /* ── QR Scanner ── */
  qrScanOpen: boolean;
  onCloseQrScan: () => void;
  qrScanInput: string;
  setQrScanInput: (v: string) => void;
  handleQrScan: (value: string) => void;
}

const CaixaDialogs = (p: CaixaDialogsProps) => {
  return (
    <>
      {/* ── CRITICAL ACTION DIALOG ── */}
      <CaixaCriticalActionDialog
        open={Boolean(p.criticalAction)}
        onClose={p.resetCriticalDialog}
        title={p.getCriticalActionCopy()?.title}
        description={p.getCriticalActionCopy()?.description}
        buttonLabel={p.getCriticalActionCopy()?.buttonLabel}
        managerName={p.criticalManagerName}
        setManagerName={p.setCriticalManagerName}
        managerPin={p.criticalManagerPin}
        setManagerPin={p.setCriticalManagerPin}
        reason={p.criticalReason}
        setReason={p.setCriticalReason}
        error={p.criticalError}
        isLoading={p.isAuthorizingCriticalAction}
        onConfirm={p.handleConfirmCriticalAction}
      />

      <CaixaTurnoReport
        turnoReportOpen={p.turnoReportOpen}
        setTurnoReportOpen={p.setTurnoReportOpen}
        turnoModalOpen={p.turnoModalOpen}
        setTurnoModalOpen={p.setTurnoModalOpen}
        turnoManagerName={p.turnoManagerName}
        setTurnoManagerName={p.setTurnoManagerName}
        turnoManagerPin={p.turnoManagerPin}
        setTurnoManagerPin={p.setTurnoManagerPin}
        turnoError={p.turnoError}
        setTurnoError={p.setTurnoError}
        isClosingTurno={p.isClosingTurno}
        dinheiroContado={p.dinheiroContado}
        setDinheiroContado={p.setDinheiroContado}
        motivoDiferenca={p.motivoDiferenca}
        setMotivoDiferenca={p.setMotivoDiferenca}
        isDesktop={p.isDesktop}
        resumoFinanceiro={p.resumoFinanceiro}
        fundoTroco={p.fundoTroco}
        caixaAberto={p.caixaAberto}
        caixaOpenTime={p.caixaOpenTime}
        clockStr={p.clockStr}
        pedidosBalcao={p.pedidosBalcao}
        fechamentos={p.fechamentos}
        movimentacoesCaixa={p.movimentacoesCaixa}
        resumoDeliveryTurno={p.resumoDeliveryTurno}
        handleCloseTurno={p.handleCloseTurno}
        accessMode={p.accessMode}
        currentOperatorNome={p.currentOperatorNome}
      />

      <CaixaMovimentacaoDialog
        movModalOpen={p.movModalOpen}
        setMovModalOpen={p.setMovModalOpen}
        movTipo={p.movTipo}
        setMovTipo={p.setMovTipo}
        movDescricao={p.movDescricao}
        setMovDescricao={p.setMovDescricao}
        movValor={p.movValor}
        setMovValor={p.setMovValor}
        movConfirmStep={p.movConfirmStep}
        setMovConfirmStep={p.setMovConfirmStep}
        isDesktop={p.isDesktop}
        handleRegistrarMovimentacao={p.handleRegistrarMovimentacao}
        movimentacoesCaixa={p.movimentacoesCaixa}
      />

      {/* ── BALCÃO / DELIVERY ── */}
      <CaixaBalcaoFormDialog
        open={p.balcaoOpen && !p.balcaoFlowAtivo}
        onClose={p.onCloseBalcao}
        isDesktop={p.isDesktop}
        balcaoTipo={p.balcaoTipo}
        setBalcaoTipo={p.setBalcaoTipo}
        balcaoClienteNome={p.balcaoClienteNome}
        setBalcaoClienteNome={p.setBalcaoClienteNome}
        balcaoTelefone={p.balcaoTelefone}
        setBalcaoTelefone={p.setBalcaoTelefone}
        balcaoCpf={p.balcaoCpf}
        setBalcaoCpf={p.setBalcaoCpf}
        balcaoEndereco={p.balcaoEndereco}
        setBalcaoEndereco={p.setBalcaoEndereco}
        balcaoNumero={p.balcaoNumero}
        setBalcaoNumero={p.setBalcaoNumero}
        balcaoBairro={p.balcaoBairro}
        setBalcaoBairro={p.setBalcaoBairro}
        balcaoComplemento={p.balcaoComplemento}
        setBalcaoComplemento={p.setBalcaoComplemento}
        balcaoReferencia={p.balcaoReferencia}
        setBalcaoReferencia={p.setBalcaoReferencia}
        deliveryStep={p.deliveryStep}
        setDeliveryStep={p.setDeliveryStep}
        deliveryBusca={p.deliveryBusca}
        setDeliveryBusca={p.setDeliveryBusca}
        deliveryResultados={p.deliveryResultados}
        setDeliveryResultados={p.setDeliveryResultados}
        deliveryCep={p.deliveryCep}
        setDeliveryCep={p.setDeliveryCep}
        deliveryCepLoading={p.deliveryCepLoading}
        setDeliveryCepLoading={p.setDeliveryCepLoading}
        deliveryCepErro={p.deliveryCepErro}
        setDeliveryCepErro={p.setDeliveryCepErro}
        deliveryCidade={p.deliveryCidade}
        setDeliveryCidade={p.setDeliveryCidade}
        onOpenCardapio={p.onOpenCardapio}
        caixaStoreIdRef={p.caixaStoreIdRef}
      />

      {/* ── DELIVERY CONFIRMATION DIALOG ── */}
      <CaixaDeliveryConfirmDialog
        open={p.deliveryConfirmOpen}
        onClose={p.onCloseDeliveryConfirm}
        itens={p.deliveryPendingItens}
        sistemaConfig={p.sistemaConfig}
        balcaoClienteNome={p.balcaoClienteNome}
        balcaoEndereco={p.balcaoEndereco}
        balcaoNumero={p.balcaoNumero}
        balcaoBairro={p.balcaoBairro}
        balcaoTelefone={p.balcaoTelefone}
        balcaoFormaPag={p.balcaoFormaPag}
        setBalcaoFormaPag={p.setBalcaoFormaPag}
        balcaoTroco={p.balcaoTroco}
        setBalcaoTroco={p.setBalcaoTroco}
        deliveryTempoEstimado={p.deliveryTempoEstimado}
        setDeliveryTempoEstimado={p.setDeliveryTempoEstimado}
        onConfirm={p.handleDeliveryConfirm}
        onBackToCardapio={p.onBackToCardapio}
      />

      {/* ── REJECT DELIVERY DIALOG ── */}
      <CaixaRejectDialog
        open={p.rejectDialogOpen}
        onClose={p.onCloseReject}
        motivo={p.rejectMotivo}
        setMotivo={p.setRejectMotivo}
        onConfirm={p.onConfirmReject}
      />

      <CaixaMotoboyConferencia
        fechamentoSelecionado={p.fechamentoSelecionado}
        setFechamentoSelecionado={p.setFechamentoSelecionado}
        pinConferencia={p.pinConferencia}
        setPinConferencia={p.setPinConferencia}
        pinConferenciaErro={p.pinConferenciaErro}
        setPinConferenciaErro={p.setPinConferenciaErro}
        verifyManagerAccess={p.verifyManagerAccess}
        currentOperator={p.currentOperator}
        registrarFechamentoMotoboy={p.registrarFechamentoMotoboy}
        setFechamentosPendentes={p.setFechamentosPendentes}
      />

      <CaixaDescontoDialog
        open={p.descontoModalOpen}
        onClose={p.onCloseDesconto}
        descontoTipo={p.descontoTipo}
        setDescontoTipo={p.setDescontoTipo}
        descontoInput={p.descontoInput}
        setDescontoInput={p.setDescontoInput}
        descontoMotivo={p.descontoMotivo}
        setDescontoMotivo={p.setDescontoMotivo}
        descontoManagerName={p.descontoManagerName}
        setDescontoManagerName={p.setDescontoManagerName}
        descontoManagerPin={p.descontoManagerPin}
        setDescontoManagerPin={p.setDescontoManagerPin}
        descontoError={p.descontoError}
        mesaTotal={p.mesaTotal}
        onAplicar={p.handleAplicarDesconto}
      />

      <CaixaEstornoDialog
        open={p.estornoModalOpen}
        onClose={p.onCloseEstorno}
        estornoMotivo={p.estornoMotivo}
        setEstornoMotivo={p.setEstornoMotivo}
        estornoNome={p.estornoNome}
        setEstornoNome={p.setEstornoNome}
        estornoPin={p.estornoPin}
        setEstornoPin={p.setEstornoPin}
        estornoError={p.estornoError}
        onConfirmar={p.handleEstornar}
      />

      {/* ── BUSCA COMANDA MODAL ── */}
      <CaixaBuscaComanda
        open={p.buscaComandaOpen}
        onClose={p.onCloseBuscaComanda}
        resultados={p.resultadosBusca}
        busca={p.buscaComanda}
        setBusca={p.setBuscaComanda}
        onEstornar={p.onEstornarFromBusca}
      />

      {/* ── QR SCANNER DIALOG ── */}
      <CaixaQrScanner
        open={p.qrScanOpen}
        onClose={p.onCloseQrScan}
        input={p.qrScanInput}
        setInput={p.setQrScanInput}
        onScan={p.handleQrScan}
      />
    </>
  );
};

export default CaixaDialogs;
