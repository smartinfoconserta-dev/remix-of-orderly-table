import { User } from "lucide-react";

interface Props {
  logoBase64: string;
  nomeRestaurante: string;
  clienteNome: string;
  setClienteNome: (v: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const TotemNameScreen = ({ logoBase64, nomeRestaurante, clienteNome, setClienteNome, onConfirm, onBack }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
    <div className="flex flex-col items-center gap-4 text-center">
      {logoBase64 && (
        <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
      )}
      <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
        <User className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Qual é o seu nome?</h1>
      <p className="text-base font-medium" style={{ color: "#666" }}>
        Vamos chamar você quando o pedido estiver pronto
      </p>
    </div>

    <div className="w-full max-w-md space-y-4">
      <input
        type="text"
        value={clienteNome}
        onChange={(e) => setClienteNome(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
        placeholder="Digite seu nome..."
        autoFocus
        className="w-full h-16 text-2xl font-bold text-center rounded-2xl border-2 outline-none transition-colors"
        style={{
          borderColor: clienteNome.trim() ? "#FF6B00" : "#E0E0E0",
          background: clienteNome.trim() ? "#FFF8F0" : "#FAFAFA",
          color: "#1A1A1A",
        }}
      />

      <button
        onClick={onConfirm}
        disabled={!clienteNome.trim()}
        className="w-full h-16 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
        style={{ background: "#FF6B00" }}
      >
        Continuar →
      </button>
    </div>

    <button
      onClick={onBack}
      className="mt-2 text-sm font-bold underline"
      style={{ color: "#999" }}
    >
      ← Voltar ao cardápio
    </button>
  </div>
);

export default TotemNameScreen;
