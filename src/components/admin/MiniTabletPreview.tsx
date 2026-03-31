const MiniTabletPreview = ({ bg, bgGradient, surface, text, muted, primary, sidebar, size = "sm" }: {
  bg: string; bgGradient?: string; surface: string; text: string; muted: string; primary: string; sidebar: string; size?: "sm" | "lg";
}) => {
  const w = size === "lg" ? "w-[380px]" : "w-full";
  const h = size === "lg" ? "h-[240px]" : "h-[120px]";
  return (
    <div className={`${w} ${h} rounded-xl border-[3px] border-zinc-600 overflow-hidden flex shadow-lg`} style={{ background: bgGradient || bg }}>
      <div className="w-[18%] flex flex-col gap-1 p-1.5 pt-3" style={{ backgroundColor: sidebar }}>
        <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: primary, opacity: 0.9 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
        <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.3 }} />
      </div>
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="h-2 w-8 rounded-full" style={{ backgroundColor: text, opacity: 0.7 }} />
          <div className="flex-1" />
          <div className="h-2 w-4 rounded" style={{ backgroundColor: primary, opacity: 0.5 }} />
        </div>
        <div className="h-[35%] rounded-md" style={{ background: `linear-gradient(135deg, ${primary}44, ${primary}22)`, border: `1px solid ${primary}33` }} />
        <div className="flex gap-1 flex-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex-1 rounded overflow-hidden" style={{ backgroundColor: surface, border: `1px solid ${muted}22` }}>
              <div className="h-[55%]" style={{ backgroundColor: muted, opacity: 0.15 }} />
              <div className="p-0.5">
                <div className="h-1 w-3/4 rounded-full mt-0.5" style={{ backgroundColor: text, opacity: 0.5 }} />
                <div className="h-1 w-1/2 rounded-full mt-0.5" style={{ backgroundColor: primary, opacity: 0.7 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MiniTabletPreview;
