import { Palette } from "lucide-react";
import type { SistemaConfig } from "@/lib/adminStorage";

interface AdminTemasProps {
  sistemaConfig: SistemaConfig;
  setSistemaConfig: React.Dispatch<React.SetStateAction<SistemaConfig>>;
  storeId: string | null;
  onSave: () => void;
}

const AdminTemas = ({ sistemaConfig, setSistemaConfig, storeId, onSave }: AdminTemasProps) => {
  return (
    <div className="space-y-4 max-w-lg">
      <div className="surface-card rounded-2xl p-8 text-center space-y-4">
        <Palette className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-base font-bold text-foreground">Em breve: temas visuais para o cardápio</p>
        <p className="text-sm text-muted-foreground">Personalize cores, fontes e estilos do cardápio digital do seu restaurante.</p>
      </div>
    </div>
  );
};

export default AdminTemas;
