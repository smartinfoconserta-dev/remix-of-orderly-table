import { useState, useEffect } from "react";
import { Check, Clock, LogOut, Wallet, Calendar } from "lucide-react";
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

const pad = (n: number) => String(n).padStart(2, "0");

const formatDateFull = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const formatTime = (d: Date) =>
  `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

const getDayOfWeek = (d: Date) => {
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return days[d.getDay()];
};

const CaixaAberturaDia = ({
  caixaTitle, currentOperator, fundoTrocoInput, setFundoTrocoInput,
  onAbrirCaixa, onLogout,
}: CaixaAberturaDiaProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
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
          {/* Date/Time header */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-semibold">{getDayOfWeek(now)}, {formatDateFull(now)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-bold tabular-nums">{formatTime(now)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Caixa fechado — aguardando abertura</span>
            </div>
          </div>

          {/* Main card */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Abertura de Caixa</h2>
            <p className="text-sm text-muted-foreground">
              Operador: <span className="font-bold text-foreground">{currentOperator.nome}</span>
            </p>
            {fundoTrocoInput ? (
              <p className="text-xs text-muted-foreground">
                Valor sugerido do turno anterior carregado. Corrija se necessário.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Conte o dinheiro na gaveta e informe o valor inicial.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-foreground">Fundo de troco (R$)</label>
            {fundoTrocoInput && (
              <p className="text-[10px] text-muted-foreground -mt-1">Sugestão do turno anterior</p>
            )}
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
                  onClick={() => setFundoTrocoInput(String(v))}
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
};

export default CaixaAberturaDia;
