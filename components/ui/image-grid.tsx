"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGridProps {
  urls: string[];
}

export function ImageGrid({ urls }: ImageGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i - 1 + urls.length) % urls.length)),
    [urls.length],
  );
  const next = useCallback(
    () => setLightboxIndex((i) => (i === null ? null : (i + 1) % urls.length)),
    [urls.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, close, prev, next]);

  if (!urls || urls.length === 0) return null;

  const count = Math.min(urls.length, 3);
  const visible = urls.slice(0, count);

  const gridClass =
    count === 1
      ? "grid grid-cols-1"
      : count === 2
        ? "grid grid-cols-2 gap-1"
        : "grid grid-cols-[2fr_1fr] grid-rows-2 gap-1";

  return (
    <>
      <div className={`${gridClass} mt-3 overflow-hidden rounded-lg`} style={{ maxHeight: "480px" }}>
        {visible.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className={`group relative overflow-hidden bg-muted ${
              count === 3 && i === 0 ? "row-span-2" : ""
            }`}
            style={{
              aspectRatio: count === 1 ? "16/9" : count === 3 && i === 0 ? "auto" : "1/1",
            }}
          >
            <img
              src={url}
              alt={`Imagen ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={close}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image */}
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={urls[lightboxIndex]}
              alt={`Imagen ${lightboxIndex + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
          </div>

          {/* Navigation */}
          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
                {lightboxIndex + 1} / {urls.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
