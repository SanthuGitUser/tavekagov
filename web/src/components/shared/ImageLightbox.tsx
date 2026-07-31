import { ChevronLeft, ChevronRight, ExternalLink, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";

export type LightboxImage = {
  id: number;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  file_name: string | null;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  getImageName: (image: LightboxImage) => string;
  enableZoom?: boolean;
};

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  getImageName,
  enableZoom = false,
}: ImageLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const isOpen = index !== null && index >= 0 && index < images.length;
  const image = isOpen ? images[index] : null;
  const hasPrev = isOpen && index > 0;
  const hasNext = isOpen && index < images.length - 1;

  const close = useCallback(() => onIndexChange(null), [onIndexChange]);

  useEffect(() => {
    setZoom(1);
  }, [index]);

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(current + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(current - 0.25, 1));
  }, []);

  const goPrev = useCallback(() => {
    if (!hasPrev || index === null) return;
    onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (!hasNext || index === null) return;
    onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      } else if (event.key === "ArrowLeft") {
        goPrev();
      } else if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, goNext, goPrev, isOpen]);

  if (!isOpen || !image) return null;

  const name = getImageName(image);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={close}
    >
      <div
        className="flex shrink-0 items-center justify-between px-3 py-3 sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm text-white/80">
          {(index ?? 0) + 1} / {images.length}
        </p>
        <div className="flex items-center gap-1">
          {enableZoom ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoom <= 1}
                className="text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="min-w-12 text-center text-xs text-white/70">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/10 hover:text-white disabled:opacity-30"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            className="text-white hover:bg-white/10 hover:text-white"
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-12 sm:px-16"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={!hasPrev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white disabled:opacity-30 sm:left-4"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-7 w-7" />
        </Button>

        <img
          src={image.image_url}
          alt={name}
          className="max-h-[calc(100vh-9rem)] max-w-full object-contain transition-transform duration-200"
          style={enableZoom ? { transform: `scale(${zoom})` } : undefined}
          draggable={false}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goNext}
          disabled={!hasNext}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white disabled:opacity-30 sm:right-4"
          aria-label="Next image"
        >
          <ChevronRight className="h-7 w-7" />
        </Button>
      </div>

      <div
        className="shrink-0 space-y-1 px-4 pb-4 pt-2 text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="truncate text-sm font-medium text-white">{name}</p>
        {image.subtitle && image.file_name && image.subtitle !== image.file_name ? (
          <p className="truncate text-xs text-white/70">{image.subtitle}</p>
        ) : null}
        <a
          href={image.image_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-white/70 underline-offset-4 hover:text-white hover:underline"
        >
          Open original
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>,
    document.body,
  );
}
