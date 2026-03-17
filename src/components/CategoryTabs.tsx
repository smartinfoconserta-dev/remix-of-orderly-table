import { useCallback, useRef, useState } from "react";
import type { Categoria } from "@/data/menuData";

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
  const [isDragging, setIsDragging] = useState(false);

  const finishDrag = useCallback(() => {
    pointerIdRef.current = null;
    setIsDragging(false);
    window.setTimeout(() => {
      draggedRef.current = false;
    }, 0);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
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
    <div className="relative overflow-visible w-full">
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div
        ref={scrollRef}
        className={`flex flex-row flex-nowrap items-center gap-3 overflow-x-auto overflow-y-hidden whitespace-nowrap w-full scrollbar-hide scroll-smooth select-none ${paddingClassName} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={(event) => {
              if (draggedRef.current) {
                event.preventDefault();
                return;
              }
              onSelect(cat.id);
            }}
            className={`flex-shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-base font-bold transition-all active:scale-95 ${
              categoriaAtiva === cat.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <span className="text-xl">{cat.icone}</span>
            <span>{cat.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryTabs;
