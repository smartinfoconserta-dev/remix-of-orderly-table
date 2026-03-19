import { useCallback, useEffect, useRef, useState } from "react";
import type { Categoria } from "@/data/menuData";
import CategoryIcon from "@/components/CategoryIcon";

interface Props {
  categorias: Categoria[];
  categoriaAtiva: string;
  onSelect: (id: string) => void;
  paddingClassName?: string;
}

const CategoryTabs = ({
  categorias,
  categoriaAtiva,
  onSelect,
  paddingClassName = "px-4 py-3",
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const draggedRef = useRef(false);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [isDragging, setIsDragging] = useState(false);

  const finishDrag = useCallback(() => {
    pointerIdRef.current = null;
    setIsDragging(false);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    buttonRefs.current[categoriaAtiva]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [categoriaAtiva]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;

    const container = scrollRef.current;
    if (!container) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startScrollLeftRef.current = container.scrollLeft;
    draggedRef.current = false;
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || pointerIdRef.current !== event.pointerId) return;

    const deltaX = event.clientX - startXRef.current;
    if (Math.abs(deltaX) > 6) {
      draggedRef.current = true;
    }

    container.scrollLeft = startScrollLeftRef.current - deltaX;
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || pointerIdRef.current !== event.pointerId) return;

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    finishDrag();
  }, [finishDrag]);

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || pointerIdRef.current !== event.pointerId) return;

    if (container.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    finishDrag();
  }, [finishDrag]);

  return (
    <div className="relative w-full overflow-visible">
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
      <div
        ref={scrollRef}
        className={`scrollbar-hide flex w-full touch-pan-x flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth select-none ${paddingClassName} ${
          isDragging ? "cursor-grabbing" : "cursor-default md:cursor-grab"
        }`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {categorias.map((cat) => (
          <button
            key={cat.id}
            ref={(el) => {
              buttonRefs.current[cat.id] = el;
            }}
            onClick={(event) => {
              if (draggedRef.current) {
                event.preventDefault();
                return;
              }

              onSelect(cat.id);
            }}
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
