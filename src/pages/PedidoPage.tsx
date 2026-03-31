import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, Search, Loader2, ArrowLeft, LockKeyhole, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import PedidoFlow from "@/components/PedidoFlow";
import { toast } from "sonner";
import type { ItemCarrinho } from "@/contexts/RestaurantContext";
import type { Bairro } from "@/lib/deliveryStorage";
import type { HorariosSemana, HorarioFuncionamento, SistemaConfig } from "@/lib/adminStorage";
import { checkDeliveryAberto } from "@/lib/adminStorage";
import { preloadProducts } from "@/hooks/useProducts";
import { applyThemeToElement, applyCustomThemeToElement, clearThemeFromElement, THEME_MAP } from "@/lib/themeEngine";

const normStr = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// ── Etapas por modo ──
type Etapa = "login" | "cadastro" | "identificacao" | "cardapio" | "confirmacao" | "sucesso";

const etapaProgressVisitante: Record<string, number> = { cardapio: 25, identificacao: 50, confirmacao: 75, sucesso: 100 };
const etapaProgressCadastro: Record<string, number> = { login: 10, cadastro: 25, cardapio: 50, confirmacao: 75, sucesso: 100 };

const etapaLabel: Record<Etapa, string> = {
  login: "Login", cadastro: "Cadastro", identificacao: "Identificação",
  cardapio: "Cardápio", confirmacao: "Confirmação", sucesso: "Pedido enviado",
};

interface ClienteDelivery {
  id: string; nome: string; cpf: string; telefone: string;
  endereco: string; numero: string; bairro: string;
  complemento: string; referencia: string; senhaHash?: string;
}

const defaultHorario: HorarioFuncionamento = { ativo: true, abertura: "18:00", fechamento: "23:00" };
const defaultHorariosSemana: HorariosSemana = {
  dom: { ...defaultHorario, ativo: false }, seg: { ...defaultHorario }, ter: { ...defaultHorario },
  qua: { ...defaultHorario }, qui: { ...defaultHorario }, sex: { ...defaultHorario }, sab: { ...defaultHorario },
};

// ── Confirmação sub-component ──
function ConfirmacaoEtapa({ nome, endereco, numero, complemento, bairro, itens, taxaEntrega, totalPedido, formaPag, setFormaPag, troco, setTroco, onVoltar, onConfirmar, editEndereco }: {
  nome: string; endereco: string; numero: string; complemento: string; bairro: string;
  itens: ItemCarrinho[]; taxaEntrega: number; totalPedido: number;
  formaPag: string; setFormaPag: (v: string) => void;
  troco: string; setTroco: (v: string) => void;
  onVoltar: () => void; onConfirmar: () => void;
  editEndereco?: { endereco: string; numero: string; complemento: string; bairro: string; setEndereco: (v: string) => void; setNumero: (v: string) => void; setComplemento: (v: string) => void; setBairro: (v: string) => void } | null;
}) {
  const [confirmado, setConfirmado] = useState(false);
  return (
    <div className="max-w-md mx-auto space-y-6 pt-4">
      <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-1">
        <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
      </Button>
      <h2 className="text-lg font-bold">Confirme seu pedido</h2>
      <Card><CardContent className="p-4 space-y-1">
        <p className="font-semibold">{nome}</p>
        {editEndereco ? (
          <div className="space-y-2 pt-2">
            <Input placeholder="Endereço" value={editEndereco.endereco} onChange={(e) => editEndereco.setEndereco(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Número" value={editEndereco.numero} onChange={(e) => editEndereco.setNumero(e.target.value)} />
              <Input placeholder="Bairro" value={editEndereco.bairro} onChange={(e) => editEndereco.setBairro(e.target.value)} />
            </div>
            <Input placeholder="Complemento" value={editEndereco.complemento} onChange={(e) => editEndereco.setComplemento(e.target.value)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{endereco}, {numero}{complemento ? ` - ${complemento}` : ""} — {bairro}</p>
        )}
      </CardContent></Card>
      <Card><CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-sm">Itens</h3>
        {itens.map((item) => (
          <div key={item.uid} className="flex justify-between text-sm">
            <span>{item.quantidade}x {item.nome}</span>
            <span>R$ {(item.precoUnitario * item.quantidade).toFixed(2)}</span>
          </div>
        ))}
        {taxaEntrega > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Taxa de entrega</span><span>R$ {taxaEntrega.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between font-bold">
          <span>Total</span><span>R$ {totalPedido.toFixed(2)}</span>
        </div>
      </CardContent></Card>
      <div className="space-y-2">
        <label className="text-sm font-medium">Forma de pagamento</label>
        <Select value={formaPag} onValueChange={setFormaPag}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent container={document.body}>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
            <SelectItem value="debito">Débito</SelectItem>
          </SelectContent>
        </Select>
        {formaPag === "dinheiro" && (
          <Input placeholder="Troco para quanto? (opcional)" value={troco} onChange={(e) => setTroco(e.target.value)} type="text" inputMode="decimal" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="confirmo" checked={confirmado} onCheckedChange={(v) => setConfirmado(v === true)} />
        <label htmlFor="confirmo" className="text-sm cursor-pointer">Confirmo que as informações estão corretas</label>
      </div>
      <Button className="w-full" size="lg" onClick={onConfirmar} disabled={!confirmado}>Confirmar pedido</Button>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export default function PedidoPage() {
  const { slug } = useParams<{ slug: string }>();

  // Store resolution
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [loadingStore, setLoadingStore] = useState(true);

  // Config loaded from DB for this specific store
  const [storeConfig, setStoreConfig] = useState<{
    nome: string; logo: string; telefone: string;
    deliveryAtivo: boolean; modoIdentificacao: string;
    taxaEntrega: number; mensagemFechado: string;
    mensagemBoasVindas: string; horarios: HorariosSemana;
    temaCardapio?: string; corPrimaria?: string;
  } | null>(null);

  const [bairrosDisponiveis, setBairrosDisponiveis] = useState<Bairro[]>([]);

  // Resolve slug → storeId + load config
  useEffect(() => {
    if (!slug) { setStoreNotFound(true); setLoadingStore(false); return; }

    const resolve = async () => {
      try {
        const { data: storeResult } = await supabase.rpc("get_store_by_slug", { _slug: slug });
        const row = Array.isArray(storeResult) ? storeResult[0] : null;
        if (!row) { setStoreNotFound(true); setLoadingStore(false); return; }

        const foundStoreId = row.id;
        setStoreId(foundStoreId);

        // Load config for this store
        const { data: configData } = await supabase
          .from("restaurant_config")
          .select("*")
          .eq("store_id", foundStoreId)
          .maybeSingle();

        const horarios = (configData?.horario_funcionamento as unknown as HorariosSemana) ?? defaultHorariosSemana;

        setStoreConfig({
          nome: configData?.nome_restaurante || row.name || "Restaurante",
          logo: configData?.logo_base64 || configData?.logo_url || "",
          telefone: configData?.telefone || "",
          deliveryAtivo: configData?.delivery_ativo !== false,
          modoIdentificacao: configData?.modo_identificacao_delivery || "visitante",
          taxaEntrega: Number(configData?.taxa_entrega ?? 0),
          mensagemFechado: configData?.mensagem_fechado || "",
          mensagemBoasVindas: configData?.mensagem_boas_vindas || "",
          horarios,
          temaCardapio: (configData as any)?.tema_cardapio || undefined,
          corPrimaria: configData?.cor_primaria || undefined,
        });

        // Load bairros
        const { data: bairrosData } = await supabase
          .from("bairros_delivery")
          .select("*")
          .eq("store_id", foundStoreId)
          .order("nome");
        setBairrosDisponiveis((bairrosData ?? []).filter((b: any) => b.ativo !== false).map((b: any) => ({
          id: b.id, nome: b.nome, taxa: Number(b.taxa ?? 0), ativo: b.ativo ?? true,
        })));

        // Preload products for this store
        await preloadProducts(foundStoreId);

        setLoadingStore(false);
      } catch (err) {
        console.error("[PedidoPage] resolve slug error:", err);
        setStoreNotFound(true);
        setLoadingStore(false);
      }
    };
    resolve();
  }, [slug]);

  // ── Loading state ──
  if (loadingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  // ── Store not found ──
  if (storeNotFound || !storeConfig || !storeId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-foreground">Restaurante não encontrado</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            O link que você acessou não corresponde a nenhum restaurante cadastrado. Verifique o endereço e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return <PedidoPageInner storeId={storeId} config={storeConfig} bairros={bairrosDisponiveis} />;
}

// ═══════════════════════════════════════════
// INNER COMPONENT (with resolved store)
// ═══════════════════════════════════════════

function PedidoPageInner({ storeId, config, bairros }: {
  storeId: string;
  config: {
    nome: string; logo: string; telefone: string;
    deliveryAtivo: boolean; modoIdentificacao: string;
    taxaEntrega: number; mensagemFechado: string;
    mensagemBoasVindas: string; horarios: HorariosSemana;
    temaCardapio?: string; corPrimaria?: string;
  };
  bairros: Bairro[];
}) {
  const RESTAURANTE_NOME = config.nome;
  const RESTAURANTE_LOGO = config.logo;
  const RESTAURANTE_INITIALS = RESTAURANTE_NOME.slice(0, 2).toUpperCase();
  const isCadastro = config.modoIdentificacao === "cadastro";

  // ── Theme engine ──
  const themeInnerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = themeInnerRef.current;
    if (!el) return;
    // For now delivery only uses preset themes from config
    const themeId = config.temaCardapio || "obsidian";
    const customColor = config.corPrimaria;
    const themeDefault = THEME_MAP[themeId]?.primary;
    applyThemeToElement(el, themeId, customColor && customColor !== themeDefault ? customColor : undefined);
    return () => { if (el) clearThemeFromElement(el); };
  }, [config.temaCardapio, config.corPrimaria]);

  const [etapa, setEtapa] = useState<Etapa>(() => isCadastro ? "login" : "cardapio");

  // Login state
  const [loginTel, setLoginTel] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggedClient, setLoggedClient] = useState<ClienteDelivery | null>(null);

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

  // Registration
  const [regSenha, setRegSenha] = useState("");
  const [regSenhaConfirm, setRegSenhaConfirm] = useState("");

  // Bairros
  const [bairroSelecionadoId, setBairroSelecionadoId] = useState("");
  const [bairroNaoAtendido, setBairroNaoAtendido] = useState(false);

  // Order
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [formaPag, setFormaPag] = useState("pix");
  const [troco, setTroco] = useState("");
  const [numeroPedido, setNumeroPedido] = useState(0);

  const progress = isCadastro ? (etapaProgressCadastro[etapa] ?? 0) : (etapaProgressVisitante[etapa] ?? 0);

  // ── Helper: find/upsert cliente in DB ──
  const findCliente = useCallback(async (query: string): Promise<ClienteDelivery[]> => {
    const norm = query.replace(/\D/g, "");
    let q = supabase.from("clientes_delivery").select("*").eq("store_id", storeId);
    if (norm.length >= 10) {
      q = q.or(`cpf.eq.${norm},telefone.eq.${norm}`);
    } else {
      q = q.ilike("nome", `%${query}%`);
    }
    const { data } = await q.limit(5);
    return (data ?? []).map((r: any) => ({
      id: r.id, nome: r.nome, cpf: r.cpf || "", telefone: r.telefone || "",
      endereco: r.endereco || "", numero: r.numero || "", bairro: r.bairro || "",
      complemento: r.complemento || "", referencia: r.referencia || "",
      senhaHash: r.senha_hash || undefined,
    }));
  }, [storeId]);

  const upsertCliente = useCallback(async (c: Omit<ClienteDelivery, "id"> & { senhaHash?: string }): Promise<ClienteDelivery> => {
    const telNorm = c.telefone.replace(/\D/g, "");
    // Try to find existing
    const { data: existing } = await supabase.from("clientes_delivery")
      .select("id").eq("store_id", storeId).eq("telefone", telNorm).limit(1).maybeSingle();

    const id = existing?.id || crypto.randomUUID();
    await supabase.rpc("rpc_upsert_cliente_delivery", {
      _store_id: storeId,
      _data: {
        nome: c.nome, cpf: c.cpf, telefone: telNorm,
        endereco: c.endereco, numero: c.numero, bairro: c.bairro,
        complemento: c.complemento, referencia: c.referencia,
      } as any,
    });
    return { ...c, id, telefone: telNorm };
  }, [storeId]);

  // ── Login handler ──
  const handleLogin = useCallback(async () => {
    const telNorm = loginTel.replace(/\D/g, "");
    if (!telNorm) { setLoginError("Informe o telefone"); return; }
    if (!loginSenha) { setLoginError("Informe a senha"); return; }
    const results = await findCliente(telNorm);
    const found = results.find((c) => c.telefone.replace(/\D/g, "") === telNorm);
    if (!found || !found.senhaHash) { setLoginError("Telefone ou senha incorretos"); return; }
    const expectedHash = btoa(telNorm + ":" + loginSenha);
    if (found.senhaHash !== expectedHash) { setLoginError("Telefone ou senha incorretos"); return; }
    setLoggedClient(found);
    setNome(found.nome); setTelefone(found.telefone); setCpf(found.cpf);
    setEndereco(found.endereco); setNumero(found.numero); setBairro(found.bairro);
    setComplemento(found.complemento); setReferencia(found.referencia);
    setLoginError(""); setEtapa("cardapio");
    toast.success(`Bem-vindo de volta, ${found.nome}!`);
  }, [loginTel, loginSenha, findCliente]);

  // ── Registration handler ──
  const handleRegistrar = useCallback(async () => {
    if (!nome.trim() || !telefone.trim() || !cpf.trim() || !regSenha) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    if (regSenha !== regSenhaConfirm) { toast.error("Senhas não coincidem"); return; }
    if (regSenha.length < 4) { toast.error("Senha deve ter pelo menos 4 caracteres"); return; }
    const telNorm = telefone.replace(/\D/g, "");
    const senhaHash = btoa(telNorm + ":" + regSenha);
    const cliente = await upsertCliente({
      nome: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(),
      endereco: endereco.trim(), numero: numero.trim(), bairro: bairro.trim(),
      complemento: complemento.trim(), referencia: referencia.trim(), senhaHash,
    });
    setLoggedClient({ ...cliente, senhaHash }); setEtapa("cardapio");
    toast.success("Conta criada com sucesso!");
  }, [nome, telefone, cpf, regSenha, regSenhaConfirm, endereco, numero, bairro, complemento, referencia, upsertCliente]);

  // ── Visitante busca ──
  const handleBuscar = useCallback(async () => {
    if (!busca.trim()) return;
    const results = await findCliente(busca.trim());
    setBuscaFeita(true);
    if (results.length > 0) { setClienteEncontrado(results[0]); setShowForm(false); }
    else { setClienteEncontrado(null); }
  }, [busca, findCliente]);

  const preencherDoCliente = (c: ClienteDelivery) => {
    setNome(c.nome); setTelefone(c.telefone); setCpf(c.cpf);
    setEndereco(c.endereco); setNumero(c.numero); setBairro(c.bairro);
    setComplemento(c.complemento); setReferencia(c.referencia); setCidade("");
  };

  const handleSelecionarCliente = () => {
    if (clienteEncontrado) { preencherDoCliente(clienteEncontrado); setEtapa("confirmacao"); }
  };

  const handleCepChange = async (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted); setCepErro("");
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (data.erro) { setCepErro("CEP não encontrado"); }
        else {
          setEndereco(data.logradouro || "");
          const bairroViaCep = data.bairro || "";
          setBairro(bairroViaCep); setCidade(data.localidade || "");
          if (bairros.length > 0 && bairroViaCep) {
            const norm = normStr(bairroViaCep);
            const match = bairros.find((b) => normStr(b.nome) === norm);
            if (match) { setBairroSelecionadoId(match.id); setBairroNaoAtendido(false); }
            else { setBairroSelecionadoId(""); setBairroNaoAtendido(true); }
          }
        }
      } catch { setCepErro("Erro ao buscar CEP"); }
      finally { setCepLoading(false); }
    }
  };

  const formValido = nome.trim() && telefone.trim() && cpf.trim() && endereco.trim() && numero.trim() && !bairroNaoAtendido;

  const handleSalvarIdentificacao = () => {
    if (!formValido) { toast.error("Preencha todos os campos obrigatórios"); return; }
    setEtapa("confirmacao");
  };

  const handlePedidoConfirmado = (itensPedido: ItemCarrinho[], pv: boolean) => {
    const statusAgora = checkDeliveryAberto(config.horarios);
    if (!statusAgora.aberto) {
      toast.error(`${statusAgora.mensagem}. ${statusAgora.proximoHorario || ""}`);
      return;
    }
    setItens(itensPedido);
    setEtapa(isCadastro ? "confirmacao" : "identificacao");
  };

  const bairroSel = bairros.find((b) => b.id === bairroSelecionadoId);
  const taxaEntrega = bairroSel ? bairroSel.taxa : config.taxaEntrega;
  const totalPedido = itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0) + taxaEntrega;

  const handleConfirmarPedido = async () => {
    const statusAgora = checkDeliveryAberto(config.horarios);
    if (!statusAgora.aberto) {
      toast.error(statusAgora.mensagem + (statusAgora.proximoHorario ? `. ${statusAgora.proximoHorario}` : ""));
      return;
    }
    const cliente = await upsertCliente({
      nome: nome.trim(), cpf: cpf.trim(), telefone: telefone.trim(),
      endereco: endereco.trim(), numero: numero.trim(), bairro: bairro.trim(),
      complemento: complemento.trim(), referencia: referencia.trim(),
    });

    // Create order directly in pedidos table
    const now = new Date();
    const criadoEm = now.toLocaleString("pt-BR");
    const criadoEmIso = now.toISOString();

    // Get next order number atomically from DB
    const { data: nextNum, error: rpcError } = await supabase.rpc("next_order_number" as any, { _store_id: storeId });
    if (rpcError) {
      console.error("[PedidoPage] next_order_number error:", rpcError);
      toast.error("Erro ao gerar número do pedido");
      return;
    }

    const pedidoRow = {
      id: crypto.randomUUID(),
      store_id: storeId,
      numero_pedido: nextNum,
      itens: itens.map((i) => ({
        uid: i.uid, produtoId: i.produtoId, nome: i.nome,
        precoBase: i.precoBase, quantidade: i.quantidade,
        removidos: i.removidos, adicionais: i.adicionais,
        bebida: i.bebida, tipo: i.tipo, embalagem: i.embalagem,
        observacoes: i.observacoes, precoUnitario: i.precoUnitario,
        gruposEscolhidos: i.gruposEscolhidos, setor: i.setor,
      })),
      total: totalPedido,
      criado_em: criadoEm,
      criado_em_iso: criadoEmIso,
      origem: "delivery",
      cliente_nome: nome.trim(),
      cliente_telefone: telefone.trim(),
      endereco_completo: `${endereco}, ${numero}${complemento ? ` - ${complemento}` : ""}`,
      bairro: bairro.trim(),
      referencia: referencia.trim(),
      forma_pagamento_delivery: formaPag,
      troco_para_quanto: formaPag === "dinheiro" && troco ? parseFloat(troco.replace(",", ".")) : null,
      status_balcao: "aberto",
    };

    const { error } = await supabase.rpc("rpc_insert_pedido" as any, { _data: pedidoRow });
    if (error) {
      console.error("[PedidoPage] insert error:", error);
      toast.error("Erro ao enviar pedido");
      return;
    }

    setNumeroPedido(nextNum);
    setEtapa("sucesso");
    toast.success("Pedido enviado com sucesso!");
  };

  const handleNovoPedido = () => {
    setBusca(""); setClienteEncontrado(null); setBuscaFeita(false); setShowForm(false);
    setNome(""); setTelefone(""); setCpf(""); setCep(""); setEndereco(""); setNumero("");
    setBairro(""); setCidade(""); setComplemento(""); setReferencia("");
    setBairroSelecionadoId(""); setBairroNaoAtendido(false); setItens([]);
    setFormaPag("pix"); setTroco("");
    setLoginTel(""); setLoginSenha(""); setLoginError(""); setLoggedClient(null);
    setRegSenha(""); setRegSenhaConfirm("");
    setEtapa(isCadastro ? "login" : "cardapio");
  };

  // ── Delivery desativado ──
  if (!config.deliveryAtivo) {
    return (
      <div ref={themeInnerRef}>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-6">
        {RESTAURANTE_LOGO ? (
          <img src={RESTAURANTE_LOGO} alt={RESTAURANTE_NOME} className="w-20 h-20 rounded-2xl object-cover border border-border" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center text-2xl font-black text-foreground">{RESTAURANTE_INITIALS}</div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{RESTAURANTE_NOME}</p>
          <h1 className="text-3xl font-black text-foreground">Delivery indisponível</h1>
          <p className="text-sm text-muted-foreground">{config.mensagemFechado || "Voltamos em breve!"}</p>
        </div>
      </div>
      </div>
    );
  }

  // ── Horário de funcionamento ──
  const statusHorario = checkDeliveryAberto(config.horarios);

  if (!statusHorario.aberto) {
    const diaAtual = (["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const)[new Date().getDay()];
    const horarioDia = config.horarios[diaAtual];
    const horarioDiaTexto = horarioDia.ativo ? `${horarioDia.abertura} — ${horarioDia.fechamento}` : "";

    return (
      <div ref={themeInnerRef}>
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-6">
        {RESTAURANTE_LOGO ? (
          <img src={RESTAURANTE_LOGO} alt={RESTAURANTE_NOME} className="w-20 h-20 rounded-2xl object-cover border border-border" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-secondary border border-border flex items-center justify-center text-2xl font-black">{RESTAURANTE_INITIALS}</div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{RESTAURANTE_NOME}</p>
          <h1 className="text-3xl font-black">{statusHorario.mensagem}</h1>
          {statusHorario.proximoHorario && <p className="text-sm text-muted-foreground">{statusHorario.proximoHorario}</p>}
        </div>
        {horarioDiaTexto && statusHorario.horasRestantes && statusHorario.horasRestantes > 0 && (
          <div className="rounded-2xl border border-border bg-card px-8 py-5 space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Horário de hoje</p>
            <p className="text-2xl font-black">{horarioDiaTexto}</p>
            <p className="text-xs text-primary font-bold">Em aproximadamente {statusHorario.horasRestantes}h</p>
          </div>
        )}
        {config.telefone && (
          <button
            onClick={() => window.open(`https://wa.me/55${config.telefone}`, "_blank")}
            className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-6 py-3.5 text-white font-black text-base active:scale-95 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.11 1.522 5.836L.057 23.99l6.304-1.654A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.366l-.358-.213-3.722.976.994-3.636-.234-.373A9.818 9.818 0 1112 21.818z" />
            </svg>
            Falar no WhatsApp
          </button>
        )}
        <p className="text-xs text-muted-foreground/60">Delivery indisponível fora do horário de funcionamento</p>
      </div>
      </div>
    );
  }

  // ── Cardápio ──
  if (etapa === "cardapio") {
    return (
      <div className="min-h-screen bg-background">
        <PedidoFlow
          modo="delivery"
          clienteNome={nome || loggedClient?.nome || ""}
          onPedidoConfirmado={handlePedidoConfirmado}
          onBack={() => setEtapa(isCadastro ? "login" : "identificacao")}
          deviceStoreId={storeId}
        />
      </div>
    );
  }

  return (
    <div ref={themeInnerRef}>
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        {RESTAURANTE_LOGO ? (
          <img src={RESTAURANTE_LOGO} alt={RESTAURANTE_NOME} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">{RESTAURANTE_INITIALS}</div>
        )}
        <span className="font-semibold text-lg">{RESTAURANTE_NOME}</span>
      </div>

      {/* Progress */}
      <div className="shrink-0 px-4 py-3 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{etapaLabel[etapa]}</span><span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {/* ═══ LOGIN ═══ */}
        {etapa === "login" && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <div className="text-center space-y-1">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold">Faça login</h1>
              <p className="text-sm text-muted-foreground">Entre com seu telefone e senha</p>
            </div>
            <div className="space-y-3">
              <Input placeholder="Telefone" value={loginTel} onChange={(e) => setLoginTel(e.target.value)} inputMode="tel" />
              <Input type="password" placeholder="Senha" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              {loginError && <p className="text-xs text-destructive font-semibold">{loginError}</p>}
              <Button className="w-full" size="lg" onClick={handleLogin}>Entrar</Button>
            </div>
            <div className="text-center">
              <Button variant="link" onClick={() => setEtapa("cadastro")}>Não tenho cadastro</Button>
            </div>
          </div>
        )}

        {/* ═══ CADASTRO ═══ */}
        {etapa === "cadastro" && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setEtapa("login")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao login
            </Button>
            <h1 className="text-xl font-bold">Criar conta</h1>
            <div className="space-y-3">
              <Input placeholder="Nome completo *" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Input placeholder="Telefone *" value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" />
              <Input placeholder="CPF *" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              <Input type="password" placeholder="Criar senha *" value={regSenha} onChange={(e) => setRegSenha(e.target.value)} />
              <Input type="password" placeholder="Confirmar senha *" value={regSenhaConfirm} onChange={(e) => setRegSenhaConfirm(e.target.value)} />
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
              {cidade && <Input placeholder="Cidade" value={cidade} readOnly className="bg-muted" />}
              <Input placeholder="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
              <Input placeholder="Referência" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              <Button className="w-full" size="lg" onClick={handleRegistrar}
                disabled={!nome.trim() || !telefone.trim() || !cpf.trim() || !regSenha || regSenha !== regSenhaConfirm}>
                Criar conta e ver cardápio
              </Button>
            </div>
          </div>
        )}

        {/* ═══ IDENTIFICAÇÃO ═══ */}
        {etapa === "identificacao" && (
          <div className="max-w-md mx-auto space-y-6 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setEtapa("cardapio")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
            </Button>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold">Seus dados</h1>
              <p className="text-sm text-muted-foreground">Informe seu CPF ou telefone para buscar seus dados</p>
            </div>
            <div className="flex gap-2">
              <Input placeholder="CPF ou Telefone" value={busca} onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBuscar()} />
              <Button onClick={handleBuscar} size="icon" variant="secondary"><Search className="w-4 h-4" /></Button>
            </div>
            {buscaFeita && clienteEncontrado && !showForm && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold text-sm">Bem-vindo de volta, {clienteEncontrado.nome}!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Seus dados foram preenchidos automaticamente.</p>
                  <div>
                    <p className="font-semibold">{clienteEncontrado.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {clienteEncontrado.endereco}, {clienteEncontrado.numero} — {clienteEncontrado.bairro}
                    </p>
                    <p className="text-sm text-muted-foreground">{clienteEncontrado.telefone}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleSelecionarCliente}>Sou eu, continuar</Button>
                    <Button variant="outline" className="flex-1" onClick={() => { setClienteEncontrado(null); setShowForm(true); }}>Não sou eu</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {buscaFeita && !clienteEncontrado && !showForm && (
              <Card>
                <CardContent className="p-4 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Cliente não encontrado</p>
                  <Button onClick={() => setShowForm(true)}>Preencher dados</Button>
                </CardContent>
              </Card>
            )}
            {(showForm || !buscaFeita) && (
              <div className="space-y-3">
                {!buscaFeita && <p className="text-xs text-muted-foreground text-center">Ou preencha seus dados abaixo</p>}
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
                  <Input placeholder="Bairro" value={bairro} onChange={(e) => {
                    setBairro(e.target.value);
                    if (bairros.length > 0 && e.target.value.trim()) {
                      const norm = normStr(e.target.value);
                      const match = bairros.find((b) => normStr(b.nome) === norm);
                      if (match) { setBairroSelecionadoId(match.id); setBairroNaoAtendido(false); }
                      else { setBairroSelecionadoId(""); setBairroNaoAtendido(true); }
                    } else { setBairroSelecionadoId(""); setBairroNaoAtendido(false); }
                  }} readOnly={!!bairroSelecionadoId} className={bairroSelecionadoId ? "bg-muted" : ""} />
                </div>
                {bairros.length > 0 && bairro.trim() && (
                  bairroSelecionadoId ? (
                    <p className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>
                      ✓ Taxa de entrega: R$ {(bairros.find((b) => b.id === bairroSelecionadoId)?.taxa ?? 0).toFixed(2).replace(".", ",")}
                    </p>
                  ) : bairroNaoAtendido ? (
                    <p className="text-xs font-semibold text-orange-500">
                      ⚠ Bairro não atendido — entre em contato para verificar disponibilidade
                    </p>
                  ) : null
                )}
                {cidade && <Input placeholder="Cidade" value={cidade} readOnly className="bg-muted" />}
                <Input placeholder="Complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                <Input placeholder="Referência" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                <Button className="w-full" disabled={!formValido} onClick={handleSalvarIdentificacao}>Continuar para confirmação</Button>
              </div>
            )}
          </div>
        )}

        {/* ═══ CONFIRMAÇÃO ═══ */}
        {etapa === "confirmacao" && (
          <ConfirmacaoEtapa
            nome={nome} endereco={endereco} numero={numero} complemento={complemento} bairro={bairro}
            itens={itens} taxaEntrega={taxaEntrega} totalPedido={totalPedido}
            formaPag={formaPag} setFormaPag={setFormaPag} troco={troco} setTroco={setTroco}
            onVoltar={() => setEtapa("cardapio")} onConfirmar={handleConfirmarPedido}
            editEndereco={isCadastro ? { endereco, numero, complemento, bairro, setEndereco, setNumero, setComplemento, setBairro } : null}
          />
        )}

        {/* ═══ SUCESSO ═══ */}
        {etapa === "sucesso" && (
          <div className="max-w-md mx-auto text-center space-y-6 pt-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-3xl font-black">Pedido #{numeroPedido} recebido!</h2>
            <p className="text-lg text-muted-foreground">🎉 Seu pedido foi registrado com sucesso</p>
            <p className="text-sm text-muted-foreground">Aguarde, seu pedido está sendo preparado</p>
            <p className="text-sm text-muted-foreground">O restaurante já recebeu seu pedido automaticamente. Obrigado! 😊</p>
            <Button size="lg" onClick={handleNovoPedido}>Fazer novo pedido</Button>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
