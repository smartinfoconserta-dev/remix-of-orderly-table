import { Plus, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SistemaConfig } from "@/lib/adminStorage";
import { toast } from "sonner";

interface AdminBannersProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  onSave: () => void;
}

const AdminBanners = ({ sistemaConfig, setSistemaConfig, onSave }: AdminBannersProps) => {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="space-y-3">
        <p className="text-base font-bold text-muted-foreground">Banners promocionais</p>
        {(sistemaConfig.banners ?? []).map((banner, idx) => (
          <div key={banner.id} className="surface-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">Banner {idx + 1}</span>
              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).filter((b) => b.id !== banner.id) }))}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Input className="h-11 rounded-xl" value={banner.titulo} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, titulo: e.target.value } : b) }))} placeholder="Título" />
            <Input className="h-11 rounded-xl" value={banner.subtitulo} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, subtitulo: e.target.value } : b) }))} placeholder="Subtítulo" />
            <div className="flex gap-2">
              <Input className="h-11 rounded-xl w-1/2" value={banner.preco} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, preco: e.target.value } : b) }))} placeholder="Preço (opcional)" />
              <Input className="h-11 rounded-xl flex-1" value={banner.imagemUrl} onChange={(e) => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemUrl: e.target.value } : b) }))} placeholder="URL da imagem" />
            </div>
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 px-4 py-5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <Upload className="h-4 w-4" />Upload imagem do banner
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return;
                if (file.size > 2 * 1024 * 1024) { toast.error("Imagem muito grande (máx 2MB)"); return; }
                const reader = new FileReader();
                reader.onload = () => setSistemaConfig((c) => ({ ...c, banners: (c.banners ?? []).map((b) => b.id === banner.id ? { ...b, imagemBase64: reader.result as string } : b) }));
                reader.readAsDataURL(file); e.target.value = "";
              }} />
            </label>
            {(banner.imagemBase64 || banner.imagemUrl) && (<img src={banner.imagemBase64 || banner.imagemUrl} alt="Preview" className="h-20 w-full rounded-xl border border-border object-cover" />)}
          </div>
        ))}
        {(sistemaConfig.banners ?? []).length < 5 && (
          <Button variant="outline" className="w-full rounded-xl" onClick={() => setSistemaConfig((c) => ({ ...c, banners: [...(c.banners ?? []), { id: `banner-${Date.now()}`, titulo: "", subtitulo: "", preco: "", imagemUrl: "" }] }))}><Plus className="h-4 w-4 mr-1" /> Adicionar banner</Button>
        )}
      </div>
      <Button onClick={onSave} className="rounded-xl font-black w-full mt-4"><Save className="mr-1 h-4 w-4" /> Salvar</Button>
    </div>
  );
};

export default AdminBanners;
