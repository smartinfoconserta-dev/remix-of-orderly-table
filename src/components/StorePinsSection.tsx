import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  { value: "garcom", label: "Garçom" },
  { value: "caixa", label: "Caixa" },
  { value: "cozinha", label: "Cozinha" },
  { value: "delivery", label: "Delivery" },
  { value: "totem", label: "Totem" },
  { value: "tv_retirada", label: "TV Retirada" },
  { value: "gerente", label: "Gerente" },
  { value: "motoboy", label: "Motoboy" },
  { value: "administrador", label: "Administrador" },
  { value: "cardapio", label: "Cardápio" },
];

const MODULE_LABELS: Record<string, string> = Object.fromEntries(MODULES.map((m) => [m.value, m.label]));

interface PinRow {
  id: string;
  module: string;
  label: string | null;
  active: boolean | null;
  created_at: string | null;
}

interface StorePinsProps {
  storeId: string;
  storeName: string;
}

const StorePinsSection = ({ storeId, storeName }: StorePinsProps) => {
  const [pins, setPins] = useState<PinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formModule, setFormModule] = useState("garcom");
  const [formPin, setFormPin] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("module_pins")
      .select("id, module, label, active, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    setPins(data ?? []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const handleAdd = async () => {
    if (!/^\d{4,6}$/.test(formPin)) {
      toast.error("O PIN deve ter entre 4 e 6 dígitos");
      return;
    }
    setSaving(true);

    // Hash the PIN server-side using raw SQL via RPC isn't available,
    // so we use a raw insert with crypt()
    const { error } = await supabase.rpc("verify_pin", { input_pin: "test", stored_hash: "test" }).then(() =>
      supabase.from("module_pins").insert({
        store_id: storeId,
        module: formModule,
        pin_hash: formPin, // temporary - we need to hash it
        label: formLabel.trim() || null,
      })
    );

    // The above won't hash properly. Instead, use a raw SQL approach via edge function or direct insert.
    // Since we need crypt(), let's use supabase's sql editor approach via a dedicated insert.
    // We'll use the Supabase client to call a custom RPC or handle it differently.

    // Actually, let's just insert using the REST API and handle hashing via a trigger or function.
    // For now, the cleanest approach: create a small edge function or use raw SQL.
    // Let me use a simpler approach - direct SQL via psql-style, but since we're in the browser,
    // we need an RPC function to create PINs.

    setSaving(false);
    // This approach won't work well. Let me restructure.
  };

  // We need an RPC to insert with hashing. Let me just show the UI and use a proper approach.
  return null;
};

export default StorePinsSection;
