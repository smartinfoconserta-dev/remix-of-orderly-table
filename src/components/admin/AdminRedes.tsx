import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SistemaConfig } from "@/lib/adminStorage";

interface AdminRedesProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  onSave: () => void;
}

const AdminRedes = ({ sistemaConfig, setSistemaConfig, onSave }: AdminRedesProps) => {
  return (
    <div className="space-y-4 max-w-lg">
      {/* WhatsApp */}
      <div className="surface-card space-y-5 rounded-2xl p-6">
        <p className="text-base font-bold text-muted-foreground">WhatsApp</p>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Telefone WhatsApp do restaurante</label>
          <Input className="h-11 rounded-xl" value={sistemaConfig.telefoneRestaurante || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, telefoneRestaurante: e.target.value.replace(/\D/g, "") }))} placeholder="11999999999 (só números com DDD)" inputMode="tel" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Mensagem de boas-vindas WhatsApp</label>
          <Textarea value={sistemaConfig.mensagemBoasVindas ?? `Olá! Bem-vindo ao ${sistemaConfig.nomeRestaurante}! 😊 Clique para fazer seu pedido:`} onChange={(e) => setSistemaConfig((c) => ({ ...c, mensagemBoasVindas: e.target.value }))} rows={3} />
        </div>
      </div>

      {/* Instagram */}
      <div className="surface-card space-y-4 rounded-2xl p-6">
        <p className="text-base font-bold text-muted-foreground">Instagram</p>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">URL do Instagram</label>
          <Input className="h-11 rounded-xl" value={sistemaConfig.instagramUrl || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, instagramUrl: e.target.value }))} placeholder="https://instagram.com/seurestaurante" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Imagem de fundo</label>
          <div className="flex items-center gap-3">
            {sistemaConfig.instagramBg && (<img src={sistemaConfig.instagramBg} alt="bg instagram" className="h-12 w-20 rounded-lg border border-border object-cover" />)}
            <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent/40">
              {sistemaConfig.instagramBg ? "Trocar" : "Upload"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setSistemaConfig((c) => ({ ...c, instagramBg: reader.result as string })); reader.readAsDataURL(file); }} />
            </label>
            {sistemaConfig.instagramBg && (<Button variant="ghost" size="sm" className="h-7 px-2 text-sm text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, instagramBg: "" }))}><Trash2 className="mr-1 h-3 w-3" /> Remover</Button>)}
          </div>
        </div>
        {sistemaConfig.instagramUrl && (
          <div className="text-center space-y-1">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sistemaConfig.instagramUrl)}`} alt="QR Instagram" className="h-16 w-16 rounded-lg border border-border" />
          </div>
        )}
      </div>

      {/* Wi-Fi */}
      <div className="surface-card space-y-4 rounded-2xl p-6">
        <p className="text-base font-bold text-muted-foreground">Wi-Fi</p>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Senha do Wi-Fi</label>
          <Input className="h-11 rounded-xl" value={sistemaConfig.senhaWifi || ""} onChange={(e) => setSistemaConfig((c) => ({ ...c, senhaWifi: e.target.value }))} placeholder="Senha da rede Wi-Fi" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-muted-foreground">Imagem de fundo</label>
          <div className="flex items-center gap-3">
            {sistemaConfig.wifiBg && (<img src={sistemaConfig.wifiBg} alt="bg wifi" className="h-12 w-20 rounded-lg border border-border object-cover" />)}
            <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent/40">
              {sistemaConfig.wifiBg ? "Trocar" : "Upload"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setSistemaConfig((c) => ({ ...c, wifiBg: reader.result as string })); reader.readAsDataURL(file); }} />
            </label>
            {sistemaConfig.wifiBg && (<Button variant="ghost" size="sm" className="h-7 px-2 text-sm text-destructive" onClick={() => setSistemaConfig((c) => ({ ...c, wifiBg: "" }))}><Trash2 className="mr-1 h-3 w-3" /> Remover</Button>)}
          </div>
        </div>
        {sistemaConfig.senhaWifi && (
          <div className="text-center space-y-1">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`WIFI:T:WPA;S:${sistemaConfig.nomeRestaurante};P:${sistemaConfig.senhaWifi};;`)}`} alt="QR Wi-Fi" className="h-16 w-16 rounded-lg border border-border" />
          </div>
        )}
      </div>

      <Button onClick={onSave} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
    </div>
  );
};

export default AdminRedes;
