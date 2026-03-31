import { Minus, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Produto, GrupoPersonalizacao } from "@/data/menuData";
import type { StepId, PedidoAtual } from "@/types/productModal";
import { formatPrice } from "@/components/caixa/caixaHelpers";

export interface ProductModalStepContentProps {
  step: StepId;
  produto: Produto;
  pedidoAtual: PedidoAtual;
  updatePedidoAtual: <K extends keyof PedidoAtual>(field: K, value: PedidoAtual[K]) => void;
  toggleRemover: (ingrediente: string) => void;
  toggleAdicional: (id: string) => void;
  toggleGrupoOpcao: (grupoId: string, opcaoId: string, obrigatorio: boolean) => void;
  sortedGrupos: GrupoPersonalizacao[];
  tipoOptions: string[];
  bebidaOptions: string[];
  embalagemOptions: string[];
  adicionaisComPreco: Array<{ id: string; nome: string; preco: number }>;
  precoTotal: number;
}

const renderCheckboxCard = ({
  checked,
  onCheckedChange,
  title,
  subtitle,
  price,
  itemKey,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  title: string;
  subtitle: string;
  price?: string;
  itemKey: string;
}) => (
  <label
    key={itemKey}
    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30"
  >
    <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {price ? <span className="text-sm font-black text-primary">{price}</span> : null}
      </div>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  </label>
);

const renderRadioStep = ({
  value,
  onChange,
  options,
  title,
  description,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  title: string;
  description: string;
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-base font-black text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      {options.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/30"
        >
          <RadioGroupItem value={option} className="mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">{option}</p>
          </div>
        </label>
      ))}
    </RadioGroup>
  </div>
);

const renderGrupoStep = (
  grupo: GrupoPersonalizacao,
  pedidoAtual: PedidoAtual,
  toggleGrupoOpcao: (grupoId: string, opcaoId: string, obrigatorio: boolean) => void,
) => {
  const escolhidos = pedidoAtual.gruposEscolhidos[grupo.id] || [];
  const tipo = grupo.tipo || "adicional";

  if (tipo === "escolha") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Escolha uma opção (obrigatório)</p>
        </div>
        <RadioGroup value={escolhidos[0] || ""} onValueChange={(val) => toggleGrupoOpcao(grupo.id, val, true)} className="space-y-3">
          {grupo.opcoes.map((opcao) => {
            const selected = escolhidos[0] === opcao.id;
            return (
              <label
                key={opcao.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                  selected
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <RadioGroupItem value={opcao.id} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-foreground">{opcao.nome}</p>
                    {opcao.preco > 0 && <span className="text-sm font-black text-primary">+ {formatPrice(opcao.preco)}</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (tipo === "retirar") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Marque o que deseja retirar (opcional)</p>
        </div>
        <div className="space-y-3">
          {grupo.opcoes.map((opcao) => {
            const checked = escolhidos.includes(opcao.id);
            return (
              <label
                key={opcao.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                  checked
                    ? "border-destructive/50 bg-destructive/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
                }`}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggleGrupoOpcao(grupo.id, opcao.id, false)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-sm font-bold ${checked ? "text-destructive line-through" : "text-foreground"}`}>
                      {opcao.nome}
                    </p>
                    {checked && <span className="text-sm font-black text-destructive">✕</span>}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // tipo === "adicional"
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-black text-foreground">{grupo.nome}</h3>
        <p className="mt-1 text-sm text-muted-foreground">Selecione os adicionais desejados (opcional)</p>
      </div>
      <div className="space-y-3">
        {grupo.opcoes.map((opcao) => {
          const checked = escolhidos.includes(opcao.id);
          return (
            <label
              key={opcao.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all ${
                checked
                  ? "border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/30"
              }`}
            >
              <Checkbox checked={checked} onCheckedChange={() => toggleGrupoOpcao(grupo.id, opcao.id, false)} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-foreground">{opcao.nome}</p>
                  <div className="flex items-center gap-2">
                    {checked && <span className="text-sm font-black text-emerald-600">✓</span>}
                    {opcao.preco > 0 && <span className="text-sm font-black text-primary">+ {formatPrice(opcao.preco)}</span>}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};

const ProductModalStepContent = ({
  step,
  produto,
  pedidoAtual,
  updatePedidoAtual,
  toggleRemover,
  toggleAdicional,
  toggleGrupoOpcao,
  sortedGrupos,
  tipoOptions,
  bebidaOptions,
  precoTotal,
}: ProductModalStepContentProps) => {
  // Handle grupo steps
  if (typeof step === "string" && step.startsWith("grupo-")) {
    const grupoId = step.replace("grupo-", "");
    const grupo = sortedGrupos.find((g) => g.id === grupoId);
    if (grupo) return renderGrupoStep(grupo, pedidoAtual, toggleGrupoOpcao);
    return null;
  }

  if (step === "adicionais") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">Adicionais do item</h3>
          <p className="mt-1 text-sm text-muted-foreground">Selecione múltiplos complementos antes de seguir.</p>
        </div>
        <div className="space-y-3">
          {produto.adicionais?.map((adicional) =>
            renderCheckboxCard({
              itemKey: adicional.id,
              checked: pedidoAtual.adicionais.includes(adicional.id),
              onCheckedChange: () => toggleAdicional(adicional.id),
              title: adicional.nome,
              subtitle: "Complemento opcional do preparo",
              price: `+ ${formatPrice(adicional.preco)}`,
            }),
          )}
        </div>
      </div>
    );
  }

  if (step === "bebida") {
    return renderRadioStep({
      value: pedidoAtual.bebida ?? "",
      onChange: (value) => updatePedidoAtual("bebida", value),
      options: bebidaOptions,
      title: "Bebida vinculada ao pedido",
      description: "Escolha uma opção única para registrar junto ao item.",
    });
  }

  if (step === "remover") {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-black text-foreground">Remover ingredientes</h3>
          <p className="mt-1 text-sm text-muted-foreground">Marque somente o que deve sair do preparo.</p>
        </div>
        <div className="space-y-3">
          {produto.ingredientesRemoviveis?.map((ingrediente) =>
            renderCheckboxCard({
              itemKey: ingrediente,
              checked: pedidoAtual.removidos.includes(ingrediente),
              onCheckedChange: () => toggleRemover(ingrediente),
              title: ingrediente,
              subtitle: "Será removido deste item",
            }),
          )}
        </div>
      </div>
    );
  }

  if (step === "tipo") {
    return renderRadioStep({
      value: pedidoAtual.tipo ?? "",
      onChange: (value) => updatePedidoAtual("tipo", value),
      options: tipoOptions,
      title: "Tipo do preparo",
      description: "Defina o padrão do item antes de seguir para o fechamento do pedido.",
    });
  }

  if (step === "embalagem") {
    const querLevar = Boolean(pedidoAtual.viagem && pedidoAtual.viagem !== "");
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-black text-foreground">Vai levar para viagem?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deixe desmarcado se for consumir aqui no restaurante.
          </p>
        </div>
        <button
          type="button"
          onClick={() => updatePedidoAtual("viagem", querLevar ? "" : "Para viagem")}
          className={`w-full flex items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.99] ${
            querLevar
              ? "border-amber-500 bg-amber-500/10"
              : "border-border bg-card hover:border-primary/30"
          }`}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
              querLevar ? "border-amber-500 bg-amber-500" : "border-border bg-background"
            }`}
          >
            {querLevar && <span className="text-white text-sm font-black">✓</span>}
          </div>
          <div className="min-w-0">
            <p className={`text-base font-black ${querLevar ? "text-amber-400" : "text-foreground"}`}>
              🛍️ Embalar para viagem
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {querLevar ? "Será embalado para levar" : "Toque para solicitar embalagem"}
            </p>
          </div>
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Pode pular se for comer aqui mesmo.
        </p>
      </div>
    );
  }

  // quantidade step (default)
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-black text-foreground">Quantidade e observações finais</h3>
        <p className="mt-1 text-sm text-muted-foreground">Revise o item antes de adicionar ao carrinho.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => updatePedidoAtual("quantidade", Math.max(1, pedidoAtual.quantidade - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition-transform active:scale-90"
          >
            <Minus className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-3xl font-black text-foreground">{pedidoAtual.quantidade}</p>
            <p className="text-sm text-muted-foreground">unidade(s)</p>
          </div>
          <button
            type="button"
            onClick={() => updatePedidoAtual("quantidade", pedidoAtual.quantidade + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-secondary text-foreground transition-transform active:scale-90"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {!pedidoAtual.observacao && (
          <button
            type="button"
            onClick={() => updatePedidoAtual("observacao", " ")}
            className="text-sm font-bold text-primary hover:underline"
          >
            ➕ Adicionar observação
          </button>
        )}
        {pedidoAtual.observacao && (
          <>
            <Label htmlFor="observacoes-finais" className="text-sm font-bold text-foreground">
              Observação
            </Label>
            <Textarea
              id="observacoes-finais"
              autoFocus
              value={pedidoAtual.observacao.trimStart()}
              onChange={(event) => updatePedidoAtual("observacao", event.target.value)}
              placeholder="Ex.: sem cebola, servir separado, mandar guardanapos..."
              className="min-h-24 resize-none rounded-2xl border-border bg-card"
              maxLength={180}
            />
            <p className="text-right text-xs text-muted-foreground">{pedidoAtual.observacao.trim().length}/180</p>
          </>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Subtotal atual</span>
          <span>{pedidoAtual.quantidade} item(ns)</span>
        </div>
        <p className="mt-2 text-2xl font-black text-foreground">{formatPrice(precoTotal)}</p>
      </div>
    </div>
  );
};

export default ProductModalStepContent;
