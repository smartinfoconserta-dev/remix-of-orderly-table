import { Check, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CaixaAberturaDiaProps {
  caixaTitle: string;
  currentOperator: { id: string; nome: string; role: string };
  fundoTrocoInput: string;
  setFundoTrocoInput: (v: string) => void;
  onAbrirCaixa: () => void;
  onLogout: () => void;
}

const CaixaAberturaDia = ({
  caixaTitle, currentOperator, fundoTrocoInput, setFundoTrocoInput,
  onAbrirCaixa, onLogout,
}: CaixaAberturaDiaProps) => (
  <div className="min-h-svh flex flex-col bg-background">
    <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 shrink-0 md:px-6">
      <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
        {caixaTitle}
      </h1>
      <Button variant="outline" onClick={onLogout} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </header>
    <main className="flex-1 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Wallet className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Abertura de Caixa</h2>
          {fundoTrocoInput ? (
            <p className="text-sm text-muted-foreground">
              Olá, <span className="font-bold text-foreground">{currentOperator.nome}</span>. Valor do último fechamento carregado automaticamente. Corrija se necessário.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Olá, <span className="font-bold text-foreground">{currentOperator.nome}</span>. Conte o dinheiro na gaveta e informe o valor inicial do caixa.
            </p>
          )}
        </div>
        <div className="space-y-3">
          <label className="text-sm font-bold text-foreground">Fundo de troco (R$)</label>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={fundoTrocoInput}
            onChange={(e) => setFundoTrocoInput(e.target.value)}
            className="text-center text-2xl font-black h-14 rounded-xl"
            onKeyDown={(e) => { if (e.key === "Enter") onAbrirCaixa(); }}
          />
          <div className="flex gap-2">
            {[50, 100, 200, 300].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFundoTrocoInput(String(v).replace(".", ","))}
                className="flex-1 rounded-xl border border-border bg-secondary py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary/80"
              >
                R$ {v}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onAbrirCaixa} className="w-full h-12 rounded-xl text-base font-black gap-2">
          <Check className="h-5 w-5" />
          Abrir Caixa
        </Button>
      </div>
    </main>
  </div>
);

export default CaixaAberturaDia;
