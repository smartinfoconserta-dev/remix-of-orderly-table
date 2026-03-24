import { useEffect, useRef } from "react";
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
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    buttonRefs.current[categoriaAtiva]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [categoriaAtiva]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />
      <div
        ref={scrollRef}
        className={`scrollbar-hide flex w-full touch-pan-x flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth ${paddingClassName}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        {categorias.map((cat) => (
          <button
            key={cat.id}
            type="button"
            ref={(el) => {
              buttonRefs.current[cat.id] = el;
            }}
            onClick={() => onSelect(cat.id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-all duration-300 ease-in-out active:scale-95 will-change-transform ${
              categoriaAtiva === cat.id
                ? "border-primary/40 bg-primary/15 text-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_18px_hsl(var(--primary)/0.20)]"
                : "border-transparent bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <CategoryIcon
              name={cat.icone}
              className={`h-4 w-4 transition-opacity duration-300 ${categoriaAtiva === cat.id ? "opacity-100" : "opacity-70"}`}
            />
            <span>{cat.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryTabs;
