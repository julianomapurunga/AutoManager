import { useEffect, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alt?: string;
}

/**
 * Visualizador de fotos em tela cheia (dialog). Navega por setas na tela,
 * teclas ← → no computador e arrastando para o lado no celular.
 */
export function ImageLightbox({ images, startIndex, open, onOpenChange, alt }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const count = images.length;

  // Reposiciona ao (re)abrir na foto clicada.
  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const go = useCallback(
    (dir: number) => setIndex((i) => (count === 0 ? 0 : (i + dir + count) % count)),
    [count],
  );

  // Navegação por teclado enquanto aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  if (count === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-0 bg-transparent shadow-none p-0 max-w-[100vw] w-auto sm:max-w-5xl [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100 [&>button]:z-10"
      >
        <DialogTitle className="sr-only">Foto {index + 1} de {count}</DialogTitle>
        <div
          className="relative flex items-center justify-center select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={images[index]}
            alt={alt ? `${alt} — foto ${index + 1}` : `Foto ${index + 1}`}
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-md"
            draggable={false}
          />

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Foto anterior"
                className="absolute left-2 sm:-left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Próxima foto"
                className="absolute right-2 sm:-right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 text-white text-xs px-3 py-1">
                {index + 1} / {count}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
