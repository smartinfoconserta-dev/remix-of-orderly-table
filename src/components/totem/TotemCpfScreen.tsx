import { FileText } from "lucide-react";

interface Props {
  logoBase64: string;
  nomeRestaurante: string;
  clienteCpf: string;
  setClienteCpf: (v: string) => void;
  cpfWanted: boolean | null;
  setCpfWanted: (v: boolean | null) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const formatCpfMask = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const TotemCpfScreen = ({ logoBase64, nomeRestaurante, clienteCpf, setClienteCpf, cpfWanted, setCpfWanted, onConfirm, onBack }: Props) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8" style={{ background: "#FFFFFF" }}>
    <div className="flex flex-col items-center gap-4 text-center">
      {logoBase64 && (
        <img src={logoBase64} alt={nomeRestaurante} className="h-16 w-16 rounded-xl object-contain" />
      )}
      <div className="h-20 w-20 rounded-full flex items-center justify-center" style={{ background: "#FF6B00" }}>
        <FileText className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-3xl font-black" style={{ color: "#1A1A1A" }}>Deseja CPF na nota?</h1>
    </div>

    {cpfWanted === null && (
      <div className="flex gap-4 w-full max-w-md">
        <button
          onClick={() => setCpfWanted(true)}
          className="flex-1 h-20 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98]"
          style={{ background: "#FF6B00" }}
        >
          Sim
        </button>
        <button
          onClick={() => { setCpfWanted(false); onConfirm(); }}
          className="flex-1 h-20 rounded-2xl text-xl font-black transition-all active:scale-[0.98] border-2"
          style={{ borderColor: "#E0E0E0", color: "#666", background: "#FAFAFA" }}
        >
          Não, obrigado
        </button>
      </div>
    )}

    {cpfWanted === true && (
      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          inputMode="numeric"
          value={clienteCpf}
          onChange={(e) => setClienteCpf(formatCpfMask(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter" && clienteCpf.replace(/\D/g, "").length === 11) onConfirm(); }}
          placeholder="000.000.000-00"
          autoFocus
          className="w-full h-16 text-2xl font-bold text-center rounded-2xl border-2 outline-none transition-colors"
          style={{
            borderColor: clienteCpf.replace(/\D/g, "").length === 11 ? "#FF6B00" : "#E0E0E0",
            background: clienteCpf.replace(/\D/g, "").length === 11 ? "#FFF8F0" : "#FAFAFA",
            color: "#1A1A1A",
          }}
        />

        <button
          onClick={onConfirm}
          disabled={clienteCpf.replace(/\D/g, "").length !== 11}
          className="w-full h-16 rounded-2xl text-xl font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "#FF6B00" }}
        >
          Confirmar
        </button>

        <button
          onClick={() => { setClienteCpf(""); setCpfWanted(null); }}
          className="w-full text-sm font-bold underline"
          style={{ color: "#999" }}
        >
          Não quero CPF
        </button>
      </div>
    )}

    <button
      onClick={onBack}
      className="mt-2 text-sm font-bold underline"
      style={{ color: "#999" }}
    >
      ← Voltar
    </button>
  </div>
);

export default TotemCpfScreen;
