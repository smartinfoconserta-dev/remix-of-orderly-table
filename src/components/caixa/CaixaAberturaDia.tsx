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

const QUICK_AMOUNTS = [50, 100, 200, 300];

const CaixaAberturaDia = ({
  caixaTitle, currentOperator, fundoTrocoInput, setFundoTrocoInput,
  onAbrirCaixa, onLogout,
}: CaixaAberturaDiaProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedAmount = QUICK_AMOUNTS.find((v) => String(v) === fundoTrocoInput.trim());

  return (
    <div className="min-h-svh flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 shrink-0 md:px-6">
        <h1 className="text-lg font-bold tracking-tight text-foreground truncate flex-1 md:text-xl">
          {caixaTitle}
        </h1>
        <Button variant="ghost" onClick={onLogout} className="gap-2 rounded-xl font-bold h-9 px-3 text-sm text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </header>

      {/* Centered card */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            {/* Date/time bar */}
            <div className="border-b border-border bg-secondary/30 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-semibold">{getDayOfWeek(now)}, {formatDateFull(now)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-bold tabular-nums">{formatTime(now)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Caixa fechado — aguardando abertura</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-8 space-y-6">
              {/* Icon + title */}
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Wallet className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black text-foreground">Abertura de Caixa</h2>
                <p className="text-sm text-muted-foreground">
                  Operador: <span className="font-bold text-foreground">{currentOperator.nome}</span>
                </p>
              </div>

              {/* Fundo de troco */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground">Fundo de troco (R$)</label>
                {fundoTrocoInput && selectedAmount === undefined && (
                  <p className="text-[10px] text-muted-foreground -mt-1">Sugestão do turno anterior</p>
                )}
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={fundoTrocoInput}
                  onChange={(e) => setFundoTrocoInput(e.target.value)}
                  className="text-center text-3xl font-black h-16 rounded-xl border-2 border-border focus:border-primary"
                  onKeyDown={(e) => { if (e.key === "Enter") onAbrirCaixa(); }}
                />

                {/* Quick amount buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((v) => {
                    const isSelected = selectedAmount === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setFundoTrocoInput(String(v))}
                        className={`rounded-xl border-2 py-2.5 text-sm font-black transition-all ${
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-900/40 text-emerald-300 shadow-[0_0_10px_hsla(142,50%,40%,0.15)]"
                            : "border-border bg-secondary text-foreground hover:bg-secondary/80 hover:border-muted-foreground/30"
                        }`}
                      >
                        R$ {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Open button */}
              <Button
                onClick={onAbrirCaixa}
                className="w-full h-14 rounded-xl text-lg font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_20px_hsla(142,60%,40%,0.2)]"
              >
                <Check className="h-5 w-5" />
                Abrir Caixa
              </Button>

              <p className="text-center text-[10px] text-muted-foreground">
                Conte o dinheiro na gaveta e informe o valor inicial.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CaixaAberturaDia;
