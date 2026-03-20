import { useState, useCallback } from "react";
import { CheckCircle, Search, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSistemaConfig } from "@/lib/adminStorage";
import { findClienteDelivery, upsertClienteDelivery, type ClienteDelivery } from "@/lib/deliveryStorage";
import { useRestaurant, type ItemCarrinho } from "@/contexts/RestaurantContext";
import PedidoFlow from "@/components/PedidoFlow";
import { toast } from "sonner";

type Etapa = "identificacao" | "cardapio" | "confirmacao" | "sucesso";

const sysConfig = getSistemaConfig();
const RESTAURANTE_NOME = sysConfig.nomeRestaurante || "Restaurante";
const RESTAURANTE_LOGO = sysConfig.logoUrl || "";
const RESTAURANTE_INITIALS = RESTAURANTE_NOME.slice(0, 2).toUpperCase();

const etapaProgress: Record<Etapa, number> = {
  identificacao: 25,
  cardapio: 50,
  confirmacao: 75,
  sucesso: 100,
};

const etapaLabel: Record<Etapa, string> = {
  identificacao: "Identificação",
  cardapio: "Cardápio",
  confirmacao: "Confirmação",
  sucesso: "Pedido enviado",
};

export default function PedidoPage() {
  const { criarPedidoBalcao } = useRestaurant();

  const [etapa, setEtapa] = useState<Etapa>("identificacao");

  // Identification
  const [busca, setBusca] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteDelivery | null>(null);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [complemento, setComplemento] = useState("");
  const [referencia, setReferencia] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState("");

  // Order
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [paraViagem, setParaViagem] = useState(false);
  const [formaPag, setFormaPag] = useState("pix");
  const [troco, setTroco] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(0);

  const handleBuscar = useCallback(() => {
    if (!busca.trim()) return;
    const results = findClienteDelivery(busca.trim());
    setBuscaFeita(true);
    if (results.length > 0) {
      setClienteEncontrado(results[0]);
      setShowForm(false);
    } else {
      setClienteEncontrado(null);
    }
  }, [busca]);

  const preencherDoCliente = (c: ClienteDelivery) => {
    setNome(c.nome);
    setTelefone(c.telefone);
    setCpf(c.cpf);
    setEndereco(c.endereco);
    setNumero(c.numero);
    setBairro(c.bairro);
    setCidade("");
    setComplemento(c.complemento);
    setReferencia(c.referencia);
  };

  const handleSelecionarCliente = () => {
    if (clienteEncontrado) {
      preencherDoCliente(clienteEncontrado);
      setEtapa("cardapio");
    }
  };

  const handleCepChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted);
    setCepErro("");

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) {
          setCepErro("CEP não encontrado");
        } else {
          setEndereco(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
        }
      } catch {
        setCepErro("Erro ao buscar CEP");
      } finally {
        setCepLoading(false);
      }
    }
  };

  const formValido = nome.trim() && telefone.trim() && cpf.trim() && endereco.trim() && numero.trim();

  const handleSalvarCadastro = () => {
    if (!formValido) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setEtapa("cardapio");
  };

  const handlePedidoConfirmado = (itensPedido: ItemCarrinho[], pv: boolean) => {
    setItens(itensPedido);
    setParaViagem(pv);
    setEtapa("confirmacao");
  };

  const totalPedido = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);

  const handleConfirmarPedido = () => {
    const cliente = upsertClienteDelivery({
      nome: nome.trim(),
      cpf: cpf.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      numero: numero.trim(),
      bairro: bairro.trim(),
      complemento: complemento.trim(),
      referencia: referencia.trim(),
    });

    criarPedidoBalcao({
      itens,
      origem: "delivery",
      operador: { id: cliente.id, nome: cliente.nome, pin: "", role: "garcom" },
      clienteNome: nome.trim(),
      clienteTelefone: telefone.trim(),
      enderecoCompleto: `${endereco}, ${numero}${complemento ? ` - ${complemento}` : ""}`,
      bairro: bairro.trim(),
      referencia: referencia.trim(),
      formaPagamentoDelivery: formaPag,
      trocoParaQuanto: formaPag === "dinheiro" && troco ? parseFloat(troco.replace(",", ".")) : undefined,
    });

    // Get the latest pedido number
    setNumeroPedido(Date.now() % 10000);
    setEtapa("sucesso");
    toast.success("Pedido enviado com sucesso!");
  };

  const handleNovoPedido = () => {
    setBusca("");
    setClienteEncontrado(null);
    setBuscaFeita(false);
    setShowForm(false);
    setNome("");
    setTelefone("");
    setCpf("");
    setCep("");
    setEndereco("");
    setNumero("");
    setBairro("");
    setCidade("");
    setComplemento("");
    setReferencia("");
    setItens([]);
    setParaViagem(false);
    setFormaPag("pix");
    setTroco("");
    setEtapa("identificacao");
  };

  // ── Cardápio (full screen PedidoFlow) ──
  if (etapa === "cardapio") {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <PedidoFlow
          modo="delivery"
          clienteNome={nome}
          onPedidoConfirmado={handlePedidoConfirmado}
          onBack={() => setEtapa("identificacao")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        {RESTAURANTE_LOGO ? (
          <img src={RESTAURANTE_LOGO} alt={RESTAURANTE_NOME} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            {RESTAURANTE_INITIALS}
          </div>
        )}
        <span className="font-semibold text-lg">{RESTAURANTE_NOME}</span>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-4 py-3 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{etapaLabel[etapa]}</span>
          <span>{etapaProgress[etapa]}%</span>
        </div>
        <Progress value={etapaProgress[etapa]} className="h-2" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* ── ETAPA 1: Identificação ── */}
        {etapa === "identificacao" && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold">Faça seu pedido</h1>
              <p className="text-sm text-muted-foreground">Informe seu CPF ou telefone para começar</p>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="CPF ou Telefone"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              />
              <Button onClick={handleBuscar} size="icon" variant="secondary">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Cliente encontrado */}
            {buscaFeita && clienteEncontrado && !showForm && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="font-semibold">{clienteEncontrado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {clienteEncontrado.endereco}, {clienteEncontrado.numero} — {clienteEncontrado.bairro}
                    </p>
                    <p className="text-sm text-muted-foreground">{clienteEncontrado.telefone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleSelecionarCliente}>Sou eu, continuar</Button>
                    <Button variant="outline" className="flex-1" onClick={() => {
                      setClienteEncontrado(null);
                      setShowForm(true);
                    }}>Não sou eu</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Não encontrado */}
            {buscaFeita && !clienteEncontrado && !showForm && (
              <Card>
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Cliente não encontrado</p>
                  <Button onClick={() => setShowForm(true)}>Cadastrar novo cliente</Button>
                </CardContent>
              </Card>
            )}

            {/* Formulário de cadastro */}
            {showForm && (
              <div className="space-y-3">
                <h2 className="font-semibold">Cadastro</h2>
                <Input placeholder="Nome completo *" value={nome} onChange={(e) => setNome(e.target.value)} />
                <Input placeholder="Telefone *" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                <Input placeholder="CPF *" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                <div className="relative">
                  <Input placeholder="CEP (opcional)" value={cep} onChange={(e) => handleCepChange(e.target.value)} />
                  {cepLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {cepErro && <p className="text-xs text-destructive">{cepErro}</p>}
                <Input placeholder="Endereço / Rua *" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Número *" value={numero} onChange={(e) => setNumero(e.target.value)} />
                  <Input placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
                </div>
                {cidade && (
                  <Input placeholder="Cidade" value={cidade} readOnly className="bg-muted" />
                )}
                <Input placeholder="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                <Input placeholder="Referência" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                <Button className="w-full" disabled={!formValido} onClick={handleSalvarCadastro}>
                  Salvar e ver cardápio
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── ETAPA 3: Confirmação ── */}
        {etapa === "confirmacao" && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setEtapa("cardapio")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
            </Button>

            <h2 className="text-lg font-bold">Confirme seu pedido</h2>

            {/* Client info */}
            <Card>
              <CardContent className="p-4 space-y-1">
                <p className="font-semibold">{nome}</p>
                <p className="text-sm text-muted-foreground">
                  {endereco}, {numero}{complemento ? ` - ${complemento}` : ""} — {bairro}
                </p>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold text-sm">Itens</h3>
                {itens.map((item) => (
                  <div key={item.uid} className="flex justify-between text-sm">
                    <span>{item.quantidade}x {item.nome}</span>
                    <span>R$ {(item.precoUnitario * item.quantidade).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>R$ {totalPedido.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de pagamento</label>
              <Select value={formaPag} onValueChange={setFormaPag}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={document.body}>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                </SelectContent>
              </Select>
              {formaPag === "dinheiro" && (
                <Input
                  placeholder="Troco para quanto? (opcional)"
                  value={troco}
                  onChange={(e) => setTroco(e.target.value)}
                  type="text"
                  inputMode="decimal"
                />
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handleConfirmarPedido}>
              Confirmar pedido
            </Button>
          </div>
        )}

        {/* ── ETAPA 4: Sucesso ── */}
        {etapa === "sucesso" && (
          <div className="max-w-md mx-auto text-center space-y-6 pt-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Pedido recebido! 🎉</h2>
            <p className="text-muted-foreground">Pedido #{numeroPedido}</p>
            <p className="text-sm text-muted-foreground">Aguarde, seu pedido está sendo preparado</p>
            <Button size="lg" onClick={handleNovoPedido}>Fazer novo pedido</Button>
          </div>
        )}
      </div>
    </div>
  );
}
