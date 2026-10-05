"use client";

import { Minus, Plus, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null;
  alt?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const STEP = 0.25;

type Point = { x: number; y: number };

/**
 * Full-viewport image lightbox with button / wheel zoom and drag-to-pan.
 */
export function ImageLightbox({ src, alt = "", open, onOpenChange }: Props) {
  const t = useTranslations("mediaLightbox");
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const scaleRef = useRef(MIN_SCALE);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const didDragRef = useRef(false);

  const resetView = useCallback(() => {
    scaleRef.current = MIN_SCALE;
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
  }, []);

  const bumpZoom = useCallback((delta: number) => {
    const next = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.round((scaleRef.current + delta) * 100) / 100),
    );
    scaleRef.current = next;
    setScale(next);
    if (next <= MIN_SCALE) {
      setOffset({ x: 0, y: 0 });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        bumpZoom(STEP);
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        bumpZoom(-STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        resetView();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, bumpZoom, resetView]);

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    bumpZoom(event.deltaY > 0 ? -STEP : STEP);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLImageElement>) {
    if (event.button !== 0) return;
    didDragRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    didDragRef.current = true;
    if (scale <= MIN_SCALE) return;
    setOffset({
      x: drag.originX + dx,
      y: drag.originY + dy,
    });
  }

  function endPointer(event: ReactPointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released
    }
  }

  const canPan = scale > MIN_SCALE;

  return (
    <Dialog
      open={open && Boolean(src)}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-[90] bg-ink/80 supports-backdrop-filter:backdrop-blur-md" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "fixed inset-0 z-[91] flex h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 text-white outline-none",
            "top-0 left-0 translate-x-0 translate-y-0",
            "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 sm:p-5">
            <div className="pointer-events-auto min-w-0 rounded-2xl border border-white/10 bg-ink/70 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
              <DialogTitle className="truncate text-sm font-semibold text-white">
                {t("title")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t("description")}
              </DialogDescription>
            </div>
            <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/10 bg-ink/70 p-1.5 shadow-lg backdrop-blur-md">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 cursor-pointer rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
                aria-label={t("zoomOut")}
                onClick={() => bumpZoom(-STEP)}
                disabled={scale <= MIN_SCALE}
              >
                <Minus className="size-4" aria-hidden />
              </Button>
              <button
                type="button"
                className="min-w-14 cursor-pointer rounded-lg px-1 text-center text-xs font-semibold tabular-nums text-white/75 hover:bg-white/10 hover:text-white"
                aria-label={t("resetZoom")}
                onClick={resetView}
              >
                {Math.round(scale * 100)}%
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 cursor-pointer rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
                aria-label={t("zoomIn")}
                onClick={() => bumpZoom(STEP)}
                disabled={scale >= MAX_SCALE}
              >
                <Plus className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 cursor-pointer rounded-xl text-white/85 hover:bg-white/10 hover:text-white"
                aria-label={t("close")}
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden px-3 py-20 sm:px-8 sm:py-24"
            onClick={() => {
              if (didDragRef.current) {
                didDragRef.current = false;
                return;
              }
              onOpenChange(false);
            }}
            onWheel={onWheel}
            role="presentation"
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt={alt}
                className={cn(
                  "max-h-[min(88dvh,920px)] max-w-[min(96vw,1200px)] select-none rounded-xl object-contain shadow-[0_28px_80px_-24px_rgba(0,0,0,0.65)] will-change-transform",
                  canPan
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-zoom-in",
                )}
                style={{
                  transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                  transition: dragging ? "none" : "transform 160ms ease-out",
                }}
                draggable={false}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (scale > MIN_SCALE) resetView();
                  else bumpZoom(1);
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              />
            ) : null}
          </div>

          <p className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3 sm:p-5">
            <span className="inline-flex max-w-[min(92vw,36rem)] items-center gap-1.5 rounded-full border border-white/10 bg-ink/70 px-3 py-1.5 text-center text-[11px] text-white/65 backdrop-blur-md">
              <ZoomIn className="size-3.5 shrink-0" aria-hidden />
              {t("hint")}
            </span>
          </p>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
