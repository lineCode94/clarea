"use client";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { TbX, TbZoomIn, TbZoomOut } from "react-icons/tb";
import type { Language } from "../../types/catalog";

type Props = { src: string; alt: string; lang: Language; imageTransform?: string };
function ZoomView({ src, alt, lang, close }: Props & { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(2);
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [size, setSize] = useState({ width: 300, height: 400 });
  const [failed, setFailed] = useState(false);
  const ar = lang === "ar";
  useEffect(() => {
    const el = dialog.current!;
    const previous = document.activeElement as HTMLElement;
    el.showModal();
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(stage.current!);
    return () => {
      observer.disconnect();
      el.close();
      previous?.focus();
    };
  }, []);
  const fit = Math.min(size.width / natural.width, size.height / natural.height);
  const width = Math.max(1, natural.width * fit * zoom);
  const height = Math.max(1, natural.height * fit * zoom);
  useEffect(() => {
    const el = stage.current;
    if (el) {
      el.scrollLeft = Math.max(0, (width - size.width) / 2);
      el.scrollTop = Math.max(0, (height - size.height) / 2);
    }
  }, [width, height, size.width, size.height]);
  return createPortal(
    <dialog
      ref={dialog}
      aria-label={ar ? "تكبير صورة المنتج" : "Product image zoom"}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        close();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-[#fffaf6] p-0 text-[#5C1A2B] backdrop:bg-black/80"
    >
      <div className="flex h-full flex-col">
        <header
          dir={ar ? "rtl" : "ltr"}
          className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8ddd5] px-4 py-3"
        >
          <p className="m-0 truncate text-sm font-semibold">{alt}</p>
          <button
            autoFocus
            onClick={close}
            aria-label={ar ? "إغلاق التكبير" : "Close zoom"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white shadow"
          >
            <TbX size={24} />
          </button>
        </header>
        <div
          ref={stage}
          dir="ltr"
          data-zoom-stage
          className="min-h-0 flex-1 overflow-auto overscroll-contain bg-white"
          style={{ touchAction: "pan-x pan-y pinch-zoom" }}
        >
          {failed ? (
            <p role="alert" className="p-6">
              {ar
                ? "تعذر تحميل الصورة. أغلقي التكبير وحاولي مجدداً."
                : "Image could not load. Close and try again."}
            </p>
          ) : (
            <div
              style={{
                width: Math.max(width, size.width),
                height: Math.max(height, size.height),
                display: "grid",
                placeItems: "center",
              }}
            >
              {/* Use the original asset, not the small card's optimized thumbnail. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                draggable={false}
                data-zoom-image
                onError={() => setFailed(true)}
                onLoad={(e) =>
                  setNatural({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  })
                }
                style={{ width, height, maxWidth: "none", maxHeight: "none", objectFit: "contain" }}
              />
            </div>
          )}
        </div>
        <footer className="shrink-0 border-t border-[#e8ddd5] bg-[#fffaf6] p-3 pb-[max(12px,env(safe-area-inset-bottom))] text-center">
          <div dir="ltr" className="flex items-center justify-center gap-3">
            <button
              disabled={zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              aria-label={ar ? "تصغير الصورة" : "Zoom out"}
              className="grid size-11 place-items-center rounded-full border disabled:opacity-30"
            >
              <TbZoomOut size={22} />
            </button>
            <output className="w-16 font-bold" aria-live="polite">
              {Math.round(zoom * 100)}%
            </output>
            <button
              disabled={zoom >= 4}
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              aria-label={ar ? "تكبير الصورة" : "Zoom in"}
              className="grid size-11 place-items-center rounded-full bg-[#5C1A2B] text-white disabled:opacity-30"
            >
              <TbZoomIn size={22} />
            </button>
            <button onClick={() => setZoom(1)} className="rounded-xl border px-3 py-2 text-sm">
              {ar ? "الصورة كاملة" : "Fit image"}
            </button>
          </div>
          <p className="mb-0 mt-2 text-xs">
            {ar
              ? "كبّري بأزرار + و −، ومرّري الصورة لرؤية التفاصيل"
              : "Use + and − to zoom. Scroll or swipe to explore."}
          </p>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
export default function MagnifierImage(props: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [bounds, setBounds] = useState({ width: 400, height: 400 });
  return (
    <>
      <button
        type="button"
        aria-label={props.lang === "ar" ? "فتح تكبير صورة المنتج" : "Open product image zoom"}
        onClick={() => {
          setHover(false);
          setOpen(true);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          setBounds({ width: r.width, height: r.height });
          setPosition({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
          });
          setHover(true);
        }}
        onPointerLeave={() => setHover(false)}
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-white"
      >
        <Image
          src={props.src}
          alt={props.alt}
          fill
          sizes="(max-width:768px) 95vw, 900px"
          className="object-contain"
          style={{
            transform: props.imageTransform,
            transformOrigin: `${position.x}% ${position.y}%`,
          }}
        />
        {hover && (
          <span
            aria-hidden="true"
            data-magnifier-lens
            className="pointer-events-none absolute z-20 block size-48 overflow-hidden rounded-full border-2 border-white bg-white shadow-2xl"
            style={{
              left:
                Math.max(96, Math.min(bounds.width - 96, (position.x * bounds.width) / 100)) - 96,
              top:
                Math.max(96, Math.min(bounds.height - 96, (position.y * bounds.height) / 100)) - 96,
            }}
          >
            <span
              className="absolute block"
              style={{
                width: bounds.width,
                height: bounds.height,
                left: 96 - ((position.x * bounds.width) / 100) * 3,
                top: 96 - ((position.y * bounds.height) / 100) * 3,
                transform: "scale(3)",
                transformOrigin: "0 0",
              }}
            >
              <Image
                src={props.src}
                alt=""
                fill
                unoptimized
                className="object-contain"
                style={{ transform: props.imageTransform }}
              />
            </span>
          </span>
        )}
        <span className="absolute bottom-3 end-3 flex items-center gap-2 rounded-full bg-[#5C1A2B] px-3 py-2 text-xs text-white">
          <TbZoomIn size={18} />
          {props.lang === "ar" ? "اضغطي للتكبير" : "Tap to zoom"}
        </span>
      </button>
      {open && <ZoomView {...props} close={() => setOpen(false)} />}
    </>
  );
}
