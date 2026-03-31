import { useEffect, useMemo, useRef, useState } from "react";
import type { Categoria } from "@/data/menuData";
import CategoryIcon from "@/components/CategoryIcon";

interface Props {
  categorias: Categoria[];
  categoriaAtiva: string;
  onSelect: (id: string) => void;
  paddingClassName?: string;
  totemMode?: boolean;
}

const CategoryTabs = ({
  categorias,
  categoriaAtiva,
  onSelect,
  paddingClassName = "px-4 py-3",
  totemMode = false,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  const parentCats = useMemo(() => categorias.filter((c) => !c.parentId), [categorias]);
  const childrenOf = useMemo(() => {
    const map = new Map<string, Categoria[]>();
    for (const c of categorias) {
      if (c.parentId) {
        const arr = map.get(c.parentId) || [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [categorias]);

  // Auto-expand parent when active category is a child
  useEffect(() => {
    const activeCat = categorias.find((c) => c.id === categoriaAtiva);
    if (activeCat?.parentId) {
      setExpandedParent(activeCat.parentId);
    }
  }, [categoriaAtiva, categorias]);

  useEffect(() => {
    buttonRefs.current[categoriaAtiva]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [categoriaAtiva]);

  const handleParentClick = (parentId: string) => {
    const children = childrenOf.get(parentId);
    if (children && children.length > 0) {
      // Toggle expand/collapse; if expanding, select first child
      if (expandedParent === parentId) {
        setExpandedParent(null);
        onSelect(parentId);
      } else {
        setExpandedParent(parentId);
        onSelect(children[0].id);
      }
    } else {
      setExpandedParent(null);
      onSelect(parentId);
    }
  };

  const isParentActive = (parentId: string) => {
    if (categoriaAtiva === parentId) return true;
    const children = childrenOf.get(parentId);
    return children?.some((c) => c.id === categoriaAtiva) ?? false;
  };

  const activeChildren = expandedParent ? (childrenOf.get(expandedParent) ?? []) : [];

  return (
    <div className="relative w-full overflow-hidden space-y-0">
      {!totemMode && <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />}
      {!totemMode && <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />}
      <div
        ref={scrollRef}
        className={`scrollbar-hide flex w-full touch-pan-x flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth ${paddingClassName}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {parentCats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            ref={(el) => {
              buttonRefs.current[cat.id] = el;
            }}
            onClick={() => handleParentClick(cat.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300 ease-in-out active:scale-95 will-change-transform ${
              totemMode
                ? isParentActive(cat.id)
                  ? "border-[#FF6B00]/40 bg-[#FF6B00] text-white shadow-md"
                  : "border-gray-200 bg-gray-100 text-[#1A1A1A] hover:bg-gray-200"
                : isParentActive(cat.id)
                  ? "border-primary/40 bg-primary/15 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_18px_hsl(var(--primary)/0.20)]"
                  : "border-transparent bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <CategoryIcon
                name={cat.icone}
              className={`h-4 w-4 transition-opacity duration-300 ${isParentActive(cat.id) ? "opacity-100" : "opacity-70"}`}
            />
            <span>{cat.nome}</span>
            {(childrenOf.get(cat.id)?.length ?? 0) > 0 && (
              <span className={`text-[10px] transition-transform duration-200 ${expandedParent === cat.id ? "rotate-180" : ""}`}>▾</span>
            )}
          </button>
        ))}
      </div>
      {activeChildren.length > 0 && (
        <div
          className={`scrollbar-hide flex w-full touch-pan-x flex-row flex-nowrap items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth ${paddingClassName} pt-1`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        >
          {activeChildren.map((child) => (
            <button
              key={child.id}
              type="button"
              ref={(el) => { buttonRefs.current[child.id] = el; }}
              onClick={() => onSelect(child.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                totemMode
                  ? categoriaAtiva === child.id
                    ? "border-[#FF6B00]/30 bg-[#FF6B00]/80 text-white"
                    : "border-gray-200 bg-gray-50 text-[#1A1A1A]/70 hover:bg-gray-100"
                  : categoriaAtiva === child.id
                    ? "border-primary/30 bg-primary/10 text-primary font-bold"
                    : "border-transparent bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              }`}
            >
              <CategoryIcon name={child.icone} className="h-3.5 w-3.5" />
              <span>{child.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryTabs;
