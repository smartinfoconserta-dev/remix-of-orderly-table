import { Input } from "@/components/ui/input";

const ColorPickerRow = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-3">
    <div className="relative h-10 w-14 shrink-0">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      <div className="h-full w-full rounded-lg border-2 border-border shadow-sm" style={{ backgroundColor: value }} />
    </div>
    <Input value={value} onChange={(e) => onChange(e.target.value)} className="w-28 font-mono text-sm bg-card text-foreground border-border" maxLength={7} />
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default ColorPickerRow;
