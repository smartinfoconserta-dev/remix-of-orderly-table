import { useEffect, useState, useCallback } from "react";
import { Shield, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getSistemaConfig, saveSistemaConfig, saveSistemaConfigAsync, getSistemaConfigAsync,
  type SistemaConfig,
} from "@/lib/adminStorage";
import { toast } from "sonner";

interface NfceConfig {
  token?: string;
  ambiente?: "homologacao" | "producao";
  inscricaoEstadual?: string;
  serieNfce?: string;
  csc?: string;
  idCsc?: string;
  certificadoBase64?: string;
}

interface Props {
  storeId: string | null;
}

const AdminFiscal = ({ storeId }: Props) => {
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(getSistemaConfig);
  const [nfce, setNfce] = useState<NfceConfig>({});

  useEffect(() => {
    if (!storeId) return;
    getSistemaConfigAsync(storeId).then((c) => {
      setSistemaConfig(c);
      setNfce((c as any).nfceConfig ?? {});
    });
  }, [storeId]);

  const isConfigured = !!(nfce.token && nfce.ambiente);

  const handleSave = useCallback(() => {
    const next = { ...sistemaConfig, nfceConfig: nfce } as SistemaConfig;
    setSistemaConfig(next);
    saveSistemaConfig(next, storeId);
    saveSistemaConfigAsync(next, storeId);
    toast.success("Configuração fiscal salva");
  }, [sistemaConfig, nfce, storeId]);

  return (
    <div className="space-y-5 fade-in max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-foreground">Fiscal</h2>
        <p className="text-sm text-muted-foreground">Configuração de NFC-e para emissão de notas fiscais</p>
      </div>

      {/* Status banner */}
      {isConfigured ? (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 p-4">
          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Configuração fiscal ativa</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Ambiente: {nfce.ambiente === "producao" ? "Produção" : "Homologação (testes)"}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Configuração fiscal pendente</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Preencha os dados abaixo para emitir NFC-e</p>
          </div>
        </div>
      )}

      {/* Focus NFe */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <p className="text-base font-bold text-foreground">Focus NFe</p>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Token da API</label>
          <Input type="password" className="h-11 rounded-xl" value={nfce.token ?? ""} onChange={(e) => setNfce(c => ({ ...c, token: e.target.value }))} placeholder="Cole o token da Focus NFe" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Ambiente</label>
          <div className="flex gap-3">
            {([{ id: "homologacao" as const, label: "Homologação (testes)" }, { id: "producao" as const, label: "Produção" }]).map(opt => (
              <button key={opt.id} type="button" onClick={() => setNfce(c => ({ ...c, ambiente: opt.id }))}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                  nfce.ambiente === opt.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
                }`}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Dados fiscais */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <p className="text-base font-bold text-foreground">Dados Fiscais</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Inscrição Estadual</label>
            <Input className="h-11 rounded-xl" value={nfce.inscricaoEstadual ?? ""} onChange={(e) => setNfce(c => ({ ...c, inscricaoEstadual: e.target.value }))} placeholder="Ex.: 123456789" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">Série NFC-e</label>
            <Input className="h-11 rounded-xl" value={nfce.serieNfce ?? ""} onChange={(e) => setNfce(c => ({ ...c, serieNfce: e.target.value }))} placeholder="Ex.: 1" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">CSC</label>
            <Input className="h-11 rounded-xl" value={nfce.csc ?? ""} onChange={(e) => setNfce(c => ({ ...c, csc: e.target.value }))} placeholder="Código de Segurança do Contribuinte" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground">ID do CSC</label>
            <Input className="h-11 rounded-xl" value={nfce.idCsc ?? ""} onChange={(e) => setNfce(c => ({ ...c, idCsc: e.target.value }))} placeholder="Ex.: 000001" />
          </div>
        </div>
      </div>

      {/* Certificado */}
      <div className="surface-card rounded-2xl p-6 space-y-4">
        <p className="text-base font-bold text-foreground">Certificado Digital</p>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Certificado em Base64</label>
          <Textarea value={nfce.certificadoBase64 ?? ""} onChange={(e) => setNfce(c => ({ ...c, certificadoBase64: e.target.value }))} rows={4} placeholder="Cole o certificado digital em formato Base64..." className="rounded-xl font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Converta seu arquivo .pfx para Base64 antes de colar aqui.</p>
        </div>
      </div>

      <Button onClick={handleSave} className="rounded-xl font-black w-full">
        <Save className="mr-1 h-4 w-4" /> Salvar Configuração Fiscal
      </Button>
    </div>
  );
};

export default AdminFiscal;
